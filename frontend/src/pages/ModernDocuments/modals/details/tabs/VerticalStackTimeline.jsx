import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Stepper,
    Step,
    StepLabel,
    useTheme,
    Alert,
    Tooltip,
    IconButton,
    Popover,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Chip
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    RadioButtonChecked as CurrentIcon,
    CircleOutlined as PendingIcon,
    Timeline as TimelineIcon,
    InfoOutlined as InfoIcon,
    ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { getValidTransitions } from '../../../utils/workflowUtils';

/**
 * Processa os dados do timeline e retorna estrutura organizada (versão simples)
 */
const getSimpleTimeline = (document, metaData, steps) => {
    console.log('🔍 Simple Timeline - Input:', {
        document_what: document.what,
        steps_count: steps.length,
        current_step: document.what
    });

    // Função auxiliar para encontrar step data
    const findStepData = (whatValue) => {
        if (!whatValue) return null;
        const byPk = metaData.what?.find(s => s.pk === whatValue);
        if (byPk) return byPk;
        const byName = metaData.what?.find(s => s.step === whatValue);
        if (byName) return byName;
        const byNameInsensitive = metaData.what?.find(s =>
            s.step?.toUpperCase() === String(whatValue).toUpperCase()
        );
        return byNameInsensitive || null;
    };

    // Processar passos executados - ORDENAR POR 'ord' em vez de data
    const executedSteps = steps
        .filter(step => step.what !== null && step.what !== undefined && step.what !== '')
        .sort((a, b) => {
            // Primeiro critério: ordenar por 'ord'
            if (a.ord !== undefined && b.ord !== undefined) {
                return a.ord - b.ord;
            }
            // Se não houver 'ord', usar data como fallback
            const parseDate = (dateStr) => {
                try {
                    return new Date(dateStr.replace(' às ', ' '));
                } catch (e) {
                    return new Date(dateStr);
                }
            };
            return parseDate(a.when_start) - parseDate(b.when_start);
        });

    // Criar mapa de passos únicos executados
    const uniqueExecutedSteps = new Map();

    executedSteps.forEach(step => {
        const stepData = findStepData(step.what);
        if (stepData) {
            const stepKey = stepData.pk;
            const parseDate = (dateStr) => {
                try {
                    return new Date(dateStr.replace(' às ', ' '));
                } catch (e) {
                    return new Date(dateStr);
                }
            };

            if (!uniqueExecutedSteps.has(stepKey) ||
                parseDate(step.when_start) > parseDate(uniqueExecutedSteps.get(stepKey)?.when || '1900-01-01')) {

                uniqueExecutedSteps.set(stepKey, {
                    stepId: stepData.pk,
                    stepName: stepData.step,
                    when: step.when_start,
                    who: step.who,
                    memo: step.memo,
                    status: 'completed',
                    originalStep: step
                });
            }
        }
    });

    // Construir timeline base
    const timelineSteps = [];

    // PRIMEIRO: Sempre adicionar ENTRADA no início (independente do ord)
    const entradaStep = metaData.what?.find(s =>
        s.step?.toUpperCase().includes('ENTRADA')
    );
    
    let entradaStepData = null;
    if (entradaStep) {
        // Procurar dados da ENTRADA nos steps executados
        const entradaExecuted = uniqueExecutedSteps.get(entradaStep.pk);
        if (entradaExecuted) {
            entradaStepData = {
                ...entradaExecuted,
                order: -1 // Sempre primeiro
            };
            timelineSteps.push(entradaStepData);
        } else {
            // Se ENTRADA não foi executada, criar com dados do documento
            const entradaDate = document.created_at || document.when_start;
            entradaStepData = {
                stepId: entradaStep.pk,
                stepName: entradaStep.step,
                status: 'completed',
                when: entradaDate,
                isEntrada: true,
                order: -1
            };
            timelineSteps.push(entradaStepData);
        }
    }

    // SEGUNDO: Adicionar outros steps executados (exceto ENTRADA) pela ordem lógica do workflow
    // Usar a ordem dos metadados (metaData.what) como referência para ordem lógica
    const metaStepsOrder = metaData.what || [];
    
    metaStepsOrder.forEach((metaStep, index) => {
        // Pular ENTRADA pois já foi adicionada
        if (metaStep.step?.toUpperCase().includes('ENTRADA')) {
            return;
        }
        
        // Verificar se este step foi executado
        const executedStepData = uniqueExecutedSteps.get(metaStep.pk);
        if (executedStepData) {
            timelineSteps.push({
                ...executedStepData,
                status: 'completed',
                order: index // Usar índice dos metadados como ordem lógica
            });
        }
    });

    // TERCEIRO: Identificar e marcar o step atual
    const currentStepData = findStepData(document.what);
    if (currentStepData) {
        const currentStepIndex = timelineSteps.findIndex(step => step.stepId === currentStepData.pk);
        
        if (currentStepIndex !== -1) {
            // Se já existe, marcar como atual
            timelineSteps[currentStepIndex].status = 'current';
        } else {
            // Se não existe, adicionar
            const currentStepMetaIndex = metaStepsOrder.findIndex(meta => meta.pk === currentStepData.pk);
            timelineSteps.push({
                stepId: currentStepData.pk,
                stepName: currentStepData.step,
                status: 'current',
                order: currentStepMetaIndex !== -1 ? currentStepMetaIndex : 9999
            });
        }
    }

    // Ordenar por ordem lógica (order)
    timelineSteps.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Obter próximos passos possíveis - APENAS O PRIMEIRO
    const validTransitions = getValidTransitions(document, metaData);
    const existingStepIds = new Set(timelineSteps.map(s => s.stepId));

    const nextStepIds = validTransitions
        .map(t => t.to_step_pk)
        .filter(stepId => !existingStepIds.has(stepId));

    const nextStepsData = nextStepIds
        .map(stepId => metaData.what?.find(s => s.pk === stepId))
        .filter(Boolean);

    // Adicionar APENAS a primeira opção como próximo step (se não há steps futuros já marcados como pending)
    const hasPendingSteps = timelineSteps.some(step => step.status === 'pending');
    
    if (nextStepsData.length > 0 && !hasPendingSteps) {
        const nextStep = nextStepsData[0]; // Só pega a primeira opção
        timelineSteps.push({
            stepId: nextStep.pk,
            stepName: nextStep.step,
            status: 'pending',
            type: 'next'
        });
    }

    return {
        steps: timelineSteps,
        completed: timelineSteps.filter(s => s.status === 'completed').length,
        total: timelineSteps.length,
        current: timelineSteps.find(s => s.status === 'current'),
        totalOptionsAvailable: nextStepsData.length, // Para mostrar na mensagem
        allNextOptions: nextStepsData // Todas as opções para o tooltip
    };
};

/**
 * Componente de Timeline Simples (sem ramificações)
 * 
 * @param {Object} props
 * @param {Object} props.document - Documento atual
 * @param {Object} props.metaData - Metadados do workflow
 * @param {Array} props.steps - Array de passos executados
 * @param {string} props.title - Título customizado (opcional)
 * @param {Object} props.sx - Estilos customizados (opcional)
 */
const VerticalStackTimeline = ({ 
    document, 
    metaData, 
    steps = [],
    title = "Percurso do Documento",
    sx = {}
}) => {
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState(null);

    const handlePopoverOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    // Validação de props obrigatórias
    if (!document || !metaData?.what) {
        return (
            <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1, ...sx }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TimelineIcon sx={{ mr: 1 }} color="primary" />
                    {title}
                </Typography>
                <Alert severity="info">
                    Dados insuficientes para gerar o timeline.
                </Alert>
            </Paper>
        );
    }

    const timeline = getSimpleTimeline(document, metaData, steps);

    if (!timeline.steps?.length) {
        return (
            <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1, ...sx }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TimelineIcon sx={{ mr: 1 }} color="primary" />
                    {title}
                </Typography>
                <Alert severity="info">
                    Nenhum histórico disponível para este documento.
                </Alert>
            </Paper>
        );
    }

    const activeStep = timeline.steps.findIndex(s => s.status === 'current');

    return (
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1, ...sx }}>
            {/* Cabeçalho */}
            <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TimelineIcon sx={{ mr: 1 }} color="primary" />
                    {title}
                </Typography>
            </Box>

            {/* Timeline Simples */}
            <Box sx={{
                width: '100%',
                pb: 1,
                overflow: 'hidden'
            }}>
                <Stepper
                    activeStep={activeStep}
                    orientation="horizontal"
                    alternativeLabel
                    sx={{
                        width: '100%',
                        '& .MuiStepLabel-root': {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: 0,
                        },
                        '& .MuiStepLabel-iconContainer': {
                            paddingRight: 0,
                            paddingLeft: 0,
                            marginBottom: '4px',
                            display: 'flex',
                            justifyContent: 'center',
                        },
                        '& .MuiStepLabel-labelContainer': {
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                        },
                        '& .MuiStepLabel-label': {
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            maxWidth: '80px',
                            wordWrap: 'break-word',
                            textAlign: 'center',
                            lineHeight: 1.1,
                            marginTop: 0,
                        },
                        '& .MuiStepConnector-line': {
                            borderTopWidth: 2,
                            borderStyle: 'solid',
                        },
                        '& .MuiStep-root': {
                            padding: 0,
                            position: 'relative',
                            flex: 1,
                            minWidth: 0,
                        },
                        '& .MuiStepConnector-root': {
                            flex: '1 1 auto',
                            marginLeft: '2px',
                            marginRight: '2px'
                        }
                    }}
                >
                    {timeline.steps.map((step, index) => {
                        const isCompleted = step.status === 'completed';
                        const isCurrent = step.status === 'current';
                        const isPending = step.status === 'pending';

                        return (
                            <Step
                                key={`${step.stepId}-${index}`}
                                completed={isCompleted}
                                active={isCurrent}
                            >
                                <StepLabel
                                    icon={
                                        <Box sx={{ 
                                            display: 'flex', 
                                            justifyContent: 'center', 
                                            alignItems: 'center',
                                            width: '20px',
                                            height: '20px'
                                        }}>
                                            {isCompleted ? (
                                                <CheckCircleIcon
                                                    sx={{
                                                        color: theme.palette.success.main,
                                                        fontSize: '1.25rem'
                                                    }}
                                                />
                                            ) : isCurrent ? (
                                                <CurrentIcon
                                                    sx={{
                                                        color: theme.palette.primary.main,
                                                        fontSize: '1.25rem'
                                                    }}
                                                />
                                            ) : (
                                                <PendingIcon
                                                    sx={{
                                                        color: theme.palette.grey[400],
                                                        fontSize: '1.25rem'
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    }
                                >
                                    <Box sx={{ 
                                        textAlign: 'center', 
                                        width: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center'
                                    }}>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: 'block',
                                                fontWeight: isCurrent ? 600 : 400,
                                                color: isCurrent ? 'primary.main' : 'text.primary',
                                                fontSize: '0.7rem',
                                                textAlign: 'center',
                                                lineHeight: 1.1,
                                                marginBottom: '4px'
                                            }}
                                        >
                                            {step.stepName}
                                        </Typography>

                                        {step.when && (
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    display: 'block',
                                                    color: 'text.secondary',
                                                    fontSize: '0.6rem',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                {step.when.includes('às') ?
                                                    step.when.split(' às ')[0] :
                                                    new Date(step.when).toLocaleDateString('pt-PT')
                                                }
                                            </Typography>
                                        )}
                                    </Box>
                                </StepLabel>
                            </Step>
                        );
                    })}
                </Stepper>
            </Box>

            {/* Informação sobre múltiplas opções com tooltip/popover */}
            {timeline.totalOptionsAvailable > 1 && (
                <Box sx={{ 
                    mt: 2, 
                    p: 1.5, 
                    bgcolor: 'info.50', 
                    borderRadius: 1, 
                    borderLeft: '4px solid', 
                    borderColor: 'info.main',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1
                }}>
                    <Typography variant="body2" color="text.secondary">
                        <strong>{timeline.totalOptionsAvailable} opções disponíveis</strong> para o próximo movimento
                    </Typography>
                    
                    <Tooltip title="Ver todas as opções disponíveis" arrow>
                        <IconButton
                            size="small"
                            onClick={handlePopoverOpen}
                            sx={{
                                color: 'info.main',
                                '&:hover': {
                                    bgcolor: 'info.100'
                                }
                            }}
                        >
                            <InfoIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Popover
                        open={open}
                        anchorEl={anchorEl}
                        onClose={handlePopoverClose}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'center',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'center',
                        }}
                        PaperProps={{
                            sx: {
                                maxWidth: 300,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                                border: '1px solid #e0e0e0'
                            }
                        }}
                    >
                        <Box sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary' }}>
                                Próximas Opções Disponíveis:
                            </Typography>
                            <List dense sx={{ py: 0 }}>
                                {timeline.allNextOptions?.map((option, index) => (
                                    <ListItem 
                                        key={option.pk} 
                                        sx={{ 
                                            px: 0, 
                                            py: 0.5,
                                            borderRadius: 1,
                                            '&:hover': {
                                                bgcolor: 'grey.50'
                                            }
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 32 }}>
                                            <ArrowForwardIcon 
                                                fontSize="small" 
                                                color={index === 0 ? 'primary' : 'action'} 
                                            />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                            fontSize: '0.8rem',
                                                            fontWeight: index === 0 ? 600 : 500,
                                                            color: index === 0 ? 'primary.main' : 'text.primary'
                                                        }}
                                                    >
                                                        {option.step}
                                                    </Typography>
                                                    {index === 0 && (
                                                        <Chip 
                                                            label="Apresentada" 
                                                            size="small" 
                                                            color="primary" 
                                                            variant="outlined"
                                                            sx={{ 
                                                                height: 18, 
                                                                fontSize: '0.65rem',
                                                                '& .MuiChip-label': { px: 0.5 }
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                                A opção "{timeline.allNextOptions?.[0]?.step}" está a ser apresentada na cronologia.
                            </Typography>
                        </Box>
                    </Popover>
                </Box>
            )}
        </Paper>
    );
};

export default VerticalStackTimeline;