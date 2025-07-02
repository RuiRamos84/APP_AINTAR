import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Skeleton,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    Divider,
    Chip,
    useTheme,
    LinearProgress,
    Alert
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    AccessTime as AccessTimeIcon,
    RadioButtonChecked as CurrentIcon,
    CircleOutlined as PendingIcon,
    Timeline as TimelineIcon
} from '@mui/icons-material';
import { getValidTransitions } from '../../../utils/workflowUtils';

/**
 * Timeline com opções verticais na mesma posição
 */
const getVerticalStackTimeline = (document, metaData, steps) => {
    console.log('🔍 Vertical Stack Timeline - Input:', {
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

    // Processar passos executados
    const executedSteps = steps
        .filter(step => step.what !== null && step.what !== undefined && step.what !== '')
        .sort((a, b) => {
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

    // Verificar ENTRADA
    const entradaStep = metaData.what?.find(s =>
        s.step?.toUpperCase().includes('ENTRADA')
    );
    const hasEntradaInSteps = Array.from(uniqueExecutedSteps.keys()).includes(entradaStep?.pk);

    if (entradaStep && !hasEntradaInSteps) {
        timelineSteps.push({
            stepId: entradaStep.pk,
            stepName: entradaStep.step,
            status: 'completed',
            when: document.created_at || document.when_start,
            isEntrada: true,
            order: 0
        });
    }

    // Adicionar passos executados
    Array.from(uniqueExecutedSteps.values()).forEach(stepDetails => {
        const isCurrentStep = stepDetails.stepId === document.what;
        const parseDate = (dateStr) => {
            try {
                return new Date(dateStr.replace(' às ', ' ')).getTime();
            } catch (e) {
                return new Date(dateStr).getTime();
            }
        };

        timelineSteps.push({
            ...stepDetails,
            status: isCurrentStep ? 'current' : 'completed',
            order: parseDate(stepDetails.when)
        });
    });

    // Adicionar passo atual se não existe
    const currentStepData = findStepData(document.what);
    const currentStepExists = timelineSteps.some(step => step.stepId === document.what);

    if (currentStepData && !currentStepExists) {
        timelineSteps.push({
            stepId: currentStepData.pk,
            stepName: currentStepData.step,
            status: 'current',
            order: Date.now()
        });
    }

    // Ordenar timeline
    timelineSteps.sort((a, b) => {
        if (a.isEntrada && !b.isEntrada) return -1;
        if (!a.isEntrada && b.isEntrada) return 1;
        return (a.order || 0) - (b.order || 0);
    });

    // Obter próximos passos possíveis
    const validTransitions = getValidTransitions(document, metaData);
    const existingStepIds = new Set(timelineSteps.map(s => s.stepId));

    const nextStepIds = validTransitions
        .map(t => t.to_step_pk)
        .filter(stepId => !existingStepIds.has(stepId));

    const nextStepsData = nextStepIds
        .map(stepId => metaData.what?.find(s => s.pk === stepId))
        .filter(Boolean);

    // ✨ CRIAR elemento especial para próximos passos
    let nextStepsElement = null;

    if (nextStepsData.length === 1) {
        // Uma única opção - step normal
        nextStepsElement = {
            stepId: nextStepsData[0].pk,
            stepName: nextStepsData[0].step,
            status: 'pending',
            type: 'single'
        };
        timelineSteps.push(nextStepsElement);
    } else if (nextStepsData.length > 1) {
        // Múltiplas opções - marcar o passo atual para mostrar ramificações
        const currentStepIndex = timelineSteps.findIndex(s => s.status === 'current');
        if (currentStepIndex !== -1) {
            timelineSteps[currentStepIndex] = {
                ...timelineSteps[currentStepIndex],
                type: 'multiple',
                options: nextStepsData.map(step => ({
                    stepId: step.pk,
                    stepName: step.step
                })),
                optionCount: nextStepsData.length
            };
        }
    }

    return {
        steps: timelineSteps,
        hasMultipleOptions: nextStepsData.length > 1,
        completed: timelineSteps.filter(s => s.status === 'completed').length,
        total: timelineSteps.length,
        current: timelineSteps.find(s => s.status === 'current'),
        nextOptionsCount: nextStepsData.length
    };
};

/**
 * Componente de Timeline com Stack Vertical
 */
const VerticalStackTimeline = ({ document, metaData, steps }) => {
    const theme = useTheme();

    if (!document || !metaData?.what) {
        return null;
    }

    const timeline = getVerticalStackTimeline(document, metaData, steps);

    if (!timeline.steps?.length) {
        return (
            <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TimelineIcon sx={{ mr: 1 }} color="primary" />
                    Percurso do Documento
                </Typography>
                <Alert severity="info">
                    Nenhum histórico disponível para este documento.
                </Alert>
            </Paper>
        );
    }

    const activeStep = timeline.steps.findIndex(s => s.status === 'current');
    const progressPercentage = timeline.completed > 0 ? (timeline.completed / timeline.total) * 100 : 0;

    // Calcular altura extra necessária para opções múltiplas
    const multipleOptionsStep = timeline.steps.find(s => s.type === 'multiple');
    const extraHeight = multipleOptionsStep ? (multipleOptionsStep.options.length - 1) * 60 : 0;

    return (
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1 }}>
            <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TimelineIcon sx={{ mr: 1 }} color="primary" />
                    Percurso do Documento
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Progresso: {timeline.completed} de {timeline.total} passos
                    </Typography>
                    <Box sx={{ flexGrow: 1 }}>
                        <LinearProgress
                            variant="determinate"
                            value={progressPercentage}
                            sx={{ height: 6, borderRadius: 3 }}
                        />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        {Math.round(progressPercentage)}%
                    </Typography>
                </Box>
            </Box>

            {/* Timeline com responsividade */}
            <Box sx={{
                overflowX: 'auto',
                pb: 1,
                minHeight: timeline.hasMultipleOptions ? '200px' : 'auto'
            }}>
                <Stepper
                    activeStep={activeStep}
                    orientation="horizontal"
                    alternativeLabel
                    sx={{
                        minWidth: `${timeline.steps.length * 120}px`, // Encolher para 120px
                        '& .MuiStepLabel-label': {
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            maxWidth: '100px',
                            wordWrap: 'break-word',
                            textAlign: 'center',
                            lineHeight: 1.1,
                            mt: 0.5 // Aproximar do ícone
                        },
                        '& .MuiStepConnector-line': {
                            borderTopWidth: 2,
                            borderStyle: 'solid'
                        },
                        '& .MuiStep-root': {
                            paddingLeft: '8px',  // Reduzir padding
                            paddingRight: '8px',
                        },
                        '& .MuiStepLabel-iconContainer': {
                            paddingRight: 0
                        }
                    }}
                >
                    {timeline.steps.map((step, index) => {
                        const isCompleted = step.status === 'completed';
                        const isCurrent = step.status === 'current';
                        const isMultiple = step.type === 'multiple';

                        return (
                            <Step
                                key={`${step.stepId}-${index}`}
                                completed={isCompleted}
                                active={isCurrent}
                            >
                                <StepLabel
                                    icon={
                                        isCompleted ? (
                                            <CheckCircleIcon
                                                sx={{
                                                    color: theme.palette.success.main,
                                                    fontSize: '1.25rem' // Reduzir tamanho
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
                                        )
                                    }
                                >
                                    <Box sx={{ textAlign: 'center', position: 'relative' }}>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: 'block',
                                                fontWeight: isCurrent ? 600 : 400,
                                                color: isCurrent ? 'primary.main' : 'text.primary',
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            {step.stepName}
                                        </Typography>

                                        {step.when && !isMultiple && (
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    display: 'block',
                                                    color: 'text.secondary',
                                                    fontSize: '0.65rem'
                                                }}
                                            >
                                                {step.when.includes('às') ?
                                                    step.when.split(' às ')[0] :
                                                    new Date(step.when).toLocaleDateString('pt-PT')
                                                }
                                            </Typography>
                                        )}

                                        {/* Ramificações alinhadas com o stepper */}
                                        {isMultiple && step.options && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: '-20px', // Alinhar com o ícone
                                                    left: '20px', // Começar após o ícone
                                                    zIndex: 10
                                                }}
                                            >
                                                <svg
                                                    width="200"
                                                    height="120"
                                                    viewBox="0 0 200 120"
                                                    style={{ overflow: 'visible' }}
                                                >
                                                    {step.options.map((option, optIndex) => {
                                                        const startX = 0;
                                                        const startY = 20; // Centro do ícone
                                                        const endX = 120;

                                                        // Distribuição centrada
                                                        const total = step.options.length;
                                                        let endY;

                                                        if (total === 1) {
                                                            endY = 20;
                                                        } else if (total === 2) {
                                                            endY = optIndex === 0 ? 5 : 35;
                                                        } else if (total === 3) {
                                                            endY = [5, 20, 35][optIndex];
                                                        } else {
                                                            const spacing = 30 / (total - 1);
                                                            endY = 5 + (optIndex * spacing);
                                                        }

                                                        return (
                                                            <g key={option.stepId}>
                                                                <line
                                                                    x1={startX}
                                                                    y1={startY}
                                                                    x2={endX}
                                                                    y2={endY}
                                                                    stroke={theme.palette.primary.main}
                                                                    strokeWidth="2"
                                                                />
                                                                <circle
                                                                    cx={endX}
                                                                    cy={endY}
                                                                    r="3"
                                                                    fill={theme.palette.primary.main}
                                                                />
                                                            </g>
                                                        );
                                                    })}
                                                </svg>

                                                {/* Opções alinhadas */}
                                                {step.options.map((option, optIndex) => {
                                                    const total = step.options.length;
                                                    let posY;

                                                    if (total === 1) {
                                                        posY = 20;
                                                    } else if (total === 2) {
                                                        posY = optIndex === 0 ? 5 : 35;
                                                    } else if (total === 3) {
                                                        posY = [5, 20, 35][optIndex];
                                                    } else {
                                                        const spacing = 30 / (total - 1);
                                                        posY = 5 + (optIndex * spacing);
                                                    }

                                                    return (
                                                        <Box
                                                            key={option.stepId}
                                                            sx={{
                                                                position: 'absolute',
                                                                top: `${posY - 10}px`,
                                                                left: '130px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 0.5
                                                            }}
                                                        >
                                                            <PendingIcon
                                                                sx={{
                                                                    color: theme.palette.grey[400],
                                                                    fontSize: '1.25rem',
                                                                    border: `1px solid ${theme.palette.primary.main}`,
                                                                    borderRadius: '50%',
                                                                    bgcolor: 'white'
                                                                }}
                                                            />
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    fontSize: '0.7rem',
                                                                    color: 'text.primary',
                                                                    maxWidth: '120px',
                                                                    lineHeight: 1.1
                                                                }}
                                                            >
                                                                {option.stepName}
                                                            </Typography>
                                                        </Box>
                                                    );
                                                })}
                                            </Box>
                                        )}
                                    </Box>
                                </StepLabel>
                            </Step>
                        );
                    })}
                </Stepper>
            </Box>

            {timeline.hasMultipleOptions && (
                <Box sx={{ mt: 2, p: 1, bgcolor: 'warning.50', borderRadius: 1, borderLeft: '3px solid', borderColor: 'warning.main' }}>
                    <Typography variant="caption" color="text.secondary">
                        <strong>{timeline.nextOptionsCount} opções disponíveis</strong> para o próximo movimento
                    </Typography>
                </Box>
            )}

            {timeline.current && (
                <Box sx={{ mt: 2, p: 1, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="primary.main" fontWeight="medium">
                        Estado Atual: {timeline.current.stepName}
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

const HistoryTab = ({ steps = [], loadingSteps = false, metaData, document }) => {
    const theme = useTheme();

    // Formatar data com hora
    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString.replace(' às ', ' '));
            return date.toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    };

    // Encontrar valor nos metadados
    const findMetaValue = (metaArray, field, value) => {
        if (!metaArray || !value) return value;
        const item = metaArray.find(item => item.pk === value || item[field] === value);
        return item ? item[field] : value;
    };

    // Ordenar etapas por data
    const sortedSteps = [...steps].sort((a, b) => {
        const dateA = new Date(a.when_start || 0);
        const dateB = new Date(b.when_start || 0);
        return dateA - dateB;
    });

    if (loadingSteps) {
        return (
            <Box display="flex" flexDirection="column" gap={2} py={2}>
                <Skeleton variant="rectangular" width="100%" height={200} />
                <Skeleton variant="rectangular" width="100%" height={100} />
                <Skeleton variant="rectangular" width="100%" height={100} />
            </Box>
        );
    }

    if (steps.length === 0) {
        return (
            <Box textAlign="center" py={3}>
                <Typography variant="body1" color="text.secondary">
                    Sem histórico disponível
                </Typography>
            </Box>
        );
    }

    return (
        <>
            {/* Timeline com Stack Vertical */}
            {document && metaData?.step_transitions && (
                <VerticalStackTimeline
                    document={document}
                    metaData={metaData}
                    steps={steps}
                />
            )}

            {/* Histórico detalhado */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Histórico Detalhado
            </Typography>

            <Paper elevation={0} variant="outlined" sx={{ borderRadius: 1 }}>
                <List sx={{ width: '100%' }}>
                    {sortedSteps.map((step, index) => (
                        <React.Fragment key={step.pk || index}>
                            <ListItem
                                alignItems="flex-start"
                                sx={{
                                    bgcolor: index === 0 ? (
                                        theme.palette.mode === 'dark'
                                            ? 'rgba(255,255,255,0.05)'
                                            : 'rgba(0,0,0,0.02)'
                                    ) : 'transparent',
                                    py: 2
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar
                                        sx={{
                                            bgcolor: step.what === "CONCLUIDO"
                                                ? theme.palette.success.main
                                                : theme.palette.primary.main
                                        }}
                                    >
                                        {step.what === "CONCLUIDO" ? (
                                            <CheckCircleIcon />
                                        ) : (
                                            <AccessTimeIcon />
                                        )}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle1" fontWeight="medium">
                                                {findMetaValue(metaData?.what, 'step', step.what) || step.what}
                                            </Typography>
                                            <Box>
                                                <Chip
                                                    label={formatDateTime(step.when_start)}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ height: 24, mr: 1 }}
                                                />
                                                {step.when_start !== step.when_stop && (
                                                    <Chip
                                                        label={formatDateTime(step.when_stop)}
                                                        size="small"
                                                        variant="outlined"
                                                        color="primary"
                                                        sx={{ height: 24 }}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                    }
                                    secondary={
                                        <Box component="div">
                                            <Box component="span" sx={{ mt: 0.5 }}>
                                                Realizado por: {findMetaValue(metaData?.who, 'username', step.who) || 'N/A'}
                                            </Box>
                                            {step.memo && (
                                                <Box
                                                    component="div"
                                                    sx={{
                                                        mt: 1,
                                                        p: 1.5,
                                                        bgcolor: theme.palette.mode === 'dark'
                                                            ? 'rgba(255,255,255,0.03)'
                                                            : 'rgba(0,0,0,0.01)',
                                                        borderRadius: 1,
                                                        whiteSpace: 'pre-line',
                                                        border: '1px solid rgba(0, 0, 0, 0.12)'
                                                    }}
                                                >
                                                    {step.memo}
                                                </Box>
                                            )}
                                        </Box>
                                    }
                                    secondaryTypographyProps={{ component: 'div' }}
                                />
                            </ListItem>
                            {index < sortedSteps.length - 1 && <Divider component="li" />}
                        </React.Fragment>
                    ))}
                </List>
            </Paper>
        </>
    );
};

export default HistoryTab;