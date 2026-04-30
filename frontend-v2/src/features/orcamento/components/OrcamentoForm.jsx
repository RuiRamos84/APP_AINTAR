import React, { useEffect, useMemo, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Stack, Typography,
    CircularProgress, Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useOrcamentoStore } from '../store/orcamentoStore';

const currentYear = new Date().getFullYear();

export const OrcamentoForm = () => {
    const {
        modalOpen, editTarget, closeModal,
        addRegisto, updateRegisto,
        subclasses, anos, registos,
    } = useOrcamentoStore();

    const [apiError, setApiError] = useState('');
    const isEdit = Boolean(editTarget);

    const { control, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            ano: currentYear,
            classe: '',
            ts_orcamento_subclasse: '',
            valor: '',
            data_inicio: '',
            data_fim: '',
        },
    });

    const anoWatch       = watch('ano');
    const classeWatch    = watch('classe');
    const subclasseWatch = watch('ts_orcamento_subclasse');

    /* ── Reset ao abrir ──────────────────────────────────────────── */
    useEffect(() => {
        if (!modalOpen) return;
        setApiError('');

        if (isEdit) {
            const sub = subclasses.find(s => s.pk === editTarget.ts_orcamento_subclasse);
            reset({
                ano:                    editTarget.ano ?? currentYear,
                classe:                 sub?.classe ?? '',
                ts_orcamento_subclasse: editTarget.ts_orcamento_subclasse ?? '',
                valor:                  editTarget.valor ?? '',
                data_inicio:            editTarget.data_inicio ?? '',
                data_fim:               editTarget.data_fim ?? '',
            });
        } else {
            reset({
                ano: currentYear,
                classe: '',
                ts_orcamento_subclasse: '',
                valor: '',
                data_inicio: '',
                data_fim: '',
            });
        }
    }, [modalOpen]);

    /* ── Reset classe/subclasse quando o ano muda (apenas criação) ── */
    useEffect(() => {
        if (isEdit) return;
        setValue('classe', '');
        setValue('ts_orcamento_subclasse', '');
    }, [anoWatch, isEdit]);

    /* ── Reset subclasse quando a classe muda ───────────────────── */
    useEffect(() => {
        if (isEdit) return;
        setValue('ts_orcamento_subclasse', '');
    }, [classeWatch, isEdit]);

    /* ── Subclasses disponíveis para o ano selecionado ─────────────
       Disponível = sem registo para esse ano
               OU  todos os registos existentes têm data_inicio + data_fim
    ──────────────────────────────────────────────────────────────── */
    const subclassesDisponiveis = useMemo(() => {
        if (isEdit || !anoWatch) return subclasses;
        const anoInt = parseInt(anoWatch, 10);

        return subclasses.filter(s => {
            const existentes = registos.filter(
                r => r.ano === anoInt && r.ts_orcamento_subclasse === s.pk
            );
            if (existentes.length === 0) return true;
            return existentes.every(r => r.data_inicio && r.data_fim);
        });
    }, [subclasses, registos, anoWatch, isEdit]);

    const classesDisponiveis = useMemo(
        () => [...new Set(subclassesDisponiveis.map(s => s.classe))].sort(),
        [subclassesDisponiveis]
    );

    const subclassesFiltradas = useMemo(
        () => subclassesDisponiveis.filter(s => s.classe === classeWatch),
        [subclassesDisponiveis, classeWatch]
    );

    /* ── Datas obrigatórias? ────────────────────────────────────── */
    const jaExiste = useMemo(() => {
        if (isEdit || !anoWatch || !subclasseWatch) return false;
        const anoInt = parseInt(anoWatch, 10);
        const subInt = parseInt(subclasseWatch, 10);
        return registos.some(r => r.ano === anoInt && r.ts_orcamento_subclasse === subInt);
    }, [isEdit, anoWatch, subclasseWatch, registos]);

    const temIrmaos = useMemo(() => {
        if (!isEdit || !editTarget) return false;
        return registos.some(
            r => r.ano === editTarget.ano &&
                 r.ts_orcamento_subclasse === editTarget.ts_orcamento_subclasse &&
                 r.pk !== editTarget.pk
        );
    }, [isEdit, editTarget, registos]);

    const datasObrigatorias = jaExiste || temIrmaos;

    /* ── Verificação de sobreposição em tempo real ──────────────── */
    const dataInicioWatch = watch('data_inicio');
    const dataFimWatch    = watch('data_fim');

    const fmtDate = (s) => {
        if (!s) return s;
        const [y, m, d] = String(s).split('-');
        return `${d}/${m}/${y}`;
    };

    const sobreposicao = useMemo(() => {
        if (!dataInicioWatch || !dataFimWatch) return null;

        const novoInicio = new Date(dataInicioWatch);
        const novoFim    = new Date(dataFimWatch);

        if (novoFim < novoInicio) return 'A data de fim não pode ser anterior à data de início.';

        const anoInt = parseInt(anoWatch, 10);
        const subInt = parseInt(subclasseWatch, 10);
        const pkAtual = isEdit ? editTarget?.pk : null;

        const conflito = registos.find(r => {
            if (!r.data_inicio || !r.data_fim) return false;
            if (r.ano !== anoInt || r.ts_orcamento_subclasse !== subInt) return false;
            if (pkAtual && r.pk === pkAtual) return false;
            const rInicio = new Date(r.data_inicio);
            const rFim    = new Date(r.data_fim);
            return novoInicio <= rFim && novoFim >= rInicio;
        });

        if (conflito) {
            return `Intervalo sobrepõe-se com um registo existente (${fmtDate(conflito.data_inicio)} → ${fmtDate(conflito.data_fim)}).`;
        }
        return null;
    }, [dataInicioWatch, dataFimWatch, anoWatch, subclasseWatch, registos, isEdit, editTarget]);

    /* ── Submissão ──────────────────────────────────────────────── */
    const onSubmit = async (values) => {
        setApiError('');
        try {
            if (isEdit) {
                await updateRegisto(editTarget.pk, {
                    valor:       parseFloat(values.valor),
                    data_inicio: values.data_inicio || null,
                    data_fim:    values.data_fim    || null,
                });
            } else {
                await addRegisto({
                    ano:                    parseInt(values.ano, 10),
                    ts_orcamento_subclasse: parseInt(values.ts_orcamento_subclasse, 10),
                    valor:                  parseFloat(values.valor),
                    data_inicio:            values.data_inicio || null,
                    data_fim:               values.data_fim    || null,
                });
            }
        } catch (err) {
            setApiError(
                err?.response?.data?.error ||
                err?.response?.data?.erro  ||
                err?.message              ||
                'Erro ao guardar.'
            );
        }
    };

    /* ── Render ─────────────────────────────────────────────────── */
    const anoSelecionado = Boolean(anoWatch);

    return (
        <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth>
            <DialogTitle>
                {isEdit ? 'Editar Registo de Orçamento' : 'Novo Registo de Orçamento'}
            </DialogTitle>

            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>

                        {apiError    && <Alert severity="error">{apiError}</Alert>}
                        {sobreposicao && <Alert severity="error">{sobreposicao}</Alert>}

                        {jaExiste && (
                            <Alert severity="info">
                                Já existe um registo para esta subclasse e ano. As datas são <strong>obrigatórias</strong>.
                            </Alert>
                        )}
                        {temIrmaos && (
                            <Alert severity="warning">
                                Este registo partilha a subclasse e ano com outros. As datas são <strong>obrigatórias</strong>.
                            </Alert>
                        )}

                        {/* ── Ano ── */}
                        <Controller
                            name="ano"
                            control={control}
                            rules={{ required: 'Obrigatório' }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    label="Ano"
                                    disabled={isEdit}
                                    error={Boolean(errors.ano)}
                                    helperText={errors.ano?.message}
                                    fullWidth
                                >
                                    {anos.map(a => (
                                        <MenuItem key={a} value={a}>{a}</MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />

                        {/* ── Campos que só aparecem após selecionar o ano (criação) ── */}
                        {!isEdit && anoSelecionado && (
                            <>
                                {classesDisponiveis.length === 0 ? (
                                    <Alert severity="success">
                                        Todas as subclasses já têm orçamento registado para {anoWatch} sem datas disponíveis para adicionar.
                                    </Alert>
                                ) : (
                                    <>
                                        {/* Classe */}
                                        <Controller
                                            name="classe"
                                            control={control}
                                            rules={{ required: 'Obrigatório' }}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    select
                                                    label="Classe"
                                                    error={Boolean(errors.classe)}
                                                    helperText={errors.classe?.message}
                                                    fullWidth
                                                >
                                                    {classesDisponiveis.map(c => (
                                                        <MenuItem key={c} value={c}>{c}</MenuItem>
                                                    ))}
                                                </TextField>
                                            )}
                                        />

                                        {/* Subclasse */}
                                        <Controller
                                            name="ts_orcamento_subclasse"
                                            control={control}
                                            rules={{ required: 'Obrigatório' }}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    select
                                                    label="Subclasse"
                                                    disabled={!classeWatch}
                                                    error={Boolean(errors.ts_orcamento_subclasse)}
                                                    helperText={
                                                        errors.ts_orcamento_subclasse?.message ||
                                                        (!classeWatch ? 'Seleciona primeiro uma classe' : '')
                                                    }
                                                    fullWidth
                                                >
                                                    {subclassesFiltradas.map(s => (
                                                        <MenuItem key={s.pk} value={s.pk}>
                                                            {s.designacao}
                                                            {s.tipo && (
                                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                                    ({s.tipo})
                                                                </Typography>
                                                            )}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            )}
                                        />
                                    </>
                                )}
                            </>
                        )}

                        {/* ── Campos de valor e datas (criação: só após subclasse; edição: sempre) ── */}
                        {(isEdit || (anoSelecionado && subclasseWatch)) && (
                            <>
                                {/* Valor */}
                                <Controller
                                    name="valor"
                                    control={control}
                                    rules={{
                                        required: 'Obrigatório',
                                        min: { value: 0, message: 'Valor deve ser positivo' },
                                    }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Valor (€)"
                                            type="number"
                                            inputProps={{ step: '0.01', min: 0 }}
                                            error={Boolean(errors.valor)}
                                            helperText={errors.valor?.message}
                                            fullWidth
                                        />
                                    )}
                                />

                                {/* Data Início */}
                                <Controller
                                    name="data_inicio"
                                    control={control}
                                    rules={{
                                        required: datasObrigatorias
                                            ? 'Obrigatório quando existem múltiplos registos'
                                            : dataFimWatch
                                                ? 'Obrigatório quando data de fim está preenchida'
                                                : false,
                                    }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label={(datasObrigatorias || dataFimWatch) ? 'Data Início *' : 'Data Início (opcional)'}
                                            type="date"
                                            InputLabelProps={{ shrink: true }}
                                            error={Boolean(errors.data_inicio)}
                                            helperText={errors.data_inicio?.message}
                                            fullWidth
                                        />
                                    )}
                                />

                                {/* Data Fim */}
                                <Controller
                                    name="data_fim"
                                    control={control}
                                    rules={{
                                        required: datasObrigatorias
                                            ? 'Obrigatório quando existem múltiplos registos'
                                            : dataInicioWatch
                                                ? 'Obrigatório quando data de início está preenchida'
                                                : false,
                                    }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label={(datasObrigatorias || dataInicioWatch) ? 'Data Fim *' : 'Data Fim (opcional)'}
                                            type="date"
                                            InputLabelProps={{ shrink: true }}
                                            error={Boolean(errors.data_fim)}
                                            helperText={errors.data_fim?.message}
                                            fullWidth
                                        />
                                    )}
                                />
                            </>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={closeModal} color="inherit" disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting || Boolean(sobreposicao) || (!isEdit && !subclasseWatch && classesDisponiveis.length > 0)}
                        startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
                    >
                        {isEdit ? 'Guardar' : 'Criar'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
