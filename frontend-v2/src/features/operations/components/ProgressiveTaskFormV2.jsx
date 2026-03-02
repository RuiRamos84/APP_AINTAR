import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Stepper, Step, StepLabel, Button, TextField,
    FormControl, InputLabel, Select, MenuItem, FormHelperText,
    Typography, Chip, Stack, Card, CardContent, Collapse, Alert,
    CircularProgress
} from '@mui/material';
import {
    LocationOn, Build, People, Check,
    NavigateNext, NavigateBefore, ExpandMore, ExpandLess
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { fetchMetaData } from '@/services/metadataService';

/** Safely unwrap axios response — handles both {etar:[]} and {data:{etar:[]}} shapes */
const getMeta = (raw) => raw?.data ?? raw ?? {};


const DRAFT_KEY = 'operation-form-draft-v2';

const STEPS = [
    { label: 'Instalação',  description: 'Onde será realizada a operação?' },
    { label: 'Operação',    description: 'O que será feito?' },
    { label: 'Operadores',  description: 'Quem irá executar?' },
    { label: 'Revisão',     description: 'Confirmar informações antes de criar' },
];

const EMPTY_FORM = {
    data: new Date().toISOString().split('T')[0],
    descr: '',
    tb_instalacao: '',
    tt_operacaoaccao: '',
    tt_operacaomodo: '',
    tt_operacaodia: '',
    who1: '',
    who2: '',
};

/**
 * ProgressiveTaskFormV2
 *
 * Formulário em stepper de 4 passos para criar / editar voltas de operação.
 * Adaptado do ProgressiveTaskFormV2.js do frontend antigo para o frontend-v2.
 *
 * @param {object|null} initialTask  - Dados iniciais para edição (null = modo criação)
 * @param {function}    onSubmit     - Callback com cleanData quando o formulário é submetido
 * @param {function}    onCancel     - Callback ao cancelar
 */
const ProgressiveTaskFormV2 = ({ initialTask = null, onSubmit, onCancel }) => {
    const { data: rawMetaData, isLoading: metaLoading } = useQuery({
        queryKey: ['metadata'],
        queryFn: fetchMetaData,
        staleTime: 1000 * 60 * 60,
    });
    const metaData = getMeta(rawMetaData);


    // ─── Estado ─────────────────────────────────────────────────────────────
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState(() => {
        if (initialTask) {
            return {
                data:              initialTask.data              || EMPTY_FORM.data,
                descr:             initialTask.descr             || '',
                tb_instalacao:     initialTask.pk_instalacao     || '',
                tt_operacaoaccao:  initialTask.pk_operacaoaccao  || '',
                tt_operacaomodo:   initialTask.pk_operacaomodo   || '',
                tt_operacaodia:    initialTask.pk_operacaodia    || '',
                who1:              initialTask.pk_operador1      || '',
                who2:              initialTask.pk_operador2      || '',
            };
        }
        // Restaurar rascunho do localStorage
        try {
            const draft = localStorage.getItem(DRAFT_KEY);
            if (draft) return { ...EMPTY_FORM, ...JSON.parse(draft) };
        } catch { /* ignore */ }
        return { ...EMPTY_FORM };
    });

    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [saving, setSaving] = useState(false);

    // ─── Auto-save (rascunho) ────────────────────────────────────────────────
    useEffect(() => {
        if (initialTask) return; // não guardar rascunho em modo edição
        const timer = setTimeout(() => {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
        }, 800);
        return () => clearTimeout(timer);
    }, [formData, initialTask]);

    // ─── Listas para selects ─────────────────────────────────────────────────
    const installations = useMemo(() => [
        ...(metaData?.etar || []).map(e => ({ id: e.pk, name: e.nome, type: 'ETAR' })),
        ...(metaData?.ee   || []).map(e => ({ id: e.pk, name: e.nome, type: 'EE'   })),
    ].sort((a, b) => a.name?.localeCompare(b.name)), [metaData]);

    const actions   = useMemo(() => metaData?.operacaoaccao || [], [metaData]);
    const modes     = useMemo(() => metaData?.operacamodo   || [], [metaData]);
    const days      = useMemo(() => metaData?.operacaodia   || [], [metaData]);
    const operators = useMemo(() => metaData?.who           || [], [metaData]);

    // ─── Validação ───────────────────────────────────────────────────────────
    const validate = (field, value, data = formData) => {
        const errs = { ...errors };
        switch (field) {
            case 'tb_instalacao':
                if (!value) errs.tb_instalacao = 'Instalação é obrigatória';
                else delete errs.tb_instalacao;
                break;
            case 'data':
                if (!value) errs.data = 'Data é obrigatória';
                else delete errs.data;
                break;
            case 'tt_operacaoaccao':
                if (!value) errs.tt_operacaoaccao = 'Ação é obrigatória';
                else delete errs.tt_operacaoaccao;
                break;
            case 'who1':
                if (!value) errs.who1 = 'Operador principal é obrigatório';
                else delete errs.who1;
                break;
            case 'who2':
                if (value && value === data.who1)
                    errs.who2 = 'Deve ser diferente do operador principal';
                else delete errs.who2;
                break;
            default: break;
        }
        setErrors(errs);
        return errs;
    };

    const isStepValid = (step, data = formData) => {
        switch (step) {
            case 0: return !!data.tb_instalacao;
            case 1: return !!data.data && !!data.tt_operacaoaccao;
            case 2: return !!data.who1 && (!data.who2 || data.who2 !== data.who1);
            case 3: return !!data.tb_instalacao && !!data.tt_operacaoaccao && !!data.who1;
            default: return true;
        }
    };

    // ─── Handlers ────────────────────────────────────────────────────────────
    const handleChange = (field) => (e) => {
        const value = e.target.value;
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            if (touched[field]) validate(field, value, updated);
            return updated;
        });
    };

    const handleBlur = (field) => () => {
        setTouched(prev => ({ ...prev, [field]: true }));
        validate(field, formData[field]);
    };

    const handleNext = () => {
        if (isStepValid(currentStep)) setCurrentStep(s => s + 1);
    };

    const handleBack = () => setCurrentStep(s => s - 1);

    const handleSubmit = async () => {
        if (!isStepValid(0) || !isStepValid(1) || !isStepValid(2)) return;
        setSaving(true);
        try {
            const cleanData = {
                data:             formData.data              || undefined,
                descr:            formData.descr             || undefined,
                tb_instalacao:    formData.tb_instalacao     ? parseInt(formData.tb_instalacao,    10) : undefined,
                tt_operacaoaccao: formData.tt_operacaoaccao  ? parseInt(formData.tt_operacaoaccao, 10) : undefined,
                tt_operacaomodo:  formData.tt_operacaomodo   ? parseInt(formData.tt_operacaomodo,  10) : undefined,
                tt_operacaodia:   formData.tt_operacaodia    ? parseInt(formData.tt_operacaodia,   10) : undefined,
                who1:             formData.who1              ? parseInt(formData.who1,             10) : undefined,
                who2:             formData.who2              ? parseInt(formData.who2,             10) : undefined,
            };
            // remove undefined
            Object.keys(cleanData).forEach(k => cleanData[k] === undefined && delete cleanData[k]);
            await onSubmit(cleanData);
            localStorage.removeItem(DRAFT_KEY);
        } finally {
            setSaving(false);
        }
    };

    // ─── Render de cada passo ────────────────────────────────────────────────
    const renderStep = () => {
        switch (currentStep) {
            case 0: // Instalação
                return (
                    <FormControl
                        fullWidth required
                        error={touched.tb_instalacao && !!errors.tb_instalacao}
                    >
                        <InputLabel>Instalação *</InputLabel>
                        <Select
                            value={formData.tb_instalacao}
                            onChange={handleChange('tb_instalacao')}
                            onBlur={handleBlur('tb_instalacao')}
                            label="Instalação *"
                        >
                            {installations.map(inst => (
                                <MenuItem key={inst.id} value={inst.id}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Chip
                                            size="small"
                                            label={inst.type}
                                            color={inst.type === 'ETAR' ? 'success' : 'info'}
                                            sx={{ minWidth: 40, fontSize: 10 }}
                                        />
                                        {inst.name}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                        {touched.tb_instalacao && errors.tb_instalacao && (
                            <FormHelperText>{errors.tb_instalacao}</FormHelperText>
                        )}
                    </FormControl>
                );

            case 1: // Operação
                return (
                    <Stack spacing={2.5}>
                        <TextField
                            fullWidth required
                            type="date"
                            label="Data da Operação *"
                            value={formData.data}
                            onChange={handleChange('data')}
                            onBlur={handleBlur('data')}
                            error={touched.data && !!errors.data}
                            helperText={touched.data && errors.data}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />

                        <FormControl
                            fullWidth required
                            error={touched.tt_operacaoaccao && !!errors.tt_operacaoaccao}
                        >
                            <InputLabel>Ação *</InputLabel>
                            <Select
                                value={formData.tt_operacaoaccao}
                                onChange={handleChange('tt_operacaoaccao')}
                                onBlur={handleBlur('tt_operacaoaccao')}
                                label="Ação *"
                            >
                                {actions.map(a => (
                                    <MenuItem key={a.pk} value={a.pk}>{a.value || a.name}</MenuItem>
                                ))}
                            </Select>
                            {touched.tt_operacaoaccao && errors.tt_operacaoaccao && (
                                <FormHelperText>{errors.tt_operacaoaccao}</FormHelperText>
                            )}
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Descrição (opcional)"
                            value={formData.descr}
                            onChange={handleChange('descr')}
                            multiline rows={2}
                        />

                        {/* Opções avançadas */}
                        <Box>
                            <Button
                                size="small"
                                startIcon={showAdvanced ? <ExpandLess /> : <ExpandMore />}
                                onClick={() => setShowAdvanced(v => !v)}
                            >
                                Opções Avançadas
                            </Button>
                            <Collapse in={showAdvanced}>
                                <Stack spacing={2} sx={{ mt: 2 }}>
                                    <FormControl fullWidth>
                                        <InputLabel>Modo</InputLabel>
                                        <Select
                                            value={formData.tt_operacaomodo}
                                            onChange={handleChange('tt_operacaomodo')}
                                            label="Modo"
                                        >
                                            <MenuItem value=""><em>Nenhum</em></MenuItem>
                                            {modes.map(m => (
                                                <MenuItem key={m.pk} value={m.pk}>{m.value}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth>
                                        <InputLabel>Dia</InputLabel>
                                        <Select
                                            value={formData.tt_operacaodia}
                                            onChange={handleChange('tt_operacaodia')}
                                            label="Dia"
                                        >
                                            <MenuItem value=""><em>Nenhum</em></MenuItem>
                                            {days.map(d => (
                                                <MenuItem key={d.pk} value={d.pk}>{d.value}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Stack>
                            </Collapse>
                        </Box>
                    </Stack>
                );

            case 2: // Operadores
                return (
                    <Stack spacing={2.5}>
                        <FormControl
                            fullWidth required
                            error={touched.who1 && !!errors.who1}
                        >
                            <InputLabel>Operador Principal *</InputLabel>
                            <Select
                                value={formData.who1}
                                onChange={handleChange('who1')}
                                onBlur={handleBlur('who1')}
                                label="Operador Principal *"
                            >
                                {operators.map(op => (
                                    <MenuItem key={op.pk} value={op.pk}>{op.name}</MenuItem>
                                ))}
                            </Select>
                            {touched.who1 && errors.who1 && (
                                <FormHelperText>{errors.who1}</FormHelperText>
                            )}
                        </FormControl>

                        <FormControl
                            fullWidth
                            error={touched.who2 && !!errors.who2}
                        >
                            <InputLabel>Operador Secundário (opcional)</InputLabel>
                            <Select
                                value={formData.who2}
                                onChange={handleChange('who2')}
                                onBlur={handleBlur('who2')}
                                label="Operador Secundário (opcional)"
                            >
                                <MenuItem value=""><em>Nenhum</em></MenuItem>
                                {operators
                                    .filter(op => String(op.pk) !== String(formData.who1))
                                    .map(op => (
                                        <MenuItem key={op.pk} value={op.pk}>{op.name}</MenuItem>
                                    ))}
                            </Select>
                            {touched.who2 && errors.who2 && (
                                <FormHelperText>{errors.who2}</FormHelperText>
                            )}
                        </FormControl>
                    </Stack>
                );

            case 3: { // Revisão
                const selInst   = installations.find(i => String(i.id)  === String(formData.tb_instalacao));
                const selAction = actions.find(a        => String(a.pk)  === String(formData.tt_operacaoaccao));
                const selMode   = modes.find(m          => String(m.pk)  === String(formData.tt_operacaomodo));
                const selDay    = days.find(d           => String(d.pk)  === String(formData.tt_operacaodia));
                const selOp1    = operators.find(o      => String(o.pk)  === String(formData.who1));
                const selOp2    = operators.find(o      => String(o.pk)  === String(formData.who2));

                const fmtDate = formData.data
                    ? new Date(formData.data + 'T00:00:00').toLocaleDateString('pt-PT')
                    : '—';

                const reviewRows = [
                    { label: 'Data',        value: fmtDate },
                    { label: 'Instalação',  value: selInst   ? `[${selInst.type}] ${selInst.name}`  : '—' },
                    { label: 'Ação',        value: selAction  ? (selAction.value || selAction.name)  : '—' },
                    { label: 'Modo',        value: selMode    ? selMode.value   : '—' },
                    { label: 'Dia',         value: selDay     ? selDay.value    : '—' },
                    { label: 'Operador 1',  value: selOp1     ? selOp1.name    : '—' },
                    { label: 'Operador 2',  value: selOp2     ? selOp2.name    : '—' },
                    { label: 'Descrição',   value: formData.descr || '—' },
                ].filter(r => r.value && r.value !== '—');

                return (
                    <Stack spacing={2}>
                        <Alert severity="info">
                            Reveja as informações antes de {initialTask ? 'atualizar' : 'criar'} a volta
                        </Alert>
                        <Card variant="outlined">
                            <CardContent>
                                <Stack spacing={1.5}>
                                    {reviewRows.map(({ label, value }) => (
                                        <Box key={label}>
                                            <Typography variant="caption" color="text.secondary">
                                                {label}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {value}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                );
            }

            default: return null;
        }
    };

    // ─── Render principal ────────────────────────────────────────────────────
    if (metaLoading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            {/* Stepper */}
            <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
                {STEPS.map(({ label }, idx) => (
                    <Step key={label} completed={idx < currentStep}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {/* Descrição do passo */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {STEPS[currentStep].description}
            </Typography>

            {/* Conteúdo */}
            <Box sx={{ minHeight: 220, mb: 4 }}>
                {renderStep()}
            </Box>

            {/* Navegação */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Button
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    startIcon={<NavigateBefore />}
                >
                    Voltar
                </Button>

                <Box display="flex" gap={1}>
                    <Button onClick={onCancel} disabled={saving}>
                        Cancelar
                    </Button>

                    {currentStep < STEPS.length - 1 ? (
                        <Button
                            variant="contained"
                            onClick={handleNext}
                            endIcon={<NavigateNext />}
                            disabled={!isStepValid(currentStep)}
                        >
                            Próximo
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            color="success"
                            onClick={handleSubmit}
                            disabled={saving || !isStepValid(0) || !isStepValid(1) || !isStepValid(2)}
                            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Check />}
                        >
                            {saving ? 'A guardar...' : initialTask ? 'Atualizar Volta' : 'Criar Volta'}
                        </Button>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default ProgressiveTaskFormV2;
