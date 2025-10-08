import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useMediaQuery,
  useTheme,
  Slide,
  IconButton,
  AppBar,
  Toolbar
} from '@mui/material';
import { CheckCircle, Close, ArrowBack } from '@mui/icons-material';
import { getAnalysisParameters, getReferenceOptions } from '../../services/operationsApi';
import {
  OPERATION_TYPES,
  getOperationTypeConfig,
  getModalTitle,
  isLaboratoryParameter
} from '../../constants/operationTypes';
import MESSAGES from '../../constants/messages';

// Transição slide-up para mobile
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/**
 * DIÁLOGO DE CONCLUSÃO DE TAREFAS
 *
 * ✅ MOBILE FIRST - FullScreen em smartphones
 * ✅ Formulário dinâmico por tipo de operação
 * ✅ Validação de amostras laboratoriais
 * ✅ 100% Português de Portugal
 * ✅ Acessibilidade completa
 *
 * Tipos de operação:
 * - Type 1: Numérico
 * - Type 2: Texto/Observações
 * - Type 3: Referência (dropdown)
 * - Type 4: Boolean (confirmação)
 * - Type 5: Análise (local + laboratorial)
 */
const TaskCompletionDialog = ({ open, onClose, task, onComplete }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [valuetext, setValuetext] = useState('');
  const [booleanValue, setBooleanValue] = useState(false);
  const [analysisParams, setAnalysisParams] = useState([]);
  const [analysisValues, setAnalysisValues] = useState({});
  const [referenceOptions, setReferenceOptions] = useState([]);
  const [selectedReference, setSelectedReference] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Determinar o tipo de input baseado na ação
  const actionType = task?.operacao_tipo || task?.tt_operacaotipo || 1; // Default to type 1 if not specified

  // Carregar parâmetros de análise para type 5
  useEffect(() => {
    if (open && actionType === 5 && task?.pk) {
      loadAnalysisParameters();
    }
  }, [open, actionType, task?.pk]);

  // Carregar opções de referência para type 3
  useEffect(() => {
    if (open && actionType === 3 && task?.tt_operacaoaccao_refobj) {
      loadReferenceOptions();
    }
  }, [open, actionType, task?.tt_operacaoaccao_refobj]);

  const loadAnalysisParameters = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = await getAnalysisParameters(task.pk);
      setAnalysisParams(params || []);
      // Inicializar valores de análise
      // Se já existe resultado, preencher com o valor existente (a posteriori)
      // Caso contrário, deixar vazio para preencher no local
      const initialValues = {};
      params.forEach((param) => {
        const key = `${param.tt_analiseponto}_${param.tt_analiseparam}`;
        initialValues[key] = param.resultado || '';
      });
      setAnalysisValues(initialValues);
    } catch (err) {
      console.error('Erro ao carregar parâmetros de análise:', err);
      setError(MESSAGES.ERROR.LOAD_ANALYTICS);
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceOptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const options = await getReferenceOptions(task.tt_operacaoaccao_refobj);
      setReferenceOptions(options || []);
    } catch (err) {
      console.error('Erro ao carregar opções de referência:', err);
      setError('Não foi possível carregar as opções de referência');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisChange = (key, value) => {
    setAnalysisValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReferenceChange = (event) => {
    const selectedPk = parseInt(event.target.value);
    const selected = referenceOptions.find(opt => opt.pk === selectedPk);
    setSelectedReference(selected);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // Para tipo 5 (análise), verificar se há parâmetros de laboratório
      // e alertar o operador para identificar as amostras
      if (actionType === 5) {
        const laboratoryParams = analysisParams.filter(param => {
          const isLaboratory = isLaboratoryParameter(param.tt_analiseforma);
          const hasResult = param.resultado !== null && param.resultado !== '';
          return isLaboratory && !hasResult;
        });

        if (laboratoryParams.length > 0) {
          const sampleDetails = laboratoryParams.map(p =>
            `  • ID ${p.id_analise}: ${p.tt_analiseponto} - ${p.tt_analiseparam}`
          ).join('\n');

          const confirmed = window.confirm(
            `⚠️ ATENÇÃO - IDENTIFICAÇÃO DE AMOSTRAS\n\n` +
            `Esta tarefa inclui ${laboratoryParams.length} amostra(s) para análise laboratorial.\n\n` +
            `IDENTIFIQUE AS AMOSTRAS COM OS SEGUINTES IDs:\n\n${sampleDetails}\n\n` +
            `Confirma que as amostras foram devidamente identificadas e recolhidas?`
          );

          if (!confirmed) {
            setSubmitting(false);
            return;
          }
        }
      }

      let completionData = {};

      switch (actionType) {
        case 1: // number
          const numValue = parseFloat(valuetext);
          if (isNaN(numValue)) {
            setError(MESSAGES.ERROR.INVALID_NUMBER);
            setSubmitting(false);
            return;
          }
          completionData = {
            valuetext: numValue.toString(),
            type: 1,
          };
          break;

        case 2: // text
          if (!valuetext.trim()) {
            setError(MESSAGES.ERROR.INVALID_TEXT);
            setSubmitting(false);
            return;
          }
          completionData = {
            valuetext: valuetext.trim(),
            type: 2,
          };
          break;

        case 3: // referencia
          if (!selectedReference) {
            setError(MESSAGES.ERROR.INVALID_SELECTION);
            setSubmitting(false);
            return;
          }
          completionData = {
            valuetext: selectedReference.pk,  // Guardar apenas o pk no valuetext
            type: 3,
          };
          break;

        case 4: // boolean
          completionData = {
            valuetext: booleanValue ? '1' : '0',
            type: 4,
          };
          break;

        case 5: // analise
          // Verificar se todos os parâmetros pendentes são de laboratório
          const pendingLabParams = analysisParams.filter(param => {
            const hasResult = param.resultado !== null && param.resultado !== '';
            return !hasResult;
          });

          const allAreLaboratory = pendingLabParams.every(param =>
            isLaboratoryParameter(param.tt_analiseforma)
          );

          // Se todos são laboratório, validar checkbox
          if (allAreLaboratory && pendingLabParams.length > 0) {
            if (!booleanValue) {
              setError('Por favor, confirme que a recolha foi realizada');
              setSubmitting(false);
              return;
            }
            // Só laboratório: guardar boolean no valuetext
            completionData = {
              valuetext: '1',
              type: 5,
              analysisData: [], // Não há valores para enviar
            };
          } else {
            // Tem parâmetros locais: validar que foram preenchidos
            const emptyRequiredParams = analysisParams.filter(param => {
              const key = `${param.tt_analiseponto}_${param.tt_analiseparam}`;
              const hasResult = param.resultado !== null && param.resultado !== '';
              const isLaboratory = isLaboratoryParameter(param.tt_analiseforma);
              const isEmpty = !analysisValues[key] || analysisValues[key] === '';

              return isEmpty && !isLaboratory && !hasResult;
            });

            if (emptyRequiredParams.length > 0) {
              setError('Por favor, preencha todos os parâmetros de análise no local');
              setSubmitting(false);
              return;
            }

            // Transformar analysisValues para incluir id_analise
            const analysisDataWithIds = analysisParams.map(param => {
              const key = `${param.tt_analiseponto}_${param.tt_analiseparam}`;
              return {
                id_analise: param.id_analise,
                resultado: analysisValues[key] || null
              };
            }).filter(item => item.resultado);

            // Criar resumo dos valores para o valuetext
            const analysisValuesSummary = analysisDataWithIds
              .map(item => item.resultado)
              .join(', ');

            completionData = {
              valuetext: analysisValuesSummary,
              type: 5,
              analysisData: analysisDataWithIds,
            };
          }
          break;

        default:
          setError('Tipo de ação não reconhecido');
          setSubmitting(false);
          return;
      }

      await onComplete(task.pk, completionData);
      handleClose();
    } catch (err) {
      console.error('Erro ao completar tarefa:', err);
      setError(err.message || 'Erro ao completar tarefa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setValuetext('');
    setBooleanValue(false);
    setAnalysisParams([]);
    setAnalysisValues({});
    setReferenceOptions([]);
    setSelectedReference(null);
    setError(null);
    onClose();
  };

  const renderInputField = () => {
    switch (actionType) {
      case 1: // number
        return (
          <TextField
            fullWidth
            label={MESSAGES.FORMS.NUMERIC_VALUE}
            type="number"
            value={valuetext}
            onChange={(e) => setValuetext(e.target.value)}
            placeholder={MESSAGES.FORMS.NUMERIC_PLACEHOLDER}
            autoFocus={!isMobile}
            inputProps={{
              step: 'any',
              inputMode: 'decimal',
              pattern: '[0-9]*'
            }}
            size={isMobile ? 'medium' : 'small'}
          />
        );

      case 2: // text
        return (
          <TextField
            fullWidth
            label={MESSAGES.FORMS.OBSERVATIONS}
            multiline
            rows={isMobile ? 6 : 4}
            value={valuetext}
            onChange={(e) => setValuetext(e.target.value)}
            placeholder={MESSAGES.FORMS.OBSERVATIONS_PLACEHOLDER}
            autoFocus={!isMobile}
            size={isMobile ? 'medium' : 'small'}
          />
        );

      case 3: // referencia
        if (loading) {
          return (
            <Box display="flex" justifyContent="center" py={3} role="status" aria-live="polite">
              <CircularProgress aria-label={MESSAGES.LOADING.DEFAULT} />
            </Box>
          );
        }

        return (
          <FormControl fullWidth size={isMobile ? 'medium' : 'small'}>
            <InputLabel id="reference-select-label">{MESSAGES.FORMS.SELECT_OPTION}</InputLabel>
            <Select
              labelId="reference-select-label"
              value={selectedReference?.pk || ''}
              onChange={handleReferenceChange}
              label={MESSAGES.FORMS.SELECT_OPTION}
              autoFocus={!isMobile}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: isMobile ? 300 : 400
                  }
                }
              }}
            >
              {referenceOptions.map((option) => (
                <MenuItem key={option.pk} value={option.pk}>
                  {option.value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 4: // boolean
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

      case 5: // analise
        if (loading) {
          return (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress />
            </Box>
          );
        }

        // Verificar se todos os parâmetros pendentes são de laboratório
        const pendingParams = analysisParams.filter(param => {
          const hasResult = param.resultado !== null && param.resultado !== '';
          return !hasResult;
        });

        const allPendingAreLaboratory = pendingParams.every(param =>
          param.tt_analiseforma && param.tt_analiseforma.toLowerCase().includes('laborat')
        );

        return (
          <Stack spacing={2}>
            {/* Mostrar checkbox apenas se todos os parâmetros pendentes são de laboratório */}
            {allPendingAreLaboratory && pendingParams.length > 0 && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={booleanValue}
                    onChange={(e) => setBooleanValue(e.target.checked)}
                    color="primary"
                  />
                }
                label="Recolha realizada"
              />
            )}

            {analysisParams.length > 0 && (
              <>
                <Divider />
                <Typography variant="subtitle2" color="text.secondary">
                  Parâmetros de Análise
                </Typography>
                {analysisParams.map((param) => {
                  const key = `${param.tt_analiseponto}_${param.tt_analiseparam}`;
                  const hasResult = param.resultado !== null && param.resultado !== '';
                  const isLaboratory = isLaboratoryParameter(param.tt_analiseforma);
                  const isReadonly = hasResult || isLaboratory;

                  let placeholder = 'Valor medido no local';
                  let helperText = `ID: ${param.id_analise} | Forma: ${param.tt_analiseforma}`;

                  if (hasResult) {
                    placeholder = 'Resultado já registado';
                    helperText += ' | ✓ Completo';
                  } else if (isLaboratory) {
                    placeholder = 'Aguarda análise laboratorial';
                    helperText += ' | Recolha de amostra';
                  }

                  return (
                    <Box key={key}>
                      <TextField
                        fullWidth
                        label={`${param.tt_analiseponto} - ${param.tt_analiseparam}`}
                        value={analysisValues[key] || ''}
                        onChange={(e) => handleAnalysisChange(key, e.target.value)}
                        placeholder={placeholder}
                        type="number"
                        inputProps={{ step: 'any' }}
                        size="small"
                        disabled={isReadonly}
                        helperText={helperText}
                      />
                    </Box>
                  );
                })}
              </>
            )}

            {analysisParams.length === 0 && !loading && (
              <Alert severity="info">
                Não há parâmetros de análise definidos para esta operação
              </Alert>
            )}
          </Stack>
        );

      default:
        return (
          <Alert severity="warning">
            Tipo de ação não reconhecido (Type: {actionType})
          </Alert>
        );
    }
  };

  const getDialogTitle = () => {
    return getModalTitle(actionType);
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
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100vh' : '90vh'
        }
      }}
    >
      {/* AppBar mobile para fechar */}
      {isMobile && (
        <AppBar
          position="static"
          elevation={1}
          sx={{ bgcolor: theme.palette.success.main }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={handleClose}
              disabled={submitting}
              aria-label={MESSAGES.UI.CLOSE}
            >
              <ArrowBack />
            </IconButton>
            <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>
              {MESSAGES.FORMS.COMPLETE_TASK}
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* DialogTitle para desktop */}
      {!isMobile && (
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircle color="success" />
            {getDialogTitle()}
          </Box>
          {task && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {task.description || task.acao_operacao}
            </Typography>
          )}
        </DialogTitle>
      )}

      <DialogContent sx={{ px: isMobile ? 2 : 3 }}>
        {/* Título mobile dentro do content */}
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

        <Box sx={{ mt: isMobile ? 0 : 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} role="alert">
              {error}
            </Alert>
          )}

          {renderInputField()}
        </Box>
      </DialogContent>

      <DialogActions sx={{
        px: isMobile ? 2 : 3,
        py: isMobile ? 2 : 1.5,
        gap: isMobile ? 1 : 0,
        flexDirection: isMobile ? 'column-reverse' : 'row'
      }}>
        <Button
          onClick={handleClose}
          disabled={submitting}
          startIcon={!isMobile && <Close />}
          fullWidth={isMobile}
          size={isMobile ? 'large' : 'medium'}
          aria-label={MESSAGES.UI.CANCEL}
        >
          {MESSAGES.UI.CANCEL}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="success"
          disabled={submitting || loading}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
          fullWidth={isMobile}
          size={isMobile ? 'large' : 'medium'}
          aria-label={MESSAGES.ACTIONS.COMPLETE_TASK}
        >
          {submitting ? MESSAGES.LOADING.COMPLETING : MESSAGES.ACTIONS.COMPLETE_TASK}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskCompletionDialog;
