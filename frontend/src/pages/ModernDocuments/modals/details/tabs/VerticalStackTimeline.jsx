import React, { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Skeleton,
    Chip,
    useTheme,
    Alert,
    Tooltip,
    IconButton,
    Popover,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Stepper,
    Step,
    StepLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    RadioButtonChecked as CurrentIcon,
    CircleOutlined as PendingIcon,
    Timeline as TimelineIcon,
    InfoOutlined as InfoIcon,
    ArrowForward as ArrowForwardIcon,
    AccountTree as WorkflowIcon,
    Close as CloseIcon,
    ExpandLess,
    ExpandMore
} from '@mui/icons-material';
import { getValidTransitions } from '../../../utils/workflowUtils';

/**
 * Timeline baseado no workflow (método preferido)
 */
const getWorkflowTimeline = (document, metaData, steps, workflowData) => {
    console.log('🎯 Gerando timeline baseado no workflow');
    
    if (!workflowData?.hierarchy) return null;

    // Ordenar workflow por level
    const sortedWorkflow = [...workflowData.hierarchy].sort((a, b) => a.level - b.level);
    
    // Steps executados ordenados por ord
    const executedSteps = steps
        .filter(step => step.what)
        .sort((a, b) => (a.ord || 0) - (b.ord || 0));

    // Encontrar caminho executado até agora
    const executedPath = [];
    
    executedSteps.forEach(execStep => {
        const workflowStep = sortedWorkflow.find(ws => 
            execStep.what === ws.step_name || 
            (metaData?.what?.find(meta => meta.step === execStep.what)?.pk === ws.step_id)
        );
        
        if (workflowStep) {
            executedPath.push({
                stepId: workflowStep.step_id,
                stepName: workflowStep.step_name,
                level: workflowStep.level,
                status: 'completed',
                when: execStep.when_start,
                who: execStep.who,
                memo: execStep.memo || workflowStep.memo,
                order: workflowStep.level
            });
        }
    });

    // Ordenar executados por level
    executedPath.sort((a, b) => a.level - b.level);

    // Adicionar step actual se não executado
    const currentStep = sortedWorkflow.find(ws => ws.step_id === document.what);
    if (currentStep && !executedPath.find(ep => ep.stepId === currentStep.step_id)) {
        executedPath.push({
            stepId: currentStep.step_id,
            stepName: currentStep.step_name,
            level: currentStep.level,
            status: 'current',
            memo: currentStep.memo,
            order: currentStep.level
        });
    } else if (currentStep) {
        // Marcar como actual se já existe
        const existing = executedPath.find(ep => ep.stepId === currentStep.step_id);
        if (existing) existing.status = 'current';
    }

    // Próximo level baseado no actual
    const currentLevel = currentStep?.level || Math.max(...executedPath.map(ep => ep.level), 0);
    const nextSteps = sortedWorkflow.filter(ws => ws.level === currentLevel + 1);
    
    if (nextSteps.length > 0) {
        // Adicionar primeiro próximo
        const firstNext = nextSteps[0];
        executedPath.push({
            stepId: firstNext.step_id,
            stepName: firstNext.step_name,
            level: firstNext.level,
            status: 'pending',
            memo: firstNext.memo,
            order: firstNext.level,
            isNext: true
        });
    }

    // Ordenar por level final
    executedPath.sort((a, b) => a.level - b.level);

    return {
        steps: executedPath,
        completed: executedPath.filter(s => s.status === 'completed').length,
        total: executedPath.length,
        current: executedPath.find(s => s.status === 'current'),
        nextOptionsCount: nextSteps.length,
        allNextOptions: nextSteps,
        isWorkflowBased: true
    };
};

/**
 * Timeline original (fallback)
 */
const getOriginalTimeline = (document, metaData, steps) => {
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

    const executedSteps = steps
        .filter(step => step.what !== null && step.what !== undefined && step.what !== '')
        .sort((a, b) => (a.ord || 0) - (b.ord || 0));

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
                    originalStep: step,
                    order: step.ord || 0
                });
            }
        }
    });

    const timelineSteps = [];

    // Adicionar ENTRADA primeiro
    const entradaStep = metaData.what?.find(s =>
        s.step?.toUpperCase().includes('ENTRADA')
    );
    
    if (entradaStep) {
        const entradaExecuted = uniqueExecutedSteps.get(entradaStep.pk);
        if (entradaExecuted) {
            timelineSteps.push({ ...entradaExecuted, order: -1 });
        } else {
            timelineSteps.push({
                stepId: entradaStep.pk,
                stepName: entradaStep.step,
                status: 'completed',
                when: document.created_at || document.when_start,
                isEntrada: true,
                order: -1
            });
        }
    }

    // Adicionar outros steps executados
    const metaStepsOrder = metaData.what || [];
    metaStepsOrder.forEach((metaStep, index) => {
        if (metaStep.step?.toUpperCase().includes('ENTRADA')) return;
        
        const executedStepData = uniqueExecutedSteps.get(metaStep.pk);
        if (executedStepData) {
            timelineSteps.push({
                ...executedStepData,
                status: 'completed',
                order: index
            });
        }
    });

    // Identificar step atual
    const currentStepData = findStepData(document.what);
    if (currentStepData) {
        const currentStepIndex = timelineSteps.findIndex(step => step.stepId === currentStepData.pk);
        
        if (currentStepIndex !== -1) {
            timelineSteps[currentStepIndex].status = 'current';
        } else {
            const currentStepMetaIndex = metaStepsOrder.findIndex(meta => meta.pk === currentStepData.pk);
            timelineSteps.push({
                stepId: currentStepData.pk,
                stepName: currentStepData.step,
                status: 'current',
                order: currentStepMetaIndex !== -1 ? currentStepMetaIndex : 9999
            });
        }
    }

    // Próximos passos possíveis (só para compatibilidade)
    const validTransitions = getValidTransitions ? getValidTransitions(document, metaData) : [];
    const existingStepIds = new Set(timelineSteps.map(s => s.stepId));
    const nextStepIds = validTransitions
        .map(t => t.to_step_pk)
        .filter(stepId => !existingStepIds.has(stepId));
    const nextStepsData = nextStepIds
        .map(stepId => metaData.what?.find(s => s.pk === stepId))
        .filter(Boolean);

    const hasPendingSteps = timelineSteps.some(step => step.status === 'pending');
    
    if (nextStepsData.length > 0 && !hasPendingSteps) {
        const nextStep = nextStepsData[0];
        timelineSteps.push({
            stepId: nextStep.pk,
            stepName: nextStep.step,
            status: 'pending',
            type: 'next'
        });
    }

    timelineSteps.sort((a, b) => (a.order || 0) - (b.order || 0));

    return {
        steps: timelineSteps.slice(0, 6),
        completed: timelineSteps.filter(s => s.status === 'completed').length,
        total: timelineSteps.length,
        current: timelineSteps.find(s => s.status === 'current'),
        totalOptionsAvailable: nextStepsData.length,
        allNextOptions: nextStepsData,
        isWorkflowBased: false
    };
};

// Componente árvore hierárquica para o modal
const WorkflowTreeModal = ({ workflowData, steps, document, metaData }) => {
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    
    // Mapear steps executados
    const mapExecutedSteps = (hierarchy) => {
    if (!hierarchy || !Array.isArray(hierarchy)) return [];
    
    return hierarchy.map(step => {
            const executed = steps.find(exec => 
                exec.what === step.step_name ||
                metaData?.what?.find(meta => meta.step === exec.what)?.pk === step.step_id
            );
            
            return {
                ...step,
                executed: !!executed,
                executedAt: executed?.when_start,
                executedBy: executed?.who,
                memo: step.memo, // MEMO DO WORKFLOW sempre
                executedMemo: executed?.memo // Memo do step executado separado
            };
        });
    };

    // Construir árvore
    const buildTree = (hierarchy) => {
        const stepMap = {};
        
        hierarchy.forEach((step) => {
            const uniqueKey = `${step.step_id}-${step.path}`;
            stepMap[uniqueKey] = { 
                ...step, 
                uniqueKey,
                children: []
            };
        });

        const tree = [];
        hierarchy.forEach((step) => {
            const uniqueKey = `${step.step_id}-${step.path}`;
            const currentNode = stepMap[uniqueKey];
            
            if (step.parent_id === null) {
                tree.push(currentNode);
            } else {
                const parentPath = step.path.split(' -> ').slice(0, -1).join(' -> ');
                const parentKey = Object.keys(stepMap).find(key => {
                    const node = stepMap[key];
                    return node.step_id === step.parent_id && node.path === parentPath;
                });
                
                if (parentKey) {
                    stepMap[parentKey].children.push(currentNode);
                }
            }
        });

        return tree;
    };

    const toggleNode = (nodeKey) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(nodeKey)) {
            newExpanded.delete(nodeKey);
        } else {
            newExpanded.add(nodeKey);
        }
        setExpandedNodes(newExpanded);
    };

    const getStepColors = (step) => {
        const isExecuted = step.executed;
        const isCurrent = document?.what === step.step_id;
        
        if (step.step_name?.includes('CONCLUIDO COM SUCESSO')) {
            return { bg: 'success.50', text: 'success.dark', border: 'success.main' };
        }
        if (step.step_name?.includes('CONCLUIDO SEM SUCESSO')) {
            return { bg: 'error.50', text: 'error.dark', border: 'error.main' };
        }
        if (step.step_name?.includes('AGUARDAR')) {
            return { bg: 'warning.50', text: 'warning.dark', border: 'warning.main' };
        }
        if (step.step_name?.includes('COBRANÇA')) {
            return { bg: 'info.50', text: 'info.dark', border: 'info.main' };
        }
        
        if (isExecuted) {
            return { bg: 'success.50', text: 'success.dark', border: 'success.main' };
        }
        if (isCurrent) {
            return { bg: 'primary.50', text: 'primary.dark', border: 'primary.main' };
        }
        
        return { bg: 'grey.50', text: 'text.secondary', border: 'divider' };
    };

    const TreeNode = ({ node, level = 0 }) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.uniqueKey);
        const colors = getStepColors(node);

        return (
            <Box sx={{ userSelect: 'none' }}>
                <Paper
                    elevation={0}
                    onClick={() => hasChildren && toggleNode(node.uniqueKey)}
                    sx={{
                        p: 1.5,
                        mb: 0.5,
                        ml: level * 4,
                        mr: 3,
                        cursor: hasChildren ? 'pointer' : 'default',
                        border: 1,
                        borderColor: colors.border,
                        borderStyle: node.executed || document?.what === node.step_id ? 'solid' : 'dashed',
                        bgcolor: colors.bg,
                        borderRadius: 1,
                        '&:hover': hasChildren ? { bgcolor: 'action.hover' } : {}
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* Ícone expand/collapse */}
                        <Box sx={{ width: 20, display: 'flex', justifyContent: 'center' }}>
                            {hasChildren ? (
                                isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />
                            ) : null}
                        </Box>

                        {/* Ícone de estado */}
                        <Box>
                            {node.executed ? (
                                <CheckCircleIcon sx={{ color: 'success.main', fontSize: '1rem' }} />
                            ) : document?.what === node.step_id ? (
                                <CurrentIcon sx={{ color: 'primary.main', fontSize: '1rem' }} />
                            ) : (
                                <PendingIcon sx={{ color: 'grey.400', fontSize: '1rem' }} />
                            )}
                        </Box>

                        {/* Nome do step */}
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                fontWeight: document?.what === node.step_id ? 600 : 400,
                                color: colors.text,
                                flex: 1
                            }}
                        >
                            {node.level}. {node.step_name}
                        </Typography>

                        {/* Chips de estado */}
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {node.executed && (
                                <Chip label="✓" size="small" color="success" sx={{ height: 16, fontSize: '0.6rem' }} />
                            )}
                            {document?.what === node.step_id && (
                                <Chip label="►" size="small" color="primary" sx={{ height: 16, fontSize: '0.6rem' }} />
                            )}
                        </Box>

                        {/* Responsáveis */}
                        {node.client && node.client.length > 0 && (
                            <Chip
                                label={`👤 ${node.client.map(clientPk => {
                                    const userData = metaData?.who?.find(user => user.pk === clientPk);
                                    return userData ? userData.name : clientPk;
                                }).join(', ')}`}
                                size="small"
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.6rem' }}
                            />
                        )}
                    </Box>

                    {/* Memo */}
                    {node.memo && (
                        <Box sx={{ mt: 1, ml: 3 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                                💬 {node.memo}
                            </Typography>
                        </Box>
                    )}
                </Paper>

                {/* Filhos */}
                {hasChildren && isExpanded && (
                    <Box>
                        {node.children.map((child) => (
                            <TreeNode key={child.uniqueKey} node={child} level={level + 1} />
                        ))}
                    </Box>
                )}
            </Box>
        );
    };

    const mappedHierarchy = useMemo(() => {
        if (!workflowData?.hierarchy) return [];
        return mapExecutedSteps(workflowData.hierarchy);
    }, [workflowData?.hierarchy, steps, metaData]);

    const treeData = useMemo(() => {
        return buildTree(mappedHierarchy);
    }, [mappedHierarchy]);

    // useEffect só dependente de workflowData
    useEffect(() => {
        if (mappedHierarchy.length === 0) return;
        
        const defaultExpanded = new Set();
        mappedHierarchy.forEach(step => {
            if (step.level <= 3) {
                defaultExpanded.add(`${step.step_id}-${step.path}`);
            }
        });
        setExpandedNodes(defaultExpanded);
    }, [workflowData]);

    if (mappedHierarchy.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    Sem dados de workflow
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Não existem dados hierárquicos para apresentar.
                </Typography>
            </Box>
        );
    }
    return (
        <Box sx={{ p: 2, maxHeight: 500, overflow: 'auto' }}>
            {treeData.map((node) => (
                <TreeNode key={node.uniqueKey} node={node} />
            ))}
        </Box>
    );
};
const getSimpleTimeline = (document, metaData, steps, workflowData) => {
    console.log('🔍 Timeline Input:', {
        document_what: document.what,
        steps_count: steps.length,
        has_workflow: !!workflowData,
        workflow_steps: workflowData?.hierarchy?.length
    });

    // PRIORIDADE: Usar workflow se disponível
    if (workflowData?.hierarchy) {
        const workflowTimeline = getWorkflowTimeline(document, metaData, steps, workflowData);
        if (workflowTimeline) {
            console.log('✅ Timeline gerado pelo workflow:', workflowTimeline);
            return workflowTimeline;
        }
    }

    // FALLBACK: Método original
    console.log('⚠️ Fallback para método original');
    return getOriginalTimeline(document, metaData, steps);
};

/**
 * Componente de Timeline
 */
const VerticalStackTimeline = ({ 
    document, 
    metaData, 
    steps = [],
    workflowData,
    title = "Percurso do Documento",
    showWorkflowIcon = false,
    sx = {}
}) => {
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState(null);
    const [workflowModalOpen, setWorkflowModalOpen] = useState(false);

    const handlePopoverOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    const handleCloseModal = () => {
    setWorkflowModalOpen(false);
    // Forçar blur do elemento focado
    document.activeElement?.blur?.();
};

    const open = Boolean(anchorEl);

    // Validação
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

    const timeline = getSimpleTimeline(document, metaData, steps, workflowData);

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
                    
                    {/* Ícone workflow com modal */}
                    {showWorkflowIcon && workflowData && (
                        <Tooltip 
                            title="Clique para ver o processo completo"
                            arrow
                        >
                            <IconButton 
                                size="small" 
                                onClick={() => setWorkflowModalOpen(true)}
                                sx={{ 
                                    ml: 1,
                                    color: 'success.main',
                                    '&:hover': {
                                        bgcolor: 'success.50'
                                    }
                                }}
                            >
                                <WorkflowIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}

                    {/* {timeline.isWorkflowBased && (
                        <Chip 
                            label="Baseado no Workflow" 
                            size="small" 
                            color="success" 
                            variant="outlined"
                            sx={{ ml: 2, height: 20, fontSize: '0.7rem' }}
                        />
                    )} */}
                </Typography>
            </Box>

            {/* Timeline */}
            <Box sx={{ width: '100%', pb: 1, overflow: 'hidden' }}>
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

            {/* Nota sobre múltiplas opções do próximo passo */}
            {timeline.isWorkflowBased && timeline.nextOptionsCount > 1 && (
                <Box sx={{ 
                    mt: 2, 
                    p: 1.5, 
                    bgcolor: 'warning.50', 
                    borderRadius: 1, 
                    borderLeft: '4px solid', 
                    borderColor: 'warning.main',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1
                }}>
                    <Typography variant="body2" color="text.secondary">
                        ⚠️ <strong>{timeline.nextOptionsCount} opções disponíveis</strong> para o próximo movimento
                    </Typography>
                    
                    <Tooltip title="Ver todas as opções disponíveis" arrow>
                        <IconButton
                            size="small"
                            onClick={handlePopoverOpen}
                            sx={{
                                color: 'warning.main',
                                '&:hover': {
                                    bgcolor: 'warning.100'
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
                                        key={option.step_id} 
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
                                                        {option.step_name}
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
                                A opção "{timeline.allNextOptions?.[0]?.step_name}" está a ser apresentada na cronologia.
                            </Typography>
                        </Box>
                    </Popover>
                </Box>
            )}
            
            {/* Modal do Workflow */}
            <Dialog 
                open={workflowModalOpen} 
                onClose={handleCloseModal}
                disableRestoreFocus={true} // Adicionar esta prop
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: { maxHeight: '90vh' }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WorkflowIcon color="success" />
                            <Typography variant="h6">
                                Processo Completo - {document?.tt_type}
                            </Typography>
                        </Box>
                        <IconButton 
                            onClick={() => setWorkflowModalOpen(false)}
                            size="small"
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                
                <DialogContent dividers sx={{ p: 0 }}>
                    {workflowData && (
                        <WorkflowTreeModal 
                            workflowData={workflowData}
                            steps={steps}
                            document={document}
                            metaData={metaData}
                        />
                    )}
                </DialogContent>
                
                <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
                    {/* Legenda no lado esquerdo */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle2" gutterBottom>
                    Legenda:
                </Typography>
                        <Chip icon={<CheckCircleIcon />} label="Executado" size="small" color="success" />
                        <Chip icon={<CurrentIcon />} label="Actual" size="small" color="primary" />
                        <Chip icon={<PendingIcon />} label="Pendente" size="small" variant="outlined" />
                    </Box>
                    
                    {/* Botão fechar no lado direito */}
                    <Button onClick={() => setWorkflowModalOpen(false)}>
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default VerticalStackTimeline;