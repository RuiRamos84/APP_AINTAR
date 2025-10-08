import React, { useState } from 'react';
import {
    Box, useMediaQuery, Grid, Card, CardContent, Typography,
    AppBar, Toolbar, IconButton, Button, Container, Stack,
    Chip, Divider, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
    SwapHoriz, Dashboard, Assignment, People, Analytics,
    Phone, Computer, Tablet, CheckCircle, ExpandMore
} from '@mui/icons-material';

// Componentes comuns
import LoadingContainer from '../common/LoadingContainer';
import ErrorContainer from '../common/ErrorContainer';
import TaskCompletionDialog from '../common/TaskCompletionDialog';
import { useMetaData } from '../../../../contexts/MetaDataContext';
import { enrichTaskWithAnalysisNames } from '../../utils/formatters';

/**
 * VIEW UNIFICADA RESPONSIVA SIMPLIFICADA
 *
 * Combina funcionalidades de supervisor e operador
 * numa interface adaptativa e intuitiva
 */
const UnifiedResponsiveView = ({
    operationsData,
    user,
    onViewModeChange,
    allowViewSwitch,
    deviceInfo
}) => {

    // Breakpoints responsivos
    const isMobile = useMediaQuery('(max-width:768px)');
    const isTablet = useMediaQuery('(min-width:769px) and (max-width:1024px)');
    const isDesktop = useMediaQuery('(min-width:1025px)');

    // Metadados para mapeamento
    const { metaData } = useMetaData();

    // Estados simplificados
    const [activeSection, setActiveSection] = useState('dashboard');
    const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // Verificação de segurança: operationsData pode ser undefined
    const safeOperationsData = operationsData || {
        operations: [],
        userTasks: [],
        urgentTasks: [],
        analytics: null
    };

    // Dados computados
    const stats = {
        totalOperations: safeOperationsData.operations?.length || 0,
        userTasks: safeOperationsData.userTasks?.length || 0,
        completedTasks: safeOperationsData.userTasks?.filter(t => t.completed).length || 0,
        urgentTasks: safeOperationsData.urgentTasks?.length || 0,
        efficiency: safeOperationsData.analytics?.overview?.completionRate || 0
    };

    // Detectar se é supervisor
    const isSupervisor = user?.permissions?.some(p => p.includes('supervisor')) ||
                        user?.role?.toLowerCase().includes('supervisor');

    // Handler para conclusão de tarefa
    const handleCompleteTask = async (taskId, completionData) => {
        try {
            // A função completeTask do hook já faz refresh automático
            await operationsData.completeTask?.(taskId, completionData);
            // Fechar dialog
            setCompletionDialogOpen(false);
            setSelectedTask(null);
        } catch (error) {
            console.error('Erro ao completar tarefa:', error);
            throw error;
        }
    };

    // Configuração responsiva
    const getColumns = () => {
        if (isMobile) return 1;
        if (isTablet) return 2;
        return 3;
    };

    // Loading states
    if (operationsData?.isLoading) {
        return (
            <LoadingContainer
                message="A carregar vista unificada..."
                variant="linear"
                fullHeight={true}
            />
        );
    }

    if (operationsData?.hasError) {
        return (
            <ErrorContainer
                error={operationsData.error}
                onRetry={operationsData.refreshAll}
                onClear={operationsData.clearError}
                variant="card"
                fullHeight={true}
            />
        );
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header unificado - SEM position fixed para respeitar sidebar */}
            <AppBar position="static" elevation={1}>
                <Toolbar>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">
                            Operações - Vista Unificada
                        </Typography>
                        <Box display="flex" gap={1} mt={0.5}>
                            <Chip size="small" label={`${stats.totalOperations} operações`} />
                            <Chip size="small" label={`${stats.userTasks} tarefas`} />
                            {stats.urgentTasks > 0 && (
                                <Chip size="small" label={`${stats.urgentTasks} urgentes`} color="warning" />
                            )}
                        </Box>
                    </Box>

                    <Box display="flex" gap={1}>
                        {allowViewSwitch && (
                            <>
                                <IconButton
                                    color="inherit"
                                    onClick={() => onViewModeChange('operator-mobile')}
                                    title="Vista Mobile"
                                >
                                    <Phone />
                                </IconButton>
                                <IconButton
                                    color="inherit"
                                    onClick={() => onViewModeChange('supervisor-desktop')}
                                    title="Vista Desktop"
                                >
                                    <Computer />
                                </IconButton>
                            </>
                        )}
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Navegação por seções */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Stack direction="row" spacing={2} sx={{ py: 1 }}>
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: <Dashboard /> },
                        { id: 'tasks', label: 'Minhas Tarefas', icon: <Assignment /> },
                        ...(isSupervisor ? [
                            { id: 'team', label: 'Equipa', icon: <People /> },
                            { id: 'analytics', label: 'Analytics', icon: <Analytics /> }
                        ] : [])
                    ].map(section => (
                        <Button
                            key={section.id}
                            variant={activeSection === section.id ? 'contained' : 'text'}
                            startIcon={section.icon}
                            onClick={() => setActiveSection(section.id)}
                            size="small"
                        >
                            {section.label}
                        </Button>
                    ))}
                </Stack>
            </Box>

            {/* Conteúdo principal */}
            <Container maxWidth="xl" sx={{ flex: 1, py: 2, overflow: 'auto' }}>
                {activeSection === 'dashboard' && (
                    <UnifiedDashboard
                        operationsData={operationsData}
                        stats={stats}
                        isSupervisor={isSupervisor}
                        columns={getColumns()}
                    />
                )}

                {activeSection === 'tasks' && (
                    <UnifiedTasks
                        operationsData={operationsData}
                        metaData={metaData}
                        columns={getColumns()}
                        onTaskSelect={(task) => {
                            setSelectedTask(task);
                            setCompletionDialogOpen(true);
                        }}
                    />
                )}

                {activeSection === 'team' && isSupervisor && (
                    <UnifiedTeam
                        operationsData={operationsData}
                        columns={getColumns()}
                    />
                )}

                {activeSection === 'analytics' && isSupervisor && (
                    <UnifiedAnalytics
                        operationsData={operationsData}
                        columns={getColumns()}
                    />
                )}
            </Container>

            {/* Task Completion Dialog */}
            <TaskCompletionDialog
                open={completionDialogOpen}
                onClose={() => {
                    setCompletionDialogOpen(false);
                    setSelectedTask(null);
                }}
                task={selectedTask}
                onComplete={handleCompleteTask}
            />
        </Box>
    );
};

// Componentes unificados simplificados
const UnifiedDashboard = ({ operationsData, stats, isSupervisor, columns }) => (
    <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
            <Card>
                <CardContent>
                    <Typography variant="h5" gutterBottom>
                        📊 Resumo Geral
                    </Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                        <Chip label={`${stats.totalOperations} Operações`} color="primary" />
                        <Chip label={`${stats.userTasks} Tarefas`} color="info" />
                        <Chip label={`${stats.completedTasks} Concluídas`} color="success" />
                        {stats.urgentTasks > 0 && (
                            <Chip label={`${stats.urgentTasks} Urgentes`} color="error" />
                        )}
                        <Chip label={`${Math.round(stats.efficiency)}% Eficiência`} color="secondary" />
                    </Stack>
                </CardContent>
            </Card>
        </Grid>

        {isSupervisor && (
            <Grid size={{ xs: 12 }}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            🎯 Visão Supervisor
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Estatísticas da equipa e métricas de performance.
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
        )}

        <Grid size={{ xs: 12 }}>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        📈 Atividade Recente
                    </Typography>
                    {operationsData?.recentActivity?.length > 0 ? (
                        <Stack spacing={1}>
                            {operationsData.recentActivity.slice(0, 5).map((activity, index) => (
                                <Typography key={index} variant="body2">
                                    • {activity.description || 'Atividade recente'}
                                </Typography>
                            ))}
                        </Stack>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Nenhuma atividade recente
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Grid>
    </Grid>
);

const UnifiedTasks = ({ operationsData, metaData, columns, onTaskSelect }) => {
    const userTasks = operationsData?.userTasks || [];

    // Enriquecer tarefas com nomes de análise mapeados
    const enrichedTasks = React.useMemo(() => {
        return userTasks.map(task => enrichTaskWithAnalysisNames(task, metaData));
    }, [userTasks, metaData]);

    const pendingTasks = enrichedTasks.filter(t => !t.completed);
    const completedTasks = enrichedTasks.filter(t => t.completed);

    // Estado para controlar visualização de tarefas concluídas
    const [showCompleted, setShowCompleted] = React.useState(false);

    // Agrupar tarefas pendentes por instalação
    const groupedTasks = React.useMemo(() => {
        const groups = {};
        pendingTasks.forEach(task => {
            const location = task.location || task.instalacao_nome;
            if (!groups[location]) {
                groups[location] = [];
            }
            groups[location].push(task);
        });
        return groups;
    }, [pendingTasks]);

    // Agrupar tarefas concluídas por instalação
    const groupedCompletedTasks = React.useMemo(() => {
        const groups = {};
        completedTasks.forEach(task => {
            const location = task.location || task.instalacao_nome;
            if (!groups[location]) {
                groups[location] = [];
            }
            groups[location].push(task);
        });
        return groups;
    }, [completedTasks]);

    const renderTaskCard = (task, showLocation = true, isCompleted = false) => (
        <Box
            key={task.pk || task.id}
            sx={{
                p: 2,
                border: 1,
                borderColor: isCompleted ? 'success.light' : 'divider',
                borderRadius: 1,
                bgcolor: isCompleted ? 'success.50' : 'background.paper',
                opacity: isCompleted ? 0.85 : 1,
            }}
        >
            <Stack spacing={1.5}>
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle1" fontWeight={500} sx={{ flex: 1 }}>
                        {task.acao_operacao}
                    </Typography>
                    {isCompleted && (
                        <CheckCircle color="success" fontSize="small" />
                    )}
                </Box>

                {showLocation && (
                    <Typography variant="body2" color="text.secondary">
                        📍 {task.location || task.instalacao_nome}
                    </Typography>
                )}

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                        size="small"
                        label={task.instalacao_tipo || 'ETAR'}
                        color="primary"
                        variant="outlined"
                    />
                    <Chip
                        size="small"
                        label={task.modo_operacao}
                        color="info"
                        variant="outlined"
                    />
                    {isCompleted && (
                        <Chip
                            size="small"
                            label="✓ Concluída"
                            color="success"
                        />
                    )}
                </Stack>

                {isCompleted && task.valuetext && (
                    <Box sx={{
                        mt: 1,
                        p: 1.5,
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider'
                    }}>
                        {(() => {
                            const taskType = task.tt_operacaoaccao_type || task.operacao_tipo;

                            // Tipo 1: Numérico
                            if (taskType === 1) {
                                return (
                                    <>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            Valor registado:
                                        </Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600, color: 'primary.main' }}>
                                            {task.valuetext}
                                        </Typography>
                                    </>
                                );
                            }

                            // Tipo 2: Texto/Observações
                            if (taskType === 2) {
                                return (
                                    <>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            Observações:
                                        </Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                            {task.valuetext}
                                        </Typography>
                                    </>
                                );
                            }

                            // Tipo 3: Referência
                            if (taskType === 3) {
                                // O valuetext contém a pk, mostrar o refvalue se disponível
                                const displayValue = task.tt_operacaoaccao_refvalue || task.valuetext;
                                return (
                                    <>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            Seleção:
                                        </Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                                            {displayValue}
                                        </Typography>
                                    </>
                                );
                            }

                            // Tipo 4: Boolean
                            if (taskType === 4) {
                                const displayValue = task.valuetext === '1' ? '✓ Confirmado' : '✗ Não confirmado';
                                return (
                                    <>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            Estado:
                                        </Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                                            {displayValue}
                                        </Typography>
                                    </>
                                );
                            }

                            // Tipo 5: Análise
                            if (taskType === 5) {
                                // Verificar se é só recolha (valuetext === '1') ou tem valores
                                if (task.valuetext === '1' || task.valuetext === '0') {
                                    return (
                                        <>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Resultado:
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                                                {task.valuetext === '1' ? '✓ Recolha realizada' : '✗ Recolha não realizada'}
                                            </Typography>
                                        </>
                                    );
                                } else {
                                    // Contém valores das análises
                                    return (
                                        <>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Valores registados:
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600, color: 'primary.main' }}>
                                                {task.valuetext}
                                            </Typography>
                                        </>
                                    );
                                }
                            }

                            // Fallback: mostrar valuetext genérico
                            return (
                                <>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        Resposta:
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                        {task.valuetext}
                                    </Typography>
                                </>
                            );
                        })()}
                    </Box>
                )}

                {!isCompleted && (
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => onTaskSelect?.(task)}
                            startIcon={<CheckCircle />}
                        >
                            Concluir
                        </Button>
                    </Stack>
                )}
            </Stack>
        </Box>
    );

    return (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Typography variant="h5">
                        📝 Minhas Tarefas do Dia
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Chip label={`${pendingTasks.length} Pendentes`} color="warning" size="small" />
                        <Chip label={`${completedTasks.length} Concluídas`} color="success" size="small" />
                    </Stack>
                </Box>
            </Grid>

            {pendingTasks.length > 0 ? (
                Object.entries(groupedTasks).map(([location, tasks]) => {
                    const isMultipleTasks = tasks.length > 1;

                    if (!isMultipleTasks) {
                        // Tarefa única - mostrar diretamente sem agrupamento
                        const task = tasks[0];
                        return (
                            <Grid size={{ xs: 12, md: columns > 1 ? 6 : 12, lg: columns > 2 ? 4 : columns > 1 ? 6 : 12 }} key={task.pk || task.id}>
                                <Card>
                                    <CardContent>
                                        {renderTaskCard(task, true, false)}
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    }

                    // Múltiplas tarefas - usar Accordion
                    return (
                        <Grid size={{ xs: 12 }} key={location}>
                            <Accordion defaultExpanded={false}>
                                <AccordionSummary
                                    expandIcon={<ExpandMore />}
                                    aria-controls={`panel-${location}-content`}
                                    id={`panel-${location}-header`}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                        <Typography variant="h6" sx={{ flex: 1 }}>
                                            📍 {location}
                                        </Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Chip
                                                size="small"
                                                label={tasks[0].instalacao_tipo || 'ETAR'}
                                                color="primary"
                                            />
                                            <Chip
                                                size="small"
                                                label={`${tasks.length} tarefas`}
                                                color="warning"
                                            />
                                        </Stack>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack spacing={2}>
                                        {tasks.map(task => renderTaskCard(task, false, false))}
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                        </Grid>
                    );
                })
            ) : (
                <Grid size={{ xs: 12 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" textAlign="center" color="text.secondary">
                                ✅ Nenhuma tarefa pendente para hoje
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            )}

            {/* Seção de Tarefas Concluídas */}
            {completedTasks.length > 0 && (
                <>
                    <Grid size={{ xs: 12 }}>
                        <Divider sx={{ my: 2 }}>
                            <Button
                                variant="text"
                                onClick={() => setShowCompleted(!showCompleted)}
                                endIcon={<ExpandMore sx={{ transform: showCompleted ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />}
                            >
                                Tarefas Concluídas ({completedTasks.length})
                            </Button>
                        </Divider>
                    </Grid>

                    {showCompleted && Object.entries(groupedCompletedTasks).map(([location, tasks]) => {
                        const isMultipleTasks = tasks.length > 1;

                        if (!isMultipleTasks) {
                            const task = tasks[0];
                            return (
                                <Grid size={{ xs: 12, md: columns > 1 ? 6 : 12, lg: columns > 2 ? 4 : columns > 1 ? 6 : 12 }} key={`completed-${task.pk || task.id}`}>
                                    <Card>
                                        <CardContent>
                                            {renderTaskCard(task, true, true)}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        }

                        return (
                            <Grid size={{ xs: 12 }} key={`completed-${location}`}>
                                <Accordion defaultExpanded={false}>
                                    <AccordionSummary
                                        expandIcon={<ExpandMore />}
                                        sx={{
                                            bgcolor: 'success.50',
                                            borderLeft: 3,
                                            borderLeftColor: 'success.main'
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                            <CheckCircle color="success" fontSize="small" />
                                            <Typography variant="h6" sx={{ flex: 1 }}>
                                                📍 {location}
                                            </Typography>
                                            <Stack direction="row" spacing={1}>
                                                <Chip
                                                    size="small"
                                                    label={tasks[0].instalacao_tipo || 'ETAR'}
                                                    color="primary"
                                                />
                                                <Chip
                                                    size="small"
                                                    label={`${tasks.length} concluídas`}
                                                    color="success"
                                                />
                                            </Stack>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Stack spacing={2}>
                                            {tasks.map(task => renderTaskCard(task, false, true))}
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
                            </Grid>
                        );
                    })}
                </>
            )}
        </Grid>
    );
};

const UnifiedTeam = ({ operationsData, columns }) => (
    <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
            <Typography variant="h5" gutterBottom>
                👥 Gestão de Equipa
            </Typography>
        </Grid>

        {operationsData?.operatorStats?.length > 0 ? (
            operationsData.operatorStats.map((operator, index) => (
                <Grid size={{ xs: 12, sm: columns > 1 ? 6 : 12, md: columns > 2 ? 4 : columns > 1 ? 6 : 12 }} key={index}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                {operator.name}
                            </Typography>
                            <Stack spacing={1}>
                                <Typography variant="body2">
                                    Total: {operator.totalTasks || 0}
                                </Typography>
                                <Typography variant="body2">
                                    Concluídas: {operator.completedTasks || 0}
                                </Typography>
                                <Typography variant="body2">
                                    Eficiência: {operator.efficiency || 0}%
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            ))
        ) : (
            <Grid size={{ xs: 12 }}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" textAlign="center" color="text.secondary">
                            Nenhum dado de equipa disponível
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
        )}
    </Grid>
);

const UnifiedAnalytics = ({ operationsData, columns }) => (
    <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
            <Typography variant="h5" gutterBottom>
                📊 Analytics Avançados
            </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Performance Geral
                    </Typography>
                    {operationsData?.analytics?.overview ? (
                        <Stack spacing={1}>
                            <Typography variant="body2">
                                Taxa de Conclusão: {Math.round(operationsData.analytics.overview.completionRate || 0)}%
                            </Typography>
                            <Typography variant="body2">
                                Total de Operações: {operationsData.analytics.overview.totalOperations || 0}
                            </Typography>
                            <Typography variant="body2">
                                Operadores Ativos: {operationsData.analytics.overview.activeOperators || 0}
                            </Typography>
                        </Stack>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Dados de analytics não disponíveis
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Tendências
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Métricas de tendência serão implementadas com mais dados históricos.
                    </Typography>
                </CardContent>
            </Card>
        </Grid>
    </Grid>
);

export default UnifiedResponsiveView;