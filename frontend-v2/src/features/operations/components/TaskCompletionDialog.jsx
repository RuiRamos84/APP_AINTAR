import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, FormControlLabel, Checkbox,
    Typography, Box, CircularProgress, Alert, Stack, Divider,
    Select, MenuItem, FormControl, InputLabel,
    useMediaQuery, useTheme, Slide, IconButton, AppBar, Toolbar, Paper
} from '@mui/material';
import {
    CheckCircle, Close, ArrowBack, PhotoCamera
} from '@mui/icons-material';
import { operationService } from '../services/operationService';
import {
    OPERATION_TYPES, getOperationTypeConfig, getModalTitle, isLaboratoryParameter
} from '../constants/operationTypes';
import MESSAGES from '../constants/messages';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const TaskCompletionDialog = ({ open, onClose, task, onComplete }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [valuetext, setValuetext] = useState('');
    const [booleanValue, setBooleanValue] = useState(false);
    const [analysisParams, setAnalysisParams] = useState([]);
    const [analysisValues, setAnalysisValues] = useState({});
    const [referenceOptions, setReferenceOptions] = useState([]);
    const [selectedReference, setSelectedReference] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [comment, setComment] = useState('');

    const actionType = task?.operacao_tipo || task?.tt_operacaoaccao_type || 1;

    // Carregar parâmetros de análise para tipo 5
    useEffect(() => {
        if (open && actionType === 5 && task?.pk) {
            loadAnalysisParameters();
        }
    }, [open, actionType, task?.pk]);

    // Carregar opções de referência para tipo 3
    useEffect(() => {
        if (open && actionType === 3 && task?.tt_operacaoaccao_refobj) {
            loadReferenceOptions();
        }
    }, [open, actionType, task?.tt_operacaoaccao_refobj]);

    const loadAnalysisParameters = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = await operationService.getAnalysisParameters(task.pk);
            setAnalysisParams(params || []);
            const initialValues = {};
            (params || []).forEach((param) => {
                const key = `${param.tt_analiseponto}_${param.tt_analiseparam}`;
                initialValues[key] = param.resultado || '';
            });
            setAnalysisValues(initialValues);
        } catch (err) {
            setError(MESSAGES.ERROR.LOAD_ANALYTICS);
        } finally {
            setLoading(false);
        }
    };

    const loadReferenceOptions = async () => {
        setLoading(true);
        setError(null);
        try {
            const options = await operationService.getReferenceOptions(task.tt_operacaoaccao_refobj);
            setReferenceOptions(options || []);
        } catch (err) {
            setError('Não foi possível carregar as opções de referência');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);

        try {
            // Validação de amostras laboratoriais (tipo 5)
            if (actionType === 5) {
                const laboratoryParams = analysisParams.filter(param => {
                    const isLaboratory = isLaboratoryParameter(param.tt_analiseforma);
                    const hasResult = param.resultado !== null && param.resultado !== '';
                    return isLaboratory && !hasResult;
                });

                if (laboratoryParams.length > 0) {
                    const sampleDetails = laboratoryParams.map(p =>
                        `  - ID ${p.id_analise}: ${p.tt_analiseponto} - ${p.tt_analiseparam}`
                    ).join('\n');

                    const confirmed = window.confirm(
                        `${MESSAGES.DIALOGS.SAMPLE_IDENTIFICATION_TITLE}\n\n` +
                        `Esta tarefa inclui ${laboratoryParams.length} amostra(s) para análise laboratorial.\n\n` +
                        `IDENTIFIQUE AS AMOSTRAS:\n${sampleDetails}\n\n` +
                        MESSAGES.DIALOGS.SAMPLE_IDENTIFICATION_CONFIRM
                    );

                    if (!confirmed) {
                        setSubmitting(false);
                        return;
                    }
                }
            }

            let completionData = {};

            switch (actionType) {
                case OPERATION_TYPES.NUMBER: {
                    const numValue = parseFloat(valuetext);
                    if (isNaN(numValue)) {
                        setError(MESSAGES.ERROR.INVALID_NUMBER);
                        setSubmitting(false);
                        return;
                    }
                    completionData = { valuetext: numValue.toString(), type: 1 };
                    break;
                }
                case OPERATION_TYPES.TEXT: {
                    if (!valuetext.trim()) {
                        setError(MESSAGES.ERROR.INVALID_TEXT);
                        setSubmitting(false);
                        return;
                    }
                    completionData = { valuetext: valuetext.trim(), type: 2 };
                    break;
                }
                case OPERATION_TYPES.REFERENCE: {
                    if (!selectedReference) {
                        setError(MESSAGES.ERROR.INVALID_SELECTION);
                        setSubmitting(false);
                        return;
                    }
                    completionData = { valuetext: selectedReference.pk, type: 3 };
                    break;
                }
                case OPERATION_TYPES.BOOLEAN: {
                    completionData = { valuetext: booleanValue ? '1' : '0', type: 4 };
                    break;
                }
                case OPERATION_TYPES.ANALYSIS: {
                    const pendingParams = analysisParams.filter(p =>
                        p.resultado === null || p.resultado === ''
                    );
                    const allAreLaboratory = pendingParams.every(p =>
                        isLaboratoryParameter(p.tt_analiseforma)
                    );

                    if (allAreLaboratory && pendingParams.length > 0) {
                        if (!booleanValue) {
                            setError(MESSAGES.FORMS.CONFIRM_COLLECTION);
                            setSubmitting(false);
                            return;
                        }
                        completionData = { valuetext: '1', type: 5, analysisData: [] };
                    } else {
                        const emptyRequired = analysisParams.filter(p => {
                            const key = `${p.tt_analiseponto}_${p.tt_analiseparam}`;
                            const hasResult = p.resultado !== null && p.resultado !== '';
                            const isLab = isLaboratoryParameter(p.tt_analiseforma);
                            return !analysisValues[key] && !isLab && !hasResult;
                        });

                        if (emptyRequired.length > 0) {
                            setError(MESSAGES.FORMS.FILL_ALL_ANALYSIS);
                            setSubmitting(false);
                            return;
                        }

                        const analysisDataWithIds = analysisParams.map(p => {
                            const key = `${p.tt_analiseponto}_${p.tt_analiseparam}`;
                            return { id_analise: p.id_analise, resultado: analysisValues[key] || null };
                        }).filter(item => item.resultado);

                        const summary = analysisDataWithIds.map(i => i.resultado).join(', ');
                        completionData = { valuetext: summary, type: 5, analysisData: analysisDataWithIds };
                    }
                    break;
                }
                default:
                    setError('Tipo de ação não reconhecido');
                    setSubmitting(false);
                    return;
            }

            if (photo) completionData.photo = photo;
            if (comment.trim()) completionData.valuememo = comment.trim();

            await onComplete(task.pk, completionData);
            handleClose();
        } catch (err) {
            setError(err.message || MESSAGES.ERROR.COMPLETE_TASK);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePhotoChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError('A foto não pode exceder 5MB');
            return;
        }
        if (!file.type.startsWith('image/')) {
            setError('Por favor, selecione apenas ficheiros de imagem');
            return;
        }
        setPhoto(file);
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleClose = () => {
        setValuetext('');
        setBooleanValue(false);
        setAnalysisParams([]);
        setAnalysisValues({});
        setReferenceOptions([]);
        setSelectedReference(null);
        setPhoto(null);
        setPhotoPreview(null);
        setComment('');
        setError(null);
        onClose();
    };

    const renderInputField = () => {
        switch (actionType) {
            case OPERATION_TYPES.NUMBER:
                return (
                    <TextField
                        fullWidth label={MESSAGES.FORMS.NUMERIC_VALUE}
                        type="number" value={valuetext}
                        onChange={(e) => setValuetext(e.target.value)}
                        placeholder={MESSAGES.FORMS.NUMERIC_PLACEHOLDER}
                        autoFocus={!isMobile}
                        inputProps={{ step: 'any', inputMode: 'decimal' }}
                    />
                );

            case OPERATION_TYPES.TEXT:
                return (
                    <TextField
                        fullWidth label={MESSAGES.FORMS.OBSERVATIONS}
                        multiline rows={isMobile ? 6 : 4}
                        value={valuetext}
                        onChange={(e) => setValuetext(e.target.value)}
                        placeholder={MESSAGES.FORMS.OBSERVATIONS_PLACEHOLDER}
                        autoFocus={!isMobile}
                    />
                );

            case OPERATION_TYPES.REFERENCE:
                if (loading) {
                    return <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>;
                }
                return (
                    <FormControl fullWidth>
                        <InputLabel>{MESSAGES.FORMS.SELECT_OPTION}</InputLabel>
                        <Select
                            value={selectedReference?.pk || ''}
                            onChange={(e) => {
                                const selected = referenceOptions.find(opt => opt.pk === parseInt(e.target.value));
                                setSelectedReference(selected);
                            }}
                            label={MESSAGES.FORMS.SELECT_OPTION}
                        >
                            {referenceOptions.map((option) => (
                                <MenuItem key={option.pk} value={option.pk}>{option.value}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                );

            case OPERATION_TYPES.BOOLEAN:
                return (
                    <Box sx={{ py: 2 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={booleanValue}
                                    onChange={(e) => setBooleanValue(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Operação concluída com sucesso"
                        />
                    </Box>
                );

            case OPERATION_TYPES.ANALYSIS:
                if (loading) {
                    return <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>;
                }

                const pendingParams = analysisParams.filter(p =>
                    p.resultado === null || p.resultado === ''
                );
                const allPendingAreLab = pendingParams.every(p =>
                    p.tt_analiseforma && p.tt_analiseforma.toLowerCase().includes('laborat')
                );

                return (
                    <Stack spacing={2}>
                        {allPendingAreLab && pendingParams.length > 0 && (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={booleanValue}
                                        onChange={(e) => setBooleanValue(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label={MESSAGES.FORMS.SAMPLE_COLLECTION}
                            />
                        )}

                        {analysisParams.length > 0 && (
                            <>
                                <Divider />
                                <Typography variant="subtitle2" color="text.secondary">
                                    {MESSAGES.FORMS.ANALYSIS_PARAMETERS}
                                </Typography>
                                {analysisParams.map((param) => {
                                    const key = `${param.tt_analiseponto}_${param.tt_analiseparam}`;
                                    const hasResult = param.resultado !== null && param.resultado !== '';
                                    const isLab = isLaboratoryParameter(param.tt_analiseforma);
                                    const isReadonly = hasResult || isLab;

                                    let placeholder = MESSAGES.FORMS.LOCAL_MEASUREMENT;
                                    let helperText = `ID: ${param.id_analise} | Forma: ${param.tt_analiseforma}`;
                                    if (hasResult) {
                                        placeholder = MESSAGES.FORMS.RESULT_RECORDED;
                                        helperText += ' | Completo';
                                    } else if (isLab) {
                                        placeholder = MESSAGES.FORMS.AWAITING_LAB;
                                        helperText += ' | Recolha de amostra';
                                    }

                                    return (
                                        <TextField
                                            key={key} fullWidth
                                            label={`${param.tt_analiseponto} - ${param.tt_analiseparam}`}
                                            value={analysisValues[key] || ''}
                                            onChange={(e) => setAnalysisValues(prev => ({ ...prev, [key]: e.target.value }))}
                                            placeholder={placeholder}
                                            type="number"
                                            inputProps={{ step: 'any' }}
                                            size="small"
                                            disabled={isReadonly}
                                            helperText={helperText}
                                        />
                                    );
                                })}
                            </>
                        )}

                        {analysisParams.length === 0 && !loading && (
                            <Alert severity="info">{MESSAGES.FORMS.NO_ANALYSIS_PARAMS}</Alert>
                        )}
                    </Stack>
                );

            default:
                return <Alert severity="warning">Tipo de ação não reconhecido (Type: {actionType})</Alert>;
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isMobile}
            TransitionComponent={isMobile ? Transition : undefined}
            PaperProps={{
                sx: { borderRadius: isMobile ? 0 : 3, maxHeight: isMobile ? '100vh' : '90vh' }
            }}
        >
            {isMobile && (
                <AppBar position="static" elevation={1} sx={{ bgcolor: 'success.main' }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={handleClose} disabled={submitting}>
                            <ArrowBack />
                        </IconButton>
                        <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>
                            {MESSAGES.FORMS.COMPLETE_TASK}
                        </Typography>
                    </Toolbar>
                </AppBar>
            )}

            {!isMobile && (
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <CheckCircle color="success" />
                        {getModalTitle(actionType)}
                    </Box>
                    {task && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {task.description || task.acao_operacao}
                        </Typography>
                    )}
                </DialogTitle>
            )}

            <DialogContent sx={{ px: isMobile ? 2 : 3 }}>
                {isMobile && task && (
                    <Box sx={{ mb: 2, mt: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            {MESSAGES.FORMS.TASK_DETAILS}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {task.description || task.acao_operacao}
                        </Typography>
                    </Box>
                )}

                <Stack spacing={3} sx={{ mt: isMobile ? 0 : 2 }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    {renderInputField()}

                    <Divider />

                    {/* Comentário opcional */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary">
                            Comentário Adicional (Opcional)
                        </Typography>
                        <TextField
                            fullWidth multiline rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Adicione observações ou notas sobre esta tarefa..."
                        />
                    </Box>

                    {/* Upload de foto */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary">
                            Anexar Foto (Opcional)
                        </Typography>

                        {!photoPreview ? (
                            <Button variant="outlined" component="label" startIcon={<PhotoCamera />} fullWidth={isMobile}>
                                Selecionar Foto
                                <input type="file" hidden accept="image/*" onChange={handlePhotoChange} capture="environment" />
                            </Button>
                        ) : (
                            <Paper sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                                <Box sx={{ position: 'relative' }}>
                                    <img
                                        src={photoPreview} alt="Preview"
                                        style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8 }}
                                    />
                                    <IconButton
                                        onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                                        sx={{
                                            position: 'absolute', top: 8, right: 8,
                                            bgcolor: 'error.main', color: 'white',
                                            '&:hover': { bgcolor: 'error.dark' }
                                        }}
                                        size="small"
                                    >
                                        <Close />
                                    </IconButton>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    {photo?.name} ({(photo?.size / 1024).toFixed(0)} KB)
                                </Typography>
                            </Paper>
                        )}
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Formatos aceites: JPG, PNG. Tamanho máximo: 5MB
                        </Typography>
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{
                px: isMobile ? 2 : 3, py: isMobile ? 2 : 1.5,
                gap: isMobile ? 1 : 0,
                flexDirection: isMobile ? 'column-reverse' : 'row'
            }}>
                <Button onClick={handleClose} disabled={submitting} fullWidth={isMobile}>
                    {MESSAGES.UI.CANCEL}
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained" color="success"
                    disabled={submitting || loading}
                    startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
                    fullWidth={isMobile}
                    size={isMobile ? 'large' : 'medium'}
                >
                    {submitting ? MESSAGES.LOADING.COMPLETING : MESSAGES.ACTIONS.COMPLETE_TASK}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TaskCompletionDialog;
