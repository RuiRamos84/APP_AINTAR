import React, { useState, useEffect } from 'react';
import {
  Box, Stepper, Step, StepLabel, Button, Paper,
  TextField, FormControl, InputLabel, Select, MenuItem,
  FormHelperText, Typography, Chip, Stack, Card, CardContent,
  IconButton, Collapse, Alert
} from '@mui/material';
import {
  LocationOn, Build, People, Check, NavigateNext,
  NavigateBefore, ExpandMore, ExpandLess
} from '@mui/icons-material';
import { useMetaData } from '../../../../contexts/MetaDataContext';
import useOperationsStore from '../../store/operationsStore';

/**
 * PROGRESSIVE TASK FORM V2
 *
 * Melhorias:
 * - Stepper visual claro
 * - Validação em tempo real por campo
 * - Preview antes de submeter
 * - Auto-save em localStorage
 * - Opções avançadas colapsáveis
 * - Teclado navegação (Enter para próximo)
 */

const steps = [
  {
    label: 'Instalação',
    icon: <LocationOn />,
    description: 'Onde será realizada a operação?'
  },
  {
    label: 'Operação',
    icon: <Build />,
    description: 'O que será feito?'
  },
  {
    label: 'Operadores',
    icon: <People />,
    description: 'Quem irá executar?'
  },
  {
    label: 'Revisão',
    icon: <Check />,
    description: 'Confirmar informações'
  }
];

const ProgressiveTaskFormV2 = ({
  initialTask = null,
  onSubmit,
  onCancel
}) => {
  const { metaData, loading: metaDataLoading } = useMetaData();
  const store = useOperationsStore();

  // ============================================================
  // ESTADO DO FORMULÁRIO
  // ============================================================

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    tb_instalacao: initialTask?.tb_instalacao || '',
    tt_operacaoaccao: initialTask?.tt_operacaoaccao || '',
    tt_operacaomodo: initialTask?.tt_operacaomodo || 1,
    tt_operacaodia: initialTask?.tt_operacaodia || 1,
    ts_operador1: initialTask?.ts_operador1 || '',
    ts_operador2: initialTask?.ts_operador2 || ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(!!initialTask?.ts_operador2);
  const [saving, setSaving] = useState(false);

  // ============================================================
  // AUTO-SAVE EM LOCALSTORAGE
  // ============================================================

  useEffect(() => {
    // Carregar draft ao montar
    const draft = localStorage.getItem('operation-form-draft');
    if (draft && !initialTask) {
      try {
        const parsed = JSON.parse(draft);
        setFormData(parsed);
      } catch (e) {
        console.error('Erro ao carregar draft:', e);
      }
    }
  }, [initialTask]);

  useEffect(() => {
    // Guardar draft ao alterar (debounced)
    const timer = setTimeout(() => {
      if (!initialTask) {
        localStorage.setItem('operation-form-draft', JSON.stringify(formData));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, initialTask]);

  // ============================================================
  // VALIDAÇÃO POR CAMPO
  // ============================================================

  const validateField = (fieldName, value) => {
    const newErrors = { ...errors };

    switch (fieldName) {
      case 'tb_instalacao':
        if (!value) {
          newErrors.tb_instalacao = 'Instalação é obrigatória';
        } else {
          delete newErrors.tb_instalacao;
        }
        break;

      case 'tt_operacaoaccao':
        if (!value) {
          newErrors.tt_operacaoaccao = 'Ação é obrigatória';
        } else {
          delete newErrors.tt_operacaoaccao;
        }
        break;

      case 'ts_operador1':
        if (!value) {
          newErrors.ts_operador1 = 'Operador principal é obrigatório';
        } else {
          delete newErrors.ts_operador1;
        }
        break;

      case 'ts_operador2':
        if (value && value === formData.ts_operador1) {
          newErrors.ts_operador2 = 'Deve ser diferente do operador principal';
        } else {
          delete newErrors.ts_operador2;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep = (step) => {
    switch (step) {
      case 0: // Instalação
        return validateField('tb_instalacao', formData.tb_instalacao);
      case 1: // Operação
        return validateField('tt_operacaoaccao', formData.tt_operacaoaccao);
      case 2: // Operadores
        return validateField('ts_operador1', formData.ts_operador1) &&
          (!formData.ts_operador2 || validateField('ts_operador2', formData.ts_operador2));
      case 3: // Revisão
        return Object.keys(errors).length === 0;
      default:
        return true;
    }
  };

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));

    // Validar em tempo real se campo já foi tocado
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleBlur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    // Validar tudo
    const allValid = validateStep(0) && validateStep(1) && validateStep(2);

    if (!allValid) {
      return;
    }

    setSaving(true);
    try {
      // Preparar dados
      const cleanData = {
        ...formData,
        tt_operacaomodo: parseInt(formData.tt_operacaomodo, 10),
        tb_instalacao: parseInt(formData.tb_instalacao, 10),
        tt_operacaodia: parseInt(formData.tt_operacaodia, 10),
        tt_operacaoaccao: parseInt(formData.tt_operacaoaccao, 10),
        ts_operador1: parseInt(formData.ts_operador1, 10),
        ts_operador2: formData.ts_operador2 ? parseInt(formData.ts_operador2, 10) : null
      };

      await onSubmit(cleanData);

      // Limpar draft
      localStorage.removeItem('operation-form-draft');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // PREPARAR DADOS PARA SELECTS
  // ============================================================

  const installations = [
    ...(metaData?.etar || []).map(e => ({ id: e.pk, name: e.nome, type: 'ETAR' })),
    ...(metaData?.ee || []).map(e => ({ id: e.pk, name: e.nome, type: 'EE' }))
  ];

  const operators = metaData?.operators || [];
  const actions = metaData?.operacaoaccao || [];
  const modes = metaData?.operacamodo || [];
  const days = metaData?.operacaodia || [];

  // ============================================================
  // RENDER STEP CONTENT
  // ============================================================

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Instalação
        return (
          <Box>
            <FormControl
              fullWidth
              error={touched.tb_instalacao && !!errors.tb_instalacao}
              sx={{ mb: 3 }}
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
                      <Chip size="small" label={inst.type} />
                      {inst.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              {touched.tb_instalacao && errors.tb_instalacao && (
                <FormHelperText>{errors.tb_instalacao}</FormHelperText>
              )}
            </FormControl>
          </Box>
        );

      case 1: // Operação
        return (
          <Box>
            <FormControl
              fullWidth
              error={touched.tt_operacaoaccao && !!errors.tt_operacaoaccao}
              sx={{ mb: 3 }}
            >
              <InputLabel>Ação *</InputLabel>
              <Select
                value={formData.tt_operacaoaccao}
                onChange={handleChange('tt_operacaoaccao')}
                onBlur={handleBlur('tt_operacaoaccao')}
                label="Ação *"
              >
                {actions.map(action => (
                  <MenuItem key={action.pk} value={action.pk}>
                    {action.name}
                  </MenuItem>
                ))}
              </Select>
              {touched.tt_operacaoaccao && errors.tt_operacaoaccao && (
                <FormHelperText>{errors.tt_operacaoaccao}</FormHelperText>
              )}
            </FormControl>

            {/* Opções avançadas (colapsável) */}
            <Box mb={2}>
              <Button
                startIcon={showAdvanced ? <ExpandLess /> : <ExpandMore />}
                onClick={() => setShowAdvanced(!showAdvanced)}
                size="small"
              >
                Opções Avançadas
              </Button>
            </Box>

            <Collapse in={showAdvanced}>
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Modo</InputLabel>
                  <Select
                    value={formData.tt_operacaomodo}
                    onChange={handleChange('tt_operacaomodo')}
                    label="Modo"
                  >
                    {modes.map(mode => (
                      <MenuItem key={mode.pk} value={mode.pk}>
                        {mode.value}
                      </MenuItem>
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
                    {days.map(day => (
                      <MenuItem key={day.pk} value={day.pk}>
                        {day.value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Collapse>
          </Box>
        );

      case 2: // Operadores
        return (
          <Box>
            <FormControl
              fullWidth
              error={touched.ts_operador1 && !!errors.ts_operador1}
              sx={{ mb: 3 }}
            >
              <InputLabel>Operador Principal *</InputLabel>
              <Select
                value={formData.ts_operador1}
                onChange={handleChange('ts_operador1')}
                onBlur={handleBlur('ts_operador1')}
                label="Operador Principal *"
              >
                {operators.map(op => (
                  <MenuItem key={op.pk} value={op.pk}>
                    {op.name}
                  </MenuItem>
                ))}
              </Select>
              {touched.ts_operador1 && errors.ts_operador1 && (
                <FormHelperText>{errors.ts_operador1}</FormHelperText>
              )}
            </FormControl>

            <FormControl
              fullWidth
              error={touched.ts_operador2 && !!errors.ts_operador2}
            >
              <InputLabel>Operador Secundário (opcional)</InputLabel>
              <Select
                value={formData.ts_operador2}
                onChange={handleChange('ts_operador2')}
                onBlur={handleBlur('ts_operador2')}
                label="Operador Secundário (opcional)"
              >
                <MenuItem value="">
                  <em>Nenhum</em>
                </MenuItem>
                {operators
                  .filter(op => op.pk !== formData.ts_operador1)
                  .map(op => (
                    <MenuItem key={op.pk} value={op.pk}>
                      {op.name}
                    </MenuItem>
                  ))}
              </Select>
              {touched.ts_operador2 && errors.ts_operador2 && (
                <FormHelperText>{errors.ts_operador2}</FormHelperText>
              )}
            </FormControl>
          </Box>
        );

      case 3: // Revisão
        const selectedInst = installations.find(i => i.id === parseInt(formData.tb_instalacao));
        const selectedAction = actions.find(a => a.pk === parseInt(formData.tt_operacaoaccao));
        const selectedOp1 = operators.find(o => o.pk === parseInt(formData.ts_operador1));
        const selectedOp2 = formData.ts_operador2
          ? operators.find(o => o.pk === parseInt(formData.ts_operador2))
          : null;

        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Reveja as informações antes de criar a meta
            </Alert>

            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Instalação
                    </Typography>
                    <Typography variant="body1">
                      {selectedInst?.name} ({selectedInst?.type})
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Ação
                    </Typography>
                    <Typography variant="body1">
                      {selectedAction?.name}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Operadores
                    </Typography>
                    <Typography variant="body1">
                      {selectedOp1?.name}
                      {selectedOp2 && ` + ${selectedOp2.name}`}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================

  return (
    <Box sx={{ width: '100%' }}>
      {/* Stepper */}
      <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel
              icon={step.icon}
              optional={
                index === 3 ? (
                  <Typography variant="caption">Último passo</Typography>
                ) : null
              }
            >
              {step.label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Descrição do passo */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {steps[currentStep].description}
      </Typography>

      {/* Conteúdo do passo */}
      <Box sx={{ minHeight: 200, mb: 3 }}>
        {renderStepContent()}
      </Box>

      {/* Botões de navegação */}
      <Box display="flex" justifyContent="space-between">
        <Button
          disabled={currentStep === 0}
          onClick={handleBack}
          startIcon={<NavigateBefore />}
        >
          Voltar
        </Button>

        <Box display="flex" gap={1}>
          <Button onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>

          {currentStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={saving || Object.keys(errors).length > 0}
              startIcon={<Check />}
            >
              {saving ? 'A guardar...' : initialTask ? 'Atualizar' : 'Criar Meta'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<NavigateNext />}
              disabled={!validateStep(currentStep)}
            >
              Próximo
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ProgressiveTaskFormV2;
