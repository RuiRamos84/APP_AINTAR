import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Skeleton,
    Chip,
    useTheme,
    Collapse,
    Button,
    IconButton,
    LinearProgress
} from '@mui/material';
import {
    ExpandMore,
    ExpandLess,
    CheckCircle as CheckCircleIcon,
    RadioButtonChecked as CurrentIcon,
    CircleOutlined as PendingIcon,
    AccountTree as WorkflowIcon
} from '@mui/icons-material';
import { getDocumentWorkflow } from '../../../../../services/documentService';

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
    const [expandedWorkflow, setExpandedWorkflow] = useState(true);
    const [expandedNodes, setExpandedNodes] = useState(new Set());

    // Função para encontrar o PK do tipo de documento
    const getDocumentTypePk = (ttType) => {
        if (!ttType || !metaData?.types) return null;

        const typeData = metaData.types.find(type =>
            type.tt_doctype_value === ttType
        );

        return typeData?.tt_doctype_code || null; // Usar tt_doctype_code em vez de pk
    };

    // Buscar o workflow completo
    useEffect(() => {
        const fetchWorkflow = async () => {
            if (!document?.tt_type || !metaData?.types) {
                // console.log('Documento sem tt_type ou metadados sem types:', {
                //     tt_type: document?.tt_type,
                //     hasTypes: !!metaData?.types
                // });
                return;
            }

            // Converter tt_type (string) para pk (number)
            const doctypePk = getDocumentTypePk(document.tt_type);

            if (!doctypePk) {
                // console.log('Não foi possível encontrar PK para tt_type:', document.tt_type);
                return;
            }

            setLoadingWorkflow(true);
            try {
                // console.log('🔍 Buscando workflow para:', document.tt_type, '→ PK:', doctypePk);
                const workflow = await getDocumentWorkflow(doctypePk);
                // console.log('📋 Workflow recebido:', workflow);
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
                console.error('❌ Erro ao buscar workflow:', error);
                setWorkflowData(null);
            } finally {
                setLoadingWorkflow(false);
            }
        };

        fetchWorkflow();
    }, [document?.tt_type, metaData?.types]);

    // Mapear passos executados para o workflow
    const mapExecutedSteps = (workflowHierarchy, executedSteps) => {
        if (!workflowHierarchy || !executedSteps) return workflowHierarchy;

        return workflowHierarchy.map(step => {
            // Tentar várias formas de correspondência
            const executed = executedSteps.find(exec => {
                // Correspondência por nome
                if (exec.what === step.step_name) return true;

                // Correspondência por ID se disponível
                if (exec.what_pk === step.step_id) return true;

                // Correspondência normalizada
                if (exec.what?.toUpperCase() === step.step_name?.toUpperCase()) return true;

                // Buscar nos metadados
                if (metaData?.what) {
                    const metaStep = metaData.what.find(meta =>
                        meta.step === exec.what || meta.pk === exec.what
                    );
                    if (metaStep && metaStep.pk === step.step_id) return true;
                }

                return false;
            });

            return {
                ...step,
                executed: !!executed,
                executedAt: executed?.when_start,
                executedBy: executed?.who,
                memo: executed?.memo || step.memo, // Priorizar memo do executed, depois do workflow
                workflowMemo: step.memo, // Manter memo original do workflow
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
                bg: 'success.50',
                border: 'success.main',
                text: 'success.dark',
                icon: 'success'
            };
        }
        if (step.step_name?.includes('CONCLUIDO SEM SUCESSO')) {
            return {
                bg: 'error.50',
                border: 'error.main',
                text: 'error.dark',
                icon: 'error'
            };
        }
        if (step.step_name?.includes('AGUARDAR')) {
            return {
                bg: 'warning.50',
                border: 'warning.main',
                text: 'warning.dark',
                icon: 'warning'
            };
        }
        if (step.step_name?.includes('COBRANÇA')) {
            return {
                bg: 'info.50',
                border: 'info.main',
                text: 'info.dark',
                icon: 'info'
            };
        }

        if (isExecuted) {
            return {
                bg: 'success.50',
                border: 'success.main',
                text: 'success.dark',
                icon: 'completed'
            };
        }
        if (isCurrent) {
            return {
                bg: 'primary.50',
                border: 'primary.main',
                text: 'primary.dark',
                icon: 'current'
            };
        }

        return {
            bg: 'grey.50',
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
                case 'info':
                    return <CurrentIcon sx={{ color: 'info.main', fontSize: '1.1rem' }} />;
                default:
                    return <PendingIcon sx={{ color: 'grey.400', fontSize: '1.1rem' }} />;
            }
        };

        return (
            <Box sx={{ userSelect: 'none' }}>
                <Paper
                    elevation={0}
                    onClick={toggleNode}
                    sx={{
                        p: 2,
                        mb: 1,
                        ml: level * 3,
                        cursor: hasChildren ? 'pointer' : 'default',
                        border: 1,
                        borderColor: colors.border,
                        borderStyle: node.executed || document?.what === node.step_id ? 'solid' : 'dashed',
                        borderWidth: document?.what === node.step_id ? 2 : 1,
                        bgcolor: colors.bg,
                        opacity: node.executed || document?.what === node.step_id ? 1 : 0.8,
                        transition: 'all 0.2s ease',
                        '&:hover': hasChildren ? {
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                            transform: 'translateY(-1px)',
                            boxShadow: theme.shadows[2]
                        } : {}
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {/* Ícone de expansão */}
                        <Box sx={{ width: 24, display: 'flex', justifyContent: 'center' }}>
                            {hasChildren ? (
                                <IconButton size="small" sx={{ p: 0 }}>
                                    {isExpanded ?
                                        <ExpandLess fontSize="small" /> :
                                        <ExpandMore fontSize="small" />
                                    }
                                </IconButton>
                            ) : (
                                <Box sx={{ width: 20 }} />
                            )}
                        </Box>

                        {/* Ícone de status */}
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getStatusIcon()}
                        </Box>

                        {/* Conteúdo principal */}
                        <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: document?.what === node.step_id ? 'bold' : 'medium',
                                        color: colors.text,
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    {node.level}. {node.step_name}
                                </Typography>

                                {/* Chips de status */}
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    {node.executed && (
                                        <Chip
                                            label="✓ Executado"
                                            size="small"
                                            color="success"
                                            variant="filled"
                                            sx={{ height: 18, fontSize: '0.65rem' }}
                                        />
                                    )}

                                    {document?.what === node.step_id && (
                                        <Chip
                                            label="► Atual"
                                            size="small"
                                            color="primary"
                                            variant="filled"
                                            sx={{ height: 18, fontSize: '0.65rem' }}
                                        />
                                    )}

                                    {!node.executed && document?.what !== node.step_id && (
                                        <Chip
                                            label="○ Pendente"
                                            size="small"
                                            variant="outlined"
                                            sx={{ height: 18, fontSize: '0.65rem' }}
                                        />
                                    )}
                                </Box>

                                {/* Indicador de repetição */}
                                {workflowData?.hierarchy?.filter(s => s.step_name === node.step_name).length > 1 && (
                                    <Chip
                                        label={`Nível ${node.level}`}
                                        size="small"
                                        variant="outlined"
                                        color="info"
                                        sx={{
                                            height: 18,
                                            fontSize: '0.6rem',
                                            '& .MuiChip-label': { px: 0.5 }
                                        }}
                                    />
                                )}
                            </Box>

                            {/* Informações adicionais */}
                            <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                {/* Responsáveis */}
                                {node.client && node.client.length > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                        👤 Responsáveis: {node.client.map(clientPk => {
                                            const userData = metaData?.who?.find(user => user.pk === clientPk);
                                            return userData ? userData.name : clientPk;
                                        }).join(', ')}
                                    </Typography>
                                )}

                                {/* Data de execução */}
                                {node.executed && node.executedAt && (
                                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 500 }}>
                                        📅 {new Date(node.executedAt.replace(' às ', ' ')).toLocaleDateString('pt-PT')}
                                    </Typography>
                                )}

                                {/* Caminho */}
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                    🔗 {node.path}
                                </Typography>
                            </Box>

                            {/* Memo/Observações */}
                            {node.memo && (
                                <Box sx={{
                                    mt: 1.5,
                                    p: 1,
                                    bgcolor: 'rgba(0,0,0,0.02)',
                                    borderRadius: 1,
                                    borderLeft: '3px solid',
                                    borderLeftColor: 'info.main'
                                }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                        📝 OBSERVAÇÕES:
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', lineHeight: 1.3 }}>
                                        {node.memo}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Paper>

                {/* Filhos */}
                {hasChildren && isExpanded && (
                    <Box sx={{ position: 'relative' }}>
                        {/* Linha vertical conectora */}
                        <Box sx={{
                            position: 'absolute',
                            left: level * 3 + 2,
                            top: 0,
                            bottom: 0,
                            width: 2,
                            bgcolor: 'divider',
                            opacity: 0.3
                        }} />

                        {node.children.map((child, index) => (
                            <WorkflowTreeNode
                                key={child.uniqueKey}
                                node={child}
                                level={level + 1}
                            />
                        ))}
                    </Box>
                )}
            </Box>
        );
    };

    // Calcular estatísticas
    const getWorkflowStats = () => {
        if (!workflowData?.hierarchy) return null;

        const totalSteps = workflowData.hierarchy.length;
        const executedSteps = workflowData.hierarchy.filter(step =>
            mappedWorkflow?.find(mapped => mapped.step_id === step.step_id && mapped.executed)
        ).length;
        const currentStepIndex = workflowData.hierarchy.findIndex(step => step.step_id === document?.what);
        const progressPercentage = totalSteps > 0 ? (executedSteps / totalSteps) * 100 : 0;

        return {
            totalSteps,
            executedSteps,
            currentStepIndex,
            progressPercentage,
            pendingSteps: totalSteps - executedSteps
        };
    };

    const mappedWorkflow = workflowData ?
        mapExecutedSteps(workflowData.hierarchy, steps) : null;

    const workflowTreeData = mappedWorkflow ?
        buildWorkflowTree(mappedWorkflow) : null;

    const stats = getWorkflowStats();

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
            <Paper sx={{ p: 3, textAlign: 'center' }}>
                <WorkflowIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    Workflow não disponível
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Não foi possível carregar o processo completo para este tipo de documento.
                </Typography>
            </Paper>
        );
    }

    return (
        <Box>
            {/* Cabeçalho com estatísticas */}
            <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <WorkflowIcon color="primary" />
                    <Typography variant="h6" sx={{ flex: 1 }}>
                        Processo Completo - {document?.tt_type}
                    </Typography>
                    <Button
                        size="small"
                        onClick={() => setExpandedWorkflow(!expandedWorkflow)}
                        endIcon={expandedWorkflow ? <ExpandLess /> : <ExpandMore />}
                        variant="outlined"
                    >
                        {expandedWorkflow ? 'Recolher' : 'Expandir'}
                    </Button>
                </Box>

                {stats && (
                    <Box>
                        {/* Barra de progresso */}
                        <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" fontWeight="medium">
                                    Progresso do Processo
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {stats.executedSteps} de {stats.totalSteps} passos
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={stats.progressPercentage}
                                sx={{ height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                {stats.progressPercentage.toFixed(1)}% concluído
                            </Typography>
                        </Box>

                        {/* Estatísticas */}
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" color="success.main" fontWeight="bold">
                                    {stats.executedSteps}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Executados
                                </Typography>
                            </Box>

                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" color="primary.main" fontWeight="bold">
                                    1
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Atual
                                </Typography>
                            </Box>

                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" color="grey.600" fontWeight="bold">
                                    {stats.pendingSteps}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Pendentes
                                </Typography>
                            </Box>

                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" color="info.main" fontWeight="bold">
                                    {Math.max(...workflowData.hierarchy?.map(s => s.level) || [0])}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Níveis
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                )}
            </Paper>

            {/* Árvore do workflow */}
            <Collapse in={expandedWorkflow}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Legenda:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Chip
                                icon={<CheckCircleIcon />}
                                label="Executado"
                                size="small"
                                color="success"
                            />
                            <Chip
                                icon={<CurrentIcon />}
                                label="Atual"
                                size="small"
                                color="primary"
                            />
                            <Chip
                                icon={<PendingIcon />}
                                label="Pendente"
                                size="small"
                                variant="outlined"
                            />
                        </Box>
                    </Box>

                    {/* Renderizar árvore */}
                    <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
                        {workflowTreeData && workflowTreeData.map((node) => (
                            <WorkflowTreeNode
                                key={node.uniqueKey}
                                node={node}
                            />
                        ))}
                    </Box>
                </Paper>
            </Collapse>
        </Box>
    );
};

export default WorkflowViewer;