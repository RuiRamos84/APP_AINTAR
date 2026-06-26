import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, FormControlLabel, Checkbox,
    Typography, Box, CircularProgress, Alert, Stack, Divider,
    Select, MenuItem, FormControl, InputLabel,
    useMediaQuery, useTheme, Slide, IconButton, AppBar, Toolbar
} from '@mui/material';
import {
    CheckCircle, Close, ArrowBack, Edit
} from '@mui/icons-material';
import { operationService } from '../services/operationService';
import FileUploadControl from './FileUploadControl';
import AnnexesSection from './AnnexesSection';
import {
    OPERATION_TYPES, getOperationTypeConfig, getModalTitle, isLaboratoryParameter
} from '../constants/operationTypes';
import MESSAGES from '../constants/messages';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const TaskCompletionDialog = ({ open, onClose, task, onComplete, editMode = false, onUpdate }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [valuetext, setValuetext] = useState('');
    const [booleanValue, setBooleanValue] = useState(false);
    const [energyValues, setEnergyValues] = useState({ vazio: '', ponta: '', cheia: '' });
    const [analysisParams, setAnalysisParams] = useState([]);
    const [analysisValues, setAnalysisValues] = useState({});
    const [referenceOptions, setReferenceOptions] = useState([]);
    const [selectedReference, setSelectedReference] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [annexFiles, setAnnexFiles] = useState([]);
    const [comment, setComment] = useState('');
    const [extraParams, setExtraParams] = useState([]);
    const [extraValues, setExtraValues] = useState({});
    const [extraRefOptions, setExtraRefOptions] = useState({});
    const [loadingExtraParams, setLoadingExtraParams] = useState(false);
    const [collectedSamples, setCollectedSamples] = useState(null); // null = não mostrar; [] / [...] = mostrar ecrã de sucesso

    const actionType = task?.operacao_tipo || task?.tt_operacaoaccao_type || 1;

    // Pre-popular campos em modo de edição
    useEffect(() => {
        if (!open || !editMode || !task) return;
        const stored = task.valuetext ?? '';
        switch (actionType) {
            case 1:
            case 2:
                setValuetext(stored);
                break;
            case 4:
                setBooleanValue(stored === '1');
                break;
            case 6: {
                const parts = stored.split(';');
                setEnergyValues({ vazio: parts[0] ?? '', ponta: parts[1] ?? '', cheia: parts[2] ?? '' });
                break;
            }
            default:
                break;
        }
        setComment(task.valuememo ?? '');
    }, [open, editMode, task?.pk]);

    // Carregar parâmetros de análise para tipo 5
    useEffect(() => {
        if (open && actionType === 5 && task?.pk && !editMode) {
            loadAnalysisParameters();
        }
    }, [open, actionType, task?.pk]);

    // Carregar opções de referência para tipo 3
    useEffect(() => {
        if (open && actionType === 3 && task?.tt_operacaoaccao_refobj) {
            loadReferenceOptions();
        }
    }, [open, actionType, task?.tt_operacaoaccao_refobj]);

    // Carregar parâmetros adicionais da tarefa (tb_param_operacaoaccao), independente do tipo de ação
    useEffect(() => {
        if (open && task?.pk) {
            loadExtraParams();
        }
    }, [open, task?.pk]);

    const loadExtraParams = async () => {
        setLoadingExtraParams(true);
        try {
            const params = await operationService.getOperacaoParams(task.pk);
            setExtraParams(params || []);
            const initialValues = {};
            (params || []).forEach((p) => { initialValues[p.pk] = p.value ?? ''; });
            setExtraValues(initialValues);

            const refParams = (params || []).filter((p) => p.type === 3);
            if (refParams.length > 0) {
                const optionsByPk = {};
                await Promise.all(refParams.map(async (p) => {
                    try {
                        optionsByPk[p.pk] = await operationService.getOperacaoParamReferenceOptions(p.pk);
                    } catch (err) {
                        console.error(`[TaskCompletion] Erro ao carregar opções de referência (param ${p.pk}):`, err);
                        optionsByPk[p.pk] = [];
                    }
                }));
                setExtraRefOptions(optionsByPk);
            }
        } catch (err) {
            console.error('[TaskCompletion] Erro ao carregar parâmetros adicionais:', err);
        } finally {
            setLoadingExtraParams(false);
        }
    };

    const validateExtraParams = () => {
        const missing = extraParams.filter((p) => {
            if (!p.mandatory) return false;
            const v = extraValues[p.pk];
            return v === undefined || v === null || String(v).trim() === '';
        });
        if (missing.length > 0) {
            setError(`Preencha o(s) parâmetro(s) obrigatório(s): ${missing.map((p) => p.name).join(', ')}`);
            return false;
        }
        return true;
    };

    const saveExtraParams = async () => {
        const editableParams = extraParams.filter((p) => p.editable !== 0 && p.editable !== false);
        for (const p of editableParams) {
            const value = extraValues[p.pk];
            if (value === undefined || value === null || String(value).trim() === '') continue;
            try {
                await operationService.updateOperacaoParam(p.pk, { value: String(value) });
            } catch (err) {
                console.error(`[TaskCompletion] Erro ao gravar parâmetro ${p.name}:`, err);
            }
        }
    };

    const loadAnalysisParameters = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = await operationService.getAnalysisParameters(task.pk);
            setAnalysisParams(params || []);
            const initialValues = {};
            (params || []).forEach((param) => {
                const key = `${param.tt_analiseponto}_${param.tt_analiseparam}`;
                initialValues[key] = param.resultado ?? '';
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
            if (editMode && task?.valuetext) {
                const pkVal = parseInt(task.valuetext, 10);
                const found = (options || []).find(o => o.pk === pkVal) ?? null;
                setSelectedReference(found);
            }
        } catch (err) {
            setError('Não foi possível carregar as opções de referência');
        } finally {
            setLoading(false);
        }
    };

    const handleEditSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            let newValuetext;
            switch (actionType) {
                case OPERATION_TYPES.NUMBER: {
                    const n = parseFloat(valuetext);
                    if (isNaN(n)) { setError(MESSAGES.ERROR.INVALID_NUMBER); setSubmitting(false); return; }
                    newValuetext = n.toString();
                    break;
                }
                case OPERATION_TYPES.TEXT: {
                    if (!valuetext.trim()) { setError(MESSAGES.ERROR.INVALID_TEXT); setSubmitting(false); return; }
                    newValuetext = valuetext.trim();
                    break;
                }
                case OPERATION_TYPES.REFERENCE: {
                    if (!selectedReference) { setError(MESSAGES.ERROR.INVALID_SELECTION); setSubmitting(false); return; }
                    newValuetext = String(selectedReference.pk);
                    break;
                }
                case OPERATION_TYPES.BOOLEAN:
                    newValuetext = booleanValue ? '1' : '0';
                    break;
                case OPERATION_TYPES.ENERGY_METER: {
                    const { vazio, ponta, cheia } = energyValues;
                    const nums = [vazio, ponta, cheia].map(v => parseFloat(v));
                    if (nums.some(isNaN) || [vazio, ponta, cheia].some(v => String(v).trim() === '')) {
                        setError('Preencha todos os campos de leitura (Vazio, Ponta, Cheia)');
                        setSubmitting(false);
                        return;
                    }
                    newValuetext = `${nums[0]};${nums[1]};${nums[2]}`;
                    break;
                }
                default:
                    setError('Tipo de ação não suportado para edição');
                    setSubmitting(false);
                    return;
            }
            if (!validateExtraParams()) { setSubmitting(false); return; }

            const updateData = { valuetext: newValuetext };
            if (comment.trim()) updateData.valuememo = comment.trim();
            await onUpdate(task.pk, updateData);
            await saveExtraParams();
            handleClose();
        } catch (err) {
            setError(err?.response?.data?.error || err?.message || 'Erro ao corrigir tarefa');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async () => {
        if (editMode) { await handleEditSubmit(); return; }
        setSubmitting(true);
        setError(null);

        if (!validateExtraParams()) { setSubmitting(false); return; }

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
                    if (selectedReference == null) {
                        setError(MESSAGES.ERROR.INVALID_SELECTION);
                        setSubmitting(false);
                        return;
                    }
                    completionData = { valuetext: String(selectedReference.pk), type: 3 };
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
                            const hasInput = analysisValues[key] !== '' && analysisValues[key] != null;
                            return !hasInput && !isLab && !hasResult;
                        });

                        if (emptyRequired.length > 0) {
                            setError(MESSAGES.FORMS.FILL_ALL_ANALYSIS);
                            setSubmitting(false);
                            return;
                        }

                        const analysisDataWithIds = analysisParams.map(p => {
                            const key = `${p.tt_analiseponto}_${p.tt_analiseparam}`;
                            const val = analysisValues[key];
                            return { id_analise: p.id_analise, resultado: (val !== '' && val != null) ? val : null };
                        }).filter(item => item.resultado !== null);

                        const summary = analysisDataWithIds.map(i => i.resultado).join(', ');
                        completionData = { valuetext: summary, type: 5, analysisData: analysisDataWithIds };
                    }
                    break;
                }
                case OPERATION_TYPES.ENERGY_METER: {
                    const { vazio, ponta, cheia } = energyValues;
                    const nums = [vazio, ponta, cheia].map((v) => parseFloat(v));
                    if (nums.some(isNaN) || [vazio, ponta, cheia].some((v) => v.trim() === '')) {
                        setError('Preencha todos os campos de leitura (Vazio, Ponta, Cheia)');
                        setSubmitting(false);
                        return;
                    }
                    completionData = { valuetext: `${nums[0]};${nums[1]};${nums[2]}`, type: 6 };
                    break;
                }
                default:
                    setError('Tipo de ação não reconhecido');
                    setSubmitting(false);
                    return;
            }

            if (comment.trim()) completionData.valuememo = comment.trim();

            await onComplete(task.pk, completionData);
            await saveExtraParams();

            // Upload de anexos após conclusão (falha silenciosa — tarefa já concluída)
            if (annexFiles.length > 0) {
                try {
                    await operationService.addOperationAnnexes(task.pk, annexFiles);
                } catch (uploadErr) {
                    console.error('[TaskCompletion] Erro ao enviar anexos:', uploadErr);
                }
            }

            // Amostras laboratoriais recolhidas nesta tarefa: mostrar referência para etiquetar/identificar
            if (actionType === OPERATION_TYPES.ANALYSIS) {
                const labSamples = analysisParams.filter((p) => isLaboratoryParameter(p.tt_analiseforma));
                if (labSamples.length > 0) {
                    setCollectedSamples(labSamples);
                    setSubmitting(false);
                    return;
                }
            }

            handleClose();
        } catch (err) {
            setError(err?.response?.data?.error || err?.message || MESSAGES.ERROR.COMPLETE_TASK);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setValuetext('');
        setBooleanValue(false);
        setEnergyValues({ vazio: '', ponta: '', cheia: '' });
        setAnalysisParams([]);
        setAnalysisValues({});
        setReferenceOptions([]);
        setSelectedReference(null);
        setAnnexFiles([]);
        setComment('');
        setExtraParams([]);
        setExtraValues({});
        setExtraRefOptions({});
        setCollectedSamples(null);
        setError(null);
        onClose();
    };

    const renderExtraParams = () => {
        if (loadingExtraParams) {
            return <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>;
        }
        if (extraParams.length === 0) return null;

        return (
            <>
                <Divider />
                <Typography variant="subtitle2" color="text.secondary">
                    Parâmetros
                </Typography>
                <Stack spacing={2}>
                    {extraParams.map((p) => {
                        const isLocked = p.editable === 0 || p.editable === false;
                        const label = `${p.name}${p.mandatory ? ' *' : ''}${p.units ? ` (${p.units})` : ''}`;

                        if (p.type === 4) {
                            return (
                                <FormControlLabel
                                    key={p.pk}
                                    control={
                                        <Checkbox
                                            checked={extraValues[p.pk] === '1'}
                                            disabled={isLocked}
                                            onChange={(e) => setExtraValues((prev) => ({ ...prev, [p.pk]: e.target.checked ? '1' : '0' }))}
                                        />
                                    }
                                    label={label}
                                />
                            );
                        }

                        if (p.type === 3) {
                            const options = extraRefOptions[p.pk] || [];
                            return (
                                <FormControl key={p.pk} fullWidth size="small" disabled={isLocked}>
                                    <InputLabel>{label}</InputLabel>
                                    <Select
                                        value={extraValues[p.pk] ?? ''}
                                        label={label}
                                        onChange={(e) => setExtraValues((prev) => ({ ...prev, [p.pk]: e.target.value }))}
                                    >
                                        {options.map((opt) => (
                                            <MenuItem key={opt.pk} value={String(opt.pk)}>{opt.value}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            );
                        }

                        return (
                            <TextField
                                key={p.pk}
                                fullWidth
                                size="small"
                                label={label}
                                type={p.type === 1 ? 'number' : 'text'}
                                multiline={p.type === 2}
                                rows={p.type === 2 ? 2 : undefined}
                                inputProps={p.type === 1 ? { step: 'any' } : undefined}
                                value={extraValues[p.pk] ?? ''}
                                disabled={isLocked}
                                onChange={(e) => setExtraValues((prev) => ({ ...prev, [p.pk]: e.target.value }))}
                            />
                        );
                    })}
                </Stack>
            </>
        );
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
                            value={selectedReference?.pk ?? ''}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                const selected = referenceOptions.find(opt => opt.pk === val) ?? null;
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
                if (editMode) {
                    return (
                        <Alert severity="info">
                            Os valores de análise são geridos pelo módulo de análises e não são editáveis aqui. Pode corrigir apenas as observações abaixo.
                        </Alert>
                    );
                }
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
                                            value={analysisValues[key] ?? ''}
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

            case OPERATION_TYPES.ENERGY_METER:
                return (
                    <Stack spacing={2}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Leituras do Contador de Energia
                        </Typography>
                        {['vazio', 'ponta', 'cheia'].map((field) => (
                            <TextField
                                key={field}
                                fullWidth
                                label={{ vazio: 'Vazio (kWh)', ponta: 'Ponta (kWh)', cheia: 'Cheia (kWh)' }[field]}
                                type="number"
                                value={energyValues[field]}
                                onChange={(e) => setEnergyValues((prev) => ({ ...prev, [field]: e.target.value }))}
                                inputProps={{ step: 'any', min: 0, inputMode: 'decimal' }}
                                autoFocus={field === 'vazio' && !isMobile}
                            />
                        ))}
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
                <AppBar position="static" elevation={1} sx={{ bgcolor: editMode ? 'warning.main' : 'success.main' }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={handleClose} disabled={submitting}>
                            <ArrowBack />
                        </IconButton>
                        <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>
                            {editMode ? 'Corrigir Resposta' : MESSAGES.FORMS.COMPLETE_TASK}
                        </Typography>
                    </Toolbar>
                </AppBar>
            )}

            {!isMobile && (
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        {collectedSamples ? <CheckCircle color="success" /> : editMode ? <Edit color="warning" /> : <CheckCircle color="success" />}
                        {collectedSamples ? 'Amostra(s) Recolhida(s)' : editMode ? 'Corrigir Resposta' : getModalTitle(actionType)}
                    </Box>
                    {task && !collectedSamples && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {task.description || task.acao_operacao}
                        </Typography>
                    )}
                </DialogTitle>
            )}

            {collectedSamples ? (
                <>
                    <DialogContent sx={{ px: isMobile ? 2 : 3 }}>
                        <Stack spacing={2} sx={{ mt: isMobile ? 0 : 1 }}>
                            <Alert severity="success">
                                Tarefa concluída. Identifique o(s) recipiente(s) da amostra com a(s) referência(s) abaixo —
                                o laboratório vai usar este número para registar os resultados.
                            </Alert>
                            <Stack spacing={1.5}>
                                {collectedSamples.map((s) => (
                                    <Box key={s.id_analise} sx={{
                                        p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {s.tt_analiseponto} — {s.tt_analiseparam}
                                            </Typography>
                                        </Box>
                                        <Typography variant="h5" fontWeight={700} color="success.main">
                                            #{s.id_analise}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: isMobile ? 2 : 3, py: isMobile ? 2 : 1.5 }}>
                        <Button onClick={handleClose} variant="contained" color="success" fullWidth={isMobile}>
                            Concluir
                        </Button>
                    </DialogActions>
                </>
            ) : (
            <>
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

                    {renderExtraParams()}

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

                    {/* Anexos */}
                    <Divider />
                    {editMode ? (
                        <AnnexesSection operacaoPk={task?.pk} />
                    ) : (
                        <FileUploadControl
                            files={annexFiles}
                            setFiles={setAnnexFiles}
                            maxFiles={5}
                        />
                    )}
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
                    variant="contained"
                    color={editMode ? 'warning' : 'success'}
                    disabled={submitting || loading}
                    startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : editMode ? <Edit /> : <CheckCircle />}
                    fullWidth={isMobile}
                    size={isMobile ? 'large' : 'medium'}
                >
                    {submitting ? MESSAGES.LOADING.COMPLETING : editMode ? 'Guardar Correção' : MESSAGES.ACTIONS.COMPLETE_TASK}
                </Button>
            </DialogActions>
            </>
            )}
        </Dialog>
    );
};

export default TaskCompletionDialog;
