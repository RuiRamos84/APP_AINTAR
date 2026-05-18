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
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { useOrcamentoStore } from '../store/orcamentoStore';

const MODULE_COLOR = '#059669';

const SectionLabel = ({ icon: Icon, label }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, mt: 0.5 }}>
        <Icon sx={{ fontSize: 18, color: MODULE_COLOR }} />
        <Typography variant="caption" fontWeight={700} textTransform="uppercase"
            letterSpacing={0.7} color={MODULE_COLOR}>
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
        subclasses, anos,
    } = useOrcamentoStore();

    const [apiError, setApiError] = useState('');
    const isEdit = Boolean(editTarget);

    const { control, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            ano:          currentYear,
            classe:       '',
            subclasse_pk: '',
            name:         '',
            valor:        '',
            memo:         '',
        },
    });

    const anoW      = watch('ano');
    const classeW   = watch('classe');

    /* ── Reset ao abrir ─────────────────────────────────────── */
    useEffect(() => {
        if (!modalOpen) return;
        setApiError('');
        if (isEdit) {
            const sub = subclasses.find(s => s.pk === editTarget.subclasse_pk
                || (s.name === editTarget.subclasse));
            reset({
                ano:          editTarget.ano ?? currentYear,
                classe:       editTarget.classe ?? '',
                subclasse_pk: editTarget.subclasse_pk ?? sub?.pk ?? '',
                name:         editTarget.name ?? '',
                valor:        editTarget.valor ?? '',
                memo:         editTarget.memo ?? '',
            });
        } else {
            reset({ ano: currentYear, classe: '', subclasse_pk: '', name: '', valor: '', memo: '' });
        }
    }, [modalOpen]);

    useEffect(() => { if (!isEdit) setValue('subclasse_pk', ''); }, [classeW, isEdit]);

    /* ── Subclasses filtradas por classe ────────────────────── */
    const classesDisponiveis = useMemo(
        () => [...new Set(subclasses.map(s => s.classe))].filter(Boolean).sort(),
        [subclasses],
    );

    const subclassesFiltradas = useMemo(
        () => classeW ? subclasses.filter(s => s.classe === classeW) : subclasses,
        [subclasses, classeW],
    );

    /* ── Submit ─────────────────────────────────────────────── */
    const onSubmit = async (v) => {
        setApiError('');
        try {
            const payload = {
                ano:          parseInt(v.ano, 10),
                subclasse_pk: parseInt(v.subclasse_pk, 10),
                name:         v.name.trim() || null,
                valor:        parseFloat(v.valor),
                memo:         v.memo.trim() || null,
            };
            if (isEdit) {
                await updateRegisto(editTarget.pk, payload);
                toast.success('Dotação actualizada com sucesso.');
            } else {
                await addRegisto(payload);
                toast.success('Dotação criada com sucesso.');
            }
        } catch (err) {
            setApiError(err?.response?.data?.error || err?.response?.data?.erro || err?.message || 'Erro ao guardar.');
        }
    };

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
            <DialogTitle sx={{ pb: 0.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <DialogContent sx={{ pt: 2, overflowY: 'auto' }}>
                    {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

                    {/* Classificação */}
                    <SectionLabel icon={ClassIcon} label="Classificação" />
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Controller
                                name="ano"
                                control={control}
                                rules={{ required: 'Obrigatório' }}
                                render={({ field }) => (
                                    <TextField {...field} select label="Ano"
                                        disabled={isEdit}
                                        error={Boolean(errors.ano)}
                                        helperText={errors.ano?.message}
                                        fullWidth size="small">
                                        {anosDisponiveis.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                                    </TextField>
                                )}
                            />
                        </Grid>

                        {!isEdit && (
                            <Grid size={{ xs: 12, sm: 8 }}>
                                <Controller
                                    name="classe"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} select label="Classe (filtro)"
                                            fullWidth size="small">
                                            <MenuItem value="">Todas as classes</MenuItem>
                                            {classesDisponiveis.map(c => (
                                                <MenuItem key={c} value={c}>{c}</MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                />
                            </Grid>
                        )}

                        {isEdit ? (
                            <Grid size={{ xs: 12, sm: 8 }}>
                                <TextField
                                    label="Subclasse"
                                    value={editTarget?.subclasse ?? ''}
                                    disabled fullWidth size="small"
                                />
                            </Grid>
                        ) : (
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="subclasse_pk"
                                    control={control}
                                    rules={{ required: 'Obrigatório' }}
                                    render={({ field }) => (
                                        <TextField {...field} select label="Subclasse *"
                                            error={Boolean(errors.subclasse_pk)}
                                            helperText={errors.subclasse_pk?.message}
                                            fullWidth size="small">
                                            {subclassesFiltradas.map(s => (
                                                <MenuItem key={s.pk} value={s.pk}>
                                                    {s.name}
                                                    {s.sncap && (
                                                        <Typography component="span" variant="caption"
                                                            color="text.secondary" sx={{ ml: 1 }}>
                                                            ({s.sncap})
                                                        </Typography>
                                                    )}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                />
                            </Grid>
                        )}
                    </Grid>

                    {/* Dotação */}
                    <Divider sx={{ mb: 2 }} />
                    <SectionLabel icon={EuroIcon} label="Dotação" />
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="Nome"
                                        placeholder="Opcional"
                                        fullWidth size="small" />
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Controller
                                name="valor"
                                control={control}
                                rules={{
                                    required: 'Obrigatório',
                                    min: { value: 0, message: 'Valor deve ser positivo' },
                                }}
                                render={({ field }) => (
                                    <TextField {...field} label="Valor (€) *"
                                        type="number"
                                        inputProps={{ step: '0.01', min: 0 }}
                                        error={Boolean(errors.valor)}
                                        helperText={errors.valor?.message}
                                        fullWidth size="small" />
                                )}
                            />
                        </Grid>
                    </Grid>

                    {/* Nota */}
                    <Divider sx={{ mb: 2 }} />
                    <SectionLabel icon={NotesIcon} label="Descrição" />
                    <Controller
                        name="memo"
                        control={control}
                        render={({ field }) => (
                            <TextField {...field} label="Descrição"
                                placeholder="Opcional"
                                multiline rows={3}
                                fullWidth size="small" />
                        )}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: isMobile ? 3 : 2.5, gap: 1, flexShrink: 0 }}>
                    <Button onClick={closeModal} color="inherit" disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting}
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
