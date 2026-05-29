import React, { useEffect, useMemo, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Typography, CircularProgress,
    Alert, Grid, Divider, Box, IconButton,
    useTheme, useMediaQuery,
} from '@mui/material';
import {
    ClassOutlined as ClassIcon,
    EuroSymbol as EuroIcon,
    Close as CloseIcon,
    NotesOutlined as NotesIcon,
    LabelOutlined as NameIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOrcamentoStore } from '../store/orcamentoStore';
import {
    useOrcamentoAnos,
    useOrcamentoSubclasses,
    ORCAMENTO_KEYS,
} from '../hooks/useOrcamentoQueries';

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
const ANO_MIN = 2023;
const anosDisponiveis = Array.from(
    { length: currentYear - ANO_MIN + 1 },
    (_, i) => currentYear - i,
);

export const OrcamentoForm = () => {
    const theme    = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const {
        modalOpen, editTarget, closeModal,
        addRegisto, updateRegisto,
        anoSelecionado,
    } = useOrcamentoStore();

    const { data: anos       = [] } = useOrcamentoAnos();
    const { data: subclasses = [] } = useOrcamentoSubclasses();

    const [apiError, setApiError] = useState('');
    const isEdit = Boolean(editTarget);
    const qc = useQueryClient();

    useOrcamentoAnos();
    useOrcamentoSubclasses();

    const {
        control, handleSubmit, watch, reset, setValue,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: {
            ano:                    currentYear,
            classe:                 '',
            ts_orcamento_subclasse: '',
            name:                   '',
            valor:                  '',
            memo:                   '',
        },
    });

    const anoW    = watch('ano');
    const classeW = watch('classe');
    const subclasseW = watch('ts_orcamento_subclasse');

    /* ── Reset ao abrir ────────────────────────────────────────── */
    useEffect(() => {
        if (!modalOpen) return;
        setApiError('');
        if (isEdit) {
            reset({
                ano:   editTarget.ano ?? currentYear,
                name:  editTarget.name ?? '',
                valor: editTarget.valor ?? '',
                memo:  editTarget.memo ?? '',
            });
        } else {
            reset({ ano: currentYear, classe: '', ts_orcamento_subclasse: '', name: '', valor: '', memo: '' });
        }
    }, [modalOpen]);

    useEffect(() => { if (!isEdit) { setValue('classe', ''); setValue('ts_orcamento_subclasse', ''); } }, [anoW, isEdit]);
    useEffect(() => { if (!isEdit) setValue('ts_orcamento_subclasse', ''); }, [classeW, isEdit]);

    const subclassesDisponiveis = subclasses;

    const classesDisponiveis = useMemo(
        () => [...new Set(subclassesDisponiveis.map(s => s.classe))].filter(Boolean).sort(),
        [subclassesDisponiveis],
    );

    const subclassesFiltradas = useMemo(
        () => subclassesDisponiveis.filter(s => s.classe === classeW),
        [subclassesDisponiveis, classeW],
    );

    /* ── Submit ─────────────────────────────────────────────────── */
    const onSubmit = async (v) => {
        setApiError('');
        try {
            const ano = anoSelecionado ?? parseInt(v.ano, 10);
            if (isEdit) {
                await updateRegisto(editTarget.pk, {
                    name:  v.name?.trim() || null,
                    valor: parseFloat(v.valor),
                    memo:  v.memo?.trim() || null,
                });
                toast.success('Dotação actualizada com sucesso.');
            } else {
                await addRegisto({
                    ano:                    parseInt(v.ano, 10),
                    ts_orcamento_subclasse: parseInt(v.ts_orcamento_subclasse, 10),
                    name:                   v.name?.trim() || null,
                    valor:                  parseFloat(v.valor),
                    memo:                   v.memo?.trim() || null,
                });
                toast.success('Dotação criada com sucesso.');
            }
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.detalhe(ano) });
            qc.invalidateQueries({ queryKey: ORCAMENTO_KEYS.sncapSummary(ano) });
            closeModal();
        } catch (err) {
            setApiError(
                err?.response?.data?.error
                || err?.message
                || 'Erro ao guardar.'
            );
        }
    };

    const canSubmit = !isSubmitting && (isEdit || !!subclasseW);

    return (
        <Dialog
            open={modalOpen}
            onClose={closeModal}
            maxWidth="sm"
            fullWidth
            fullScreen={isMobile}
            slotProps={{
                paper: {
                    sx: isMobile ? {} : { borderRadius: 3, borderTop: `4px solid ${MODULE_COLOR}` },
                },
            }}
        >
            <DialogTitle sx={{
                pb: 0.5,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
            }}>
                <Box>
                    <Typography variant="h6" fontWeight={700}>
                        {isEdit ? 'Editar Dotação' : 'Nova Dotação'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {isEdit
                            ? `A editar: ${editTarget?.subclasse ?? ''} — ${editTarget?.ano ?? ''}`
                            : 'Preencha os dados da nova dotação orçamental.'
                        }
                    </Typography>
                </Box>
                {isMobile && (
                    <IconButton onClick={closeModal} size="small" sx={{ ml: 1, mt: -0.5 }}>
                        <CloseIcon />
                    </IconButton>
                )}
            </DialogTitle>

            <form onSubmit={handleSubmit(onSubmit)}
                style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <DialogContent sx={{ pt: 2, overflowY: 'auto' }}>
                    {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

                    <SectionLabel icon={ClassIcon} label="Classificação" />
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Controller name="ano" control={control}
                                rules={{ required: 'Obrigatório' }}
                                render={({ field }) => (
                                    <TextField {...field} select label="Ano"
                                        disabled={isEdit}
                                        error={Boolean(errors.ano)}
                                        helperText={errors.ano?.message}
                                        fullWidth size="small">
                                        {anos.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                                    </TextField>
                                )}
                            />
                        </Grid>

                        {!isEdit && anoW && (
                            <>
                                <Grid size={{ xs: 12, sm: 8 }}>
                                    <Controller
                                        name="classe"
                                        control={control}
                                        rules={{ required: 'Obrigatório' }}
                                        render={({ field }) => (
                                            <TextField {...field} select label="Classe"
                                                error={Boolean(errors.classe)}
                                                helperText={errors.classe?.message}
                                                fullWidth size="small">
                                                {classesDisponiveis.map(c => (
                                                    <MenuItem key={c} value={c}>{c}</MenuItem>
                                                ))}
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
                                                <TextField {...field} select label="Subclasse"
                                                    disabled={!classeW}
                                                    error={Boolean(errors.ts_orcamento_subclasse)}
                                                    helperText={
                                                        errors.ts_orcamento_subclasse?.message ||
                                                        (!classeW ? 'Seleciona primeiro uma classe' : '')
                                                    }
                                                    fullWidth size="small">
                                                    {subclassesFiltradas.map(s => (
                                                        <MenuItem key={s.pk} value={s.pk}>
                                                            {s.designacao}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            )}
                                        />
                                    </Grid>
                            </>
                        )}

                        {isEdit && (
                            <Grid size={{ xs: 12, sm: 8 }}>
                                <TextField
                                    label="Subclasse"
                                    value={editTarget?.subclasse ?? ''}
                                    disabled fullWidth size="small"
                                />
                            </Grid>
                        )}
                    </Grid>

                    {(isEdit || (anoW && subclasseW)) && (
                        <>
                            <Divider sx={{ mb: 2 }} />
                            <SectionLabel icon={EuroIcon} label="Dotação" />
                            <Controller
                                name="valor"
                                control={control}
                                rules={{ required: 'Obrigatório', min: { value: 0, message: 'Valor deve ser positivo' } }}
                                render={({ field }) => (
                                    <TextField {...field} label="Valor (€) *"
                                        type="number"
                                        inputProps={{ step: '0.01', min: 0 }}
                                        error={Boolean(errors.valor)}
                                        helperText={errors.valor?.message}
                                        fullWidth size="small" sx={{ mb: 2 }} />
                                )}
                            />

                            <Divider sx={{ mb: 2 }} />
                            <SectionLabel icon={NameIcon} label="Identificação" />
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="Nome / Referência"
                                        placeholder="Identificação curta desta dotação (opcional)"
                                        fullWidth size="small" sx={{ mb: 2 }} />
                                )}
                            />
                            <Controller
                                name="memo"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="Observações"
                                        multiline rows={2}
                                        placeholder="Notas ou observações adicionais (opcional)"
                                        fullWidth size="small" />
                                )}
                            />
                        </>
                    )}
                </DialogContent>

                <DialogActions sx={{
                    px: 3, pb: isMobile ? 3 : 2.5, gap: 1, flexShrink: 0,
                }}>
                    <Button onClick={closeModal} color="inherit" disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!canSubmit}
                        startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
                        sx={{ bgcolor: MODULE_COLOR, '&:hover': { bgcolor: '#047857' }, minWidth: 120 }}
                    >
                        {isEdit ? 'Guardar' : 'Criar Dotação'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
