import React, { useEffect, useMemo, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Typography, CircularProgress,
    Alert, Grid, Divider, Box, alpha,
} from '@mui/material';
import {
    ClassOutlined as ClassIcon,
    EuroSymbol as EuroIcon,
    CalendarMonth as DateIcon,
    InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useOrcamentoStore } from '../store/orcamentoStore';

const MODULE_COLOR = '#059669';

const SectionLabel = ({ icon: Icon, label }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, mt: 0.5 }}>
        <Icon sx={{ fontSize: 18, color: MODULE_COLOR }} />
        <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.7} color={MODULE_COLOR}>
            {label}
        </Typography>
    </Box>
);

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

    const anoW       = watch('ano');
    const classeW    = watch('classe');
    const subclasseW = watch('ts_orcamento_subclasse');
    const dataIniW   = watch('data_inicio');
    const dataFimW   = watch('data_fim');

    /* ── Reset ao abrir ─────────────────────────────────────── */
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
            reset({ ano: currentYear, classe: '', ts_orcamento_subclasse: '', valor: '', data_inicio: '', data_fim: '' });
        }
    }, [modalOpen]);

    useEffect(() => { if (!isEdit) { setValue('classe', ''); setValue('ts_orcamento_subclasse', ''); } }, [anoW, isEdit]);
    useEffect(() => { if (!isEdit) setValue('ts_orcamento_subclasse', ''); }, [classeW, isEdit]);

    /* ── Disponibilidade de subclasses ──────────────────────── */
    const subclassesDisponiveis = useMemo(() => {
        if (isEdit || !anoW) return subclasses;
        const a = parseInt(anoW, 10);
        return subclasses.filter(s => {
            const ex = registos.filter(r => r.ano === a && r.ts_orcamento_subclasse === s.pk);
            return ex.length === 0 || ex.every(r => r.data_inicio && r.data_fim);
        });
    }, [subclasses, registos, anoW, isEdit]);

    const classesDisponiveis = useMemo(
        () => [...new Set(subclassesDisponiveis.map(s => s.classe))].sort(),
        [subclassesDisponiveis],
    );

    const subclassesFiltradas = useMemo(
        () => subclassesDisponiveis.filter(s => s.classe === classeW),
        [subclassesDisponiveis, classeW],
    );

    /* ── Datas obrigatórias ──────────────────────────────────── */
    const jaExiste = useMemo(() => {
        if (isEdit || !anoW || !subclasseW) return false;
        const a = parseInt(anoW, 10), s = parseInt(subclasseW, 10);
        return registos.some(r => r.ano === a && r.ts_orcamento_subclasse === s);
    }, [isEdit, anoW, subclasseW, registos]);

    const temIrmaos = useMemo(() => {
        if (!isEdit || !editTarget) return false;
        return registos.some(r => r.ano === editTarget.ano && r.ts_orcamento_subclasse === editTarget.ts_orcamento_subclasse && r.pk !== editTarget.pk);
    }, [isEdit, editTarget, registos]);

    const datasObrigatorias = jaExiste || temIrmaos;

    /* ── Sobreposição de datas ───────────────────────────────── */
    const sobreposicao = useMemo(() => {
        if (!dataIniW || !dataFimW) return null;
        const ini = new Date(dataIniW), fim = new Date(dataFimW);
        if (fim < ini) return 'A data de fim não pode ser anterior à data de início.';
        const a = parseInt(anoW, 10), s = parseInt(subclasseW, 10), pkAtual = isEdit ? editTarget?.pk : null;
        const c = registos.find(r => {
            if (!r.data_inicio || !r.data_fim || r.ano !== a || r.ts_orcamento_subclasse !== s) return false;
            if (pkAtual && r.pk === pkAtual) return false;
            return ini <= new Date(r.data_fim) && fim >= new Date(r.data_inicio);
        });
        if (c) {
            const f = (s) => { const [y,m,d] = String(s).split('-'); return `${d}/${m}/${y}`; };
            return `Intervalo sobrepõe-se com registo existente (${f(c.data_inicio)} → ${f(c.data_fim)}).`;
        }
        return null;
    }, [dataIniW, dataFimW, anoW, subclasseW, registos, isEdit, editTarget]);

    /* ── Submit ─────────────────────────────────────────────── */
    const onSubmit = async (v) => {
        setApiError('');
        try {
            if (isEdit) {
                await updateRegisto(editTarget.pk, {
                    valor:       parseFloat(v.valor),
                    data_inicio: v.data_inicio || null,
                    data_fim:    v.data_fim    || null,
                });
            } else {
                await addRegisto({
                    ano:                    parseInt(v.ano, 10),
                    ts_orcamento_subclasse: parseInt(v.ts_orcamento_subclasse, 10),
                    valor:                  parseFloat(v.valor),
                    data_inicio:            v.data_inicio || null,
                    data_fim:               v.data_fim    || null,
                });
            }
        } catch (err) {
            setApiError(err?.response?.data?.error || err?.response?.data?.erro || err?.message || 'Erro ao guardar.');
        }
    };

    const canSubmit = !isSubmitting && !sobreposicao && (isEdit || !!subclasseW || classesDisponiveis.length === 0);

    return (
        <Dialog
            open={modalOpen}
            onClose={closeModal}
            maxWidth="sm"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, borderTop: `4px solid ${MODULE_COLOR}` } } }}
        >
            <DialogTitle sx={{ pb: 0.5 }}>
                <Typography variant="h6" fontWeight={700}>
                    {isEdit ? 'Editar Dotação' : 'Nova Dotação'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {isEdit
                        ? `A editar: ${editTarget?.subclasse ?? ''} — ${editTarget?.ano ?? ''}`
                        : 'Preencha os dados da nova dotação orçamental.'
                    }
                </Typography>
            </DialogTitle>

            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ pt: 2 }}>
                    {apiError    && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
                    {sobreposicao && <Alert severity="error" sx={{ mb: 2 }}>{sobreposicao}</Alert>}
                    {(jaExiste || temIrmaos) && (
                        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
                            {jaExiste
                                ? 'Já existe um registo para esta subclasse/ano — as datas são obrigatórias.'
                                : 'Este registo partilha subclasse/ano com outros — as datas são obrigatórias.'
                            }
                        </Alert>
                    )}

                    {/* Classificação */}
                    <SectionLabel icon={ClassIcon} label="Classificação" />
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Controller
                                name="ano"
                                control={control}
                                rules={{ required: 'Obrigatório' }}
                                render={({ field }) => (
                                    <TextField {...field} select label="Ano" disabled={isEdit}
                                        error={Boolean(errors.ano)} helperText={errors.ano?.message} fullWidth size="small">
                                        {anos.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                                    </TextField>
                                )}
                            />
                        </Grid>

                        {!isEdit && anoW && (
                            classesDisponiveis.length === 0 ? (
                                <Grid size={{ xs: 12 }}>
                                    <Alert severity="success" sx={{ py: 0.5 }}>
                                        Todas as subclasses já têm dotação registada para {anoW} sem períodos disponíveis.
                                    </Alert>
                                </Grid>
                            ) : (
                                <>
                                    <Grid size={{ xs: 12, sm: 8 }}>
                                        <Controller
                                            name="classe"
                                            control={control}
                                            rules={{ required: 'Obrigatório' }}
                                            render={({ field }) => (
                                                <TextField {...field} select label="Classe"
                                                    error={Boolean(errors.classe)} helperText={errors.classe?.message} fullWidth size="small">
                                                    {classesDisponiveis.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                                </TextField>
                                            )}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <Controller
                                            name="ts_orcamento_subclasse"
                                            control={control}
                                            rules={{ required: 'Obrigatório' }}
                                            render={({ field }) => (
                                                <TextField {...field} select label="Subclasse" disabled={!classeW}
                                                    error={Boolean(errors.ts_orcamento_subclasse)}
                                                    helperText={errors.ts_orcamento_subclasse?.message || (!classeW ? 'Seleciona primeiro uma classe' : '')}
                                                    fullWidth size="small">
                                                    {subclassesFiltradas.map(s => (
                                                        <MenuItem key={s.pk} value={s.pk}>
                                                            {s.designacao}
                                                            {s.tipo && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>({s.tipo})</Typography>}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            )}
                                        />
                                    </Grid>
                                </>
                            )
                        )}

                        {isEdit && (
                            <Grid size={{ xs: 12, sm: 8 }}>
                                <TextField
                                    label="Subclasse"
                                    value={editTarget?.subclasse ?? ''}
                                    disabled
                                    fullWidth
                                    size="small"
                                />
                            </Grid>
                        )}
                    </Grid>

                    {/* Valor */}
                    {(isEdit || (anoW && subclasseW)) && (
                        <>
                            <Divider sx={{ mb: 2 }} />
                            <SectionLabel icon={EuroIcon} label="Dotação" />
                            <Controller
                                name="valor"
                                control={control}
                                rules={{ required: 'Obrigatório', min: { value: 0, message: 'Valor deve ser positivo' } }}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Valor (€)"
                                        type="number"
                                        inputProps={{ step: '0.01', min: 0 }}
                                        error={Boolean(errors.valor)}
                                        helperText={errors.valor?.message}
                                        fullWidth
                                        size="small"
                                        sx={{ mb: 2 }}
                                    />
                                )}
                            />

                            <Divider sx={{ mb: 2 }} />
                            <SectionLabel icon={DateIcon} label={datasObrigatorias ? 'Período (obrigatório)' : 'Período (opcional)'} />
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Controller
                                        name="data_inicio"
                                        control={control}
                                        rules={{
                                            required: datasObrigatorias
                                                ? 'Obrigatório'
                                                : dataFimW ? 'Obrigatório com data de fim' : false,
                                        }}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label={datasObrigatorias || dataFimW ? 'Data Início *' : 'Data Início'}
                                                type="date"
                                                InputLabelProps={{ shrink: true }}
                                                error={Boolean(errors.data_inicio)}
                                                helperText={errors.data_inicio?.message}
                                                fullWidth size="small"
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Controller
                                        name="data_fim"
                                        control={control}
                                        rules={{
                                            required: datasObrigatorias
                                                ? 'Obrigatório'
                                                : dataIniW ? 'Obrigatório com data de início' : false,
                                        }}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label={datasObrigatorias || dataIniW ? 'Data Fim *' : 'Data Fim'}
                                                type="date"
                                                InputLabelProps={{ shrink: true }}
                                                error={Boolean(errors.data_fim)}
                                                helperText={errors.data_fim?.message}
                                                fullWidth size="small"
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={closeModal} color="inherit" disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!canSubmit}
                        startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
                        sx={{ bgcolor: MODULE_COLOR, '&:hover': { bgcolor: '#047857' }, minWidth: 100 }}
                    >
                        {isEdit ? 'Guardar' : 'Criar Dotação'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
