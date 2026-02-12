
import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Skeleton,
    Chip,
    useTheme,
    Collapse,
    IconButton,
    Stepper,
    Step,
    StepLabel,
    Popover,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Alert
} from '@mui/material';
import {
    ExpandMore,
    ExpandLess,
    CheckCircle as CheckCircleIcon,
    RadioButtonChecked as CurrentIcon,
    CircleOutlined as PendingIcon,
    AccountTree as WorkflowIcon,
    ArrowForward as ArrowForwardIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import { documentsService } from '../../../api/documentsService';

/**
 * Componente WorkflowViewer - Mostra o processo completo do documento
 * 
 * @param {Object} props
 * @param {Object} props.document - Documento atual
 * @param {Object} props.metaData - Metadados do sistema
 * @param {Array} props.steps - Passos executados
 */
const WorkflowViewer = ({ document, metaData, steps = [], onWorkflowLoaded }) => {
    const theme = useTheme();
    const [workflowData, setWorkflowData] = useState(null);
    const [loadingWorkflow, setLoadingWorkflow] = useState(false);
    const [expandedWorkflow, setExpandedWorkflow] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState(new Set());

    // Função para encontrar o PK do tipo de documento
    const getDocumentTypePk = (ttType) => {
        if (!ttType || !metaData?.types) return null;

        const typeData = metaData.types.find(type =>
            type.tt_doctype_value === ttType
        );

        return typeData?.tt_doctype_code || null;
    };

    // Buscar o workflow completo
    useEffect(() => {
        const fetchWorkflow = async () => {
            if (!document?.tt_type || !metaData?.types) {
                return;
            }

            const doctypePk = getDocumentTypePk(document.tt_type);

            if (!doctypePk) {
                return;
            }

            setLoadingWorkflow(true);
            try {
                const workflow = await documentsService.getDocumentWorkflow(doctypePk);
                setWorkflowData(workflow);

                // Callback para partilhar workflow com HistoryTab
                if (onWorkflowLoaded) {
                    onWorkflowLoaded(workflow);
                }

                // Expandir primeiros 3 níveis por defeito
                if (workflow?.hierarchy) {
                    const defaultExpanded = new Set();
                    workflow.hierarchy.forEach(step => {
                        if (step.level <= 3) {
                            defaultExpanded.add(`${step.step_id}-${step.path}`);
                        }
                    });
                    setExpandedNodes(defaultExpanded);
                }
            } catch (error) {
                console.error('Erro ao buscar workflow:', error);
                setWorkflowData(null);
            } finally {
                setLoadingWorkflow(false);
            }
        };

        fetchWorkflow();
    }, [document?.tt_type, metaData?.types]);

    // Resolver o nome/PK de um passo executado usando metadados
    const resolveStepIdentifiers = (execWhat) => {
        if (!execWhat) return { name: null, pk: null };

        // Se é número, é um PK
        const numVal = typeof execWhat === 'string' ? parseInt(execWhat, 10) : execWhat;

        if (metaData?.what) {
            // Procurar por PK
            const byPk = metaData.what.find(m => m.pk === numVal || m.pk === execWhat);
            if (byPk) return { name: byPk.step || byPk.name, pk: byPk.pk };

            // Procurar por nome
            const byName = metaData.what.find(m =>
                m.step === execWhat || m.name === execWhat ||
                m.step?.toUpperCase() === String(execWhat).toUpperCase()
            );
            if (byName) return { name: byName.step || byName.name, pk: byName.pk };
        }

        return { name: String(execWhat), pk: isNaN(numVal) ? null : numVal };
    };

    // Mapear passos executados para o workflow
    const mapExecutedSteps = (workflowHierarchy, executedSteps) => {
        if (!workflowHierarchy || !executedSteps) return workflowHierarchy;

        // Pré-resolver todos os passos executados
        const resolvedExecSteps = executedSteps.map(exec => ({
            ...exec,
            _resolved: resolveStepIdentifiers(exec.what)
        }));

        return workflowHierarchy.map(step => {
            const executed = resolvedExecSteps.find(exec => {
                // Correspondência por PK (mais fiável)
                if (exec._resolved.pk != null && exec._resolved.pk === step.step_id) return true;
                if (exec.what_pk != null && exec.what_pk === step.step_id) return true;

                // Correspondência por nome exacto
                if (exec.what === step.step_name) return true;
                if (exec._resolved.name === step.step_name) return true;

                // Correspondência normalizada (case-insensitive, trim)
                const execName = (exec._resolved.name || String(exec.what)).toUpperCase().trim();
                const stepName = (step.step_name || '').toUpperCase().trim();
                if (execName && stepName && execName === stepName) return true;

                // Correspondência parcial (contém)
                if (execName && stepName && stepName.length > 3 &&
                    (execName.includes(stepName) || stepName.includes(execName))) return true;

                return false;
            });

            return {
                ...step,
                executed: !!executed,
                executedAt: executed?.when_start,
                executedBy: executed?.who,
                memo: executed?.memo || step.memo,
                workflowMemo: step.memo,
                executedStep: executed
            };
        });
    };

    // Construir árvore hierárquica
    const buildWorkflowTree = (hierarchy) => {
        if (!hierarchy) return [];

        const stepMap = {};

        // Criar nós únicos usando path como chave
        hierarchy.forEach((step, index) => {
            const uniqueKey = `${step.step_id}-${step.path}`;
            stepMap[uniqueKey] = {
                ...step,
                uniqueKey,
                children: [],
                originalIndex: index
            };
        });

        const tree = [];
        hierarchy.forEach((step) => {
            const uniqueKey = `${step.step_id}-${step.path}`;
            const currentNode = stepMap[uniqueKey];

            if (step.parent_id === null) {
                tree.push(currentNode);
            } else {
                // Encontrar o pai correto baseado no path
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

    // Obter cor do step baseado no status
    const getStepStatusColor = (step) => {
        const isExecuted = step.executed;
        const isCurrent = document?.what === step.step_id;

        if (step.step_name?.includes('CONCLUIDO COM SUCESSO')) {
            return {
                bg: 'success.main',
                border: 'success.main',
                text: 'success.contrastText', // Adjusted for v2 theme usage
                icon: 'success'
            };
        }
        if (step.step_name?.includes('CONCLUIDO SEM SUCESSO')) {
            return {
                bg: 'error.main',
                border: 'error.main',
                text: 'error.contrastText',
                icon: 'error'
            };
        }
        
        // Use alpha for backgrounds to match legacy look but cleaner
        if (isExecuted) {
            return {
                bg: 'rgba(76, 175, 80, 0.1)', // Success Light
                border: 'success.main',
                text: 'success.dark',
                icon: 'completed'
            };
        }
        if (isCurrent) {
            return {
                bg: 'rgba(25, 118, 210, 0.1)', // Primary Light
                border: 'primary.main',
                text: 'primary.dark',
                icon: 'current'
            };
        }

        return {
            bg: 'rgba(0, 0, 0, 0.02)', // Grey Light
            border: 'divider',
            text: 'text.secondary',
            icon: 'pending'
        };
    };

    // Componente TreeNode
    const WorkflowTreeNode = ({ node, level = 0 }) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.uniqueKey);
        const colors = getStepStatusColor(node);

        const toggleNode = () => {
            if (!hasChildren) return;

            const newExpanded = new Set(expandedNodes);
            if (newExpanded.has(node.uniqueKey)) {
                newExpanded.delete(node.uniqueKey);
            } else {
                newExpanded.add(node.uniqueKey);
            }
            setExpandedNodes(newExpanded);
        };

        const getStatusIcon = () => {
            switch (colors.icon) {
                case 'completed':
                case 'success':
                    return <CheckCircleIcon sx={{ color: 'success.main', fontSize: '1.1rem' }} />;
                case 'current':
                    return <CurrentIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />;
                case 'error':
                    return <CheckCircleIcon sx={{ color: 'error.main', fontSize: '1.1rem' }} />;
                case 'warning':
                    return <CurrentIcon sx={{ color: 'warning.main', fontSize: '1.1rem' }} />;
                default:
                    return <PendingIcon sx={{ color: 'text.disabled', fontSize: '1.1rem' }} />;
            }
        };

        return (
            <Box sx={{ userSelect: 'none' }}>
                <Paper
                    elevation={0}
                    onClick={toggleNode}
                    sx={{
                        p: 1.5,
                        mb: 1,
                        ml: level * 3,
                        cursor: hasChildren ? 'pointer' : 'default',
                        border: 1,
                        borderColor: colors.border,
                        borderStyle: node.executed || document?.what === node.step_id ? 'solid' : 'dashed',
                        bgcolor: colors.bg,
                        transition: 'all 0.2s ease',
                        '&:hover': hasChildren ? {
                            bgcolor: 'action.hover',
                        } : {}
                    }}
                >
                    <Box>
                        {/* Linha principal: expansão + status + nome + chips + data */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {/* Ícone de expansão */}
                            <Box sx={{ width: 24, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                                {hasChildren ? (
                                    <IconButton size="small" sx={{ p: 0 }}>
                                        {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                    </IconButton>
                                ) : (
                                    <Box sx={{ width: 20 }} />
                                )}
                            </Box>

                            {/* Ícone de status */}
                            {getStatusIcon()}

                            {/* Nome do passo */}
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: document?.what === node.step_id ? 'bold' : 'medium',
                                    color: colors.text,
                                    fontSize: '0.85rem',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {node.level}. {node.step_name}
                            </Typography>

                            {/* Chips de status */}
                            {node.executed && (
                                <Chip label="Executado" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} />
                            )}
                            {document?.what === node.step_id && (
                                <Chip label="Atual" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
                            )}

                            {/* Espaçador */}
                            <Box sx={{ flex: 1 }} />

                            {/* Data à direita */}
                            {node.executed && node.executedAt && (
                                <Typography variant="caption" color="success.main" sx={{ fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    {new Date(node.executedAt.replace(' às ', ' ')).toLocaleDateString('pt-PT')}
                                </Typography>
                            )}
                        </Box>

                        {/* Memo/Observação - abaixo, só quando existe */}
                        {node.memo && (
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5, ml: 7, fontStyle: 'italic' }}>
                                Obs: {node.memo}
                            </Typography>
                        )}
                    </Box>
                </Paper>

                {/* Filhos */}
                {hasChildren && isExpanded && (
                    <Box sx={{ position: 'relative' }}>
                         {/* Linha vertical conectora */}
                         <Box sx={{
                            position: 'absolute',
                            left: level * 3 + 12 - 1, // Adjust based on ml and icon width
                            top: 0,
                            bottom: 0,
                            width: 2,
                            bgcolor: 'divider',
                            opacity: 0.5
                        }} />
                        {node.children.map((child) => (
                            <WorkflowTreeNode key={child.uniqueKey} node={child} level={level + 1} />
                        ))}
                    </Box>
                )}
            </Box>
        );
    };

    // Construir timeline linear: executados + atual + próximos
    const getWorkflowTimeline = () => {
        if (!workflowData?.hierarchy || !mappedWorkflow) return null;

        // Passos executados (ordenados por data)
        const executedList = mappedWorkflow
            .filter(step => step.executed)
            .sort((a, b) => {
                if (!a.executedAt || !b.executedAt) return 0;
                return new Date(a.executedAt) - new Date(b.executedAt);
            });

        // Passo atual
        const currentStep = mappedWorkflow.find(step => step.step_id === document?.what);
        const currentStepName = currentStep?.step_name || resolveStepIdentifiers(document?.what).name;

        // Próximos passos possíveis: filhos do passo atual na hierarquia
        let nextOptions = [];
        if (currentStep) {
            const currentLevel = currentStep.level;
            // Procurar passos no nível seguinte que sejam filhos do atual
            nextOptions = mappedWorkflow.filter(step =>
                step.level === currentLevel + 1 &&
                step.parent_id === currentStep.step_id &&
                !step.executed
            );

            // Se não encontrou filhos directos, procurar pelo path
            if (nextOptions.length === 0) {
                const currentPath = currentStep.path;
                nextOptions = mappedWorkflow.filter(step =>
                    step.level === currentLevel + 1 &&
                    step.path?.startsWith(currentPath) &&
                    !step.executed
                );
            }
        }

        return {
            executedList,
            executedCount: executedList.length,
            currentStepName,
            currentStep,
            nextOptions,
            nextOptionsCount: nextOptions.length,
        };
    };

    const [anchorEl, setAnchorEl] = useState(null);

    const mappedWorkflow = workflowData ?
        mapExecutedSteps(workflowData.hierarchy, steps) : null;

    const workflowTreeData = mappedWorkflow ?
        buildWorkflowTree(mappedWorkflow) : null;

    const timeline = getWorkflowTimeline();

    if (loadingWorkflow) {
        return (
            <Box>
                <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 2, borderRadius: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={400} sx={{ borderRadius: 1 }} />
            </Box>
        );
    }

    if (!workflowData) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <WorkflowIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                    Workflow não disponível
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    O visualizador de workflow não está disponível para este tipo de documento.
                </Typography>
            </Paper>
        );
    }

    // Construir steps para o Stepper linear
    const buildStepperSteps = () => {
        if (!timeline) return [];
        const stepperSteps = [];

        // Passos executados
        timeline.executedList.forEach(step => {
            stepperSteps.push({
                label: step.step_name,
                status: 'completed',
                date: step.executedAt,
            });
        });

        // Passo atual (se não está já nos executados)
        if (timeline.currentStep && !timeline.currentStep.executed) {
            stepperSteps.push({
                label: timeline.currentStepName,
                status: 'current',
            });
        }

        // Primeiro próximo passo (pendente)
        if (timeline.nextOptions.length > 0) {
            stepperSteps.push({
                label: timeline.nextOptions[0].step_name,
                status: 'pending',
            });
        }

        return stepperSteps;
    };

    const stepperSteps = buildStepperSteps();
    const activeStepIndex = stepperSteps.findIndex(s => s.status === 'current');

    return (
        <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
            {/* Cabeçalho: Título + ícone árvore */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: stepperSteps.length > 0 ? 2 : 0 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                    Linha do Tempo
                </Typography>
                <IconButton
                    size="small"
                    onClick={() => setExpandedWorkflow(!expandedWorkflow)}
                    color={expandedWorkflow ? 'primary' : 'default'}
                    title="Árvore do Processo"
                >
                    <WorkflowIcon />
                </IconButton>
            </Box>

            {/* Timeline linear */}
            {stepperSteps.length > 0 && (
                <>
                    <Stepper
                        activeStep={activeStepIndex >= 0 ? activeStepIndex : stepperSteps.length - 1}
                        alternativeLabel
                    >
                        {stepperSteps.map((step, index) => (
                            <Step key={index} completed={step.status === 'completed'}>
                                <StepLabel
                                    error={false}
                                    StepIconProps={{
                                        ...(step.status === 'pending' && { icon: <PendingIcon sx={{ color: 'text.disabled' }} /> }),
                                    }}
                                    optional={step.date ? (
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(step.date.replace(' às ', ' ')).toLocaleDateString('pt-PT')}
                                        </Typography>
                                    ) : null}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontWeight: step.status === 'current' ? 'bold' : 'normal',
                                            color: step.status === 'pending' ? 'text.disabled' : 'text.primary',
                                            fontSize: '0.7rem'
                                        }}
                                    >
                                        {step.label}
                                    </Typography>
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {/* Aviso de múltiplas opções */}
                    {timeline.nextOptionsCount > 1 && (
                        <Alert
                            severity="warning"
                            variant="outlined"
                            sx={{ mt: 1.5, py: 0 }}
                            action={
                                <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                                    <InfoIcon fontSize="small" />
                                </IconButton>
                            }
                        >
                            <Typography variant="body2">
                                <strong>{timeline.nextOptionsCount} opções disponíveis</strong> para o próximo movimento
                            </Typography>
                        </Alert>
                    )}

                    {/* Popover com todas as opções */}
                    <Popover
                        open={Boolean(anchorEl)}
                        anchorEl={anchorEl}
                        onClose={() => setAnchorEl(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                        <Box sx={{ p: 2, maxWidth: 350 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Próximas Opções Disponíveis:
                            </Typography>
                            <List dense sx={{ py: 0 }}>
                                {timeline.nextOptions.map((option, index) => (
                                    <ListItem key={option.step_id} sx={{ px: 0.5 }}>
                                        <ListItemIcon sx={{ minWidth: 28 }}>
                                            <ArrowForwardIcon fontSize="small" color={index === 0 ? 'primary' : 'action'} />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: index === 0 ? 600 : 400,
                                                        color: index === 0 ? 'primary.main' : 'text.primary'
                                                    }}
                                                >
                                                    {option.step_name}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </Popover>
                </>
            )}

            {/* Árvore do workflow (expansível) */}
            <Collapse in={expandedWorkflow}>
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
                        {workflowTreeData && workflowTreeData.map((node) => (
                            <WorkflowTreeNode key={node.uniqueKey} node={node} />
                        ))}
                    </Box>
                </Box>
            </Collapse>
        </Paper>
    );
};

export default WorkflowViewer;
