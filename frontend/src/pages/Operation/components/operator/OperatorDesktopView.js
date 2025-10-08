import React, { useState, useMemo } from 'react';
import {
    Box, Card, CardContent, Typography, Grid as Grid, Stack, Chip, Button,
    AppBar, Toolbar, IconButton, Divider, Alert, LinearProgress,
    Accordion, AccordionSummary, AccordionDetails, Badge
} from '@mui/material';
import {
    Refresh, CheckCircle, Schedule, Assignment, TaskAlt, ExpandMore
} from '@mui/icons-material';

// Componentes
import LoadingContainer from '../common/LoadingContainer';
import ErrorContainer from '../common/ErrorContainer';
import TaskCompletionDialog from '../common/TaskCompletionDialog';
import MESSAGES from '../../constants/messages';
import { useOperationsUnifiedV2 } from '../../hooks/useOperationsUnifiedV2';
import { useUserRole } from '../../hooks/useUserRole';
import { getInstallationLicenseColor } from '../../utils/formatters';

/**
 * VISTA DESKTOP PARA OPERADORES - SIMPLIFICADA
 *
 * Foco: Tarefas do operador de forma clara e organizada
 * - Interface limpa similar ao mobile mas otimizada para desktop
 * - Cards de tarefas com mais espaço e informação
 * - Estatísticas claras no topo
 */
const OperatorDesktopView = ({ user, deviceInfo }) => {
    // Estados locais
    const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // Obter role do utilizador
    const { userRole } = useUserRole(user);

    // Fetch de dados - APENAS tarefas do utilizador
    const {
        userTasks,
        pendingTasks,
        completedTasks,
        stats,
        isLoading,
        error,
        completeTask,
        refresh
    } = useOperationsUnifiedV2({
        autoLoad: true,
        includeUserTasks: true,
        includeMetas: false
    });

    // Tarefas já vêm com nomes do backend - não precisa enriquecer
    const enrichedTasks = useMemo(() => {
        console.log('🖥️🖥️🖥️ DESKTOP - Tarefas recebidas:', userTasks?.length || 0);

        if (userTasks && userTasks.length > 0) {
            console.log('🖥️🖥️🖥️ DESKTOP - Primeira tarefa:', {
                pk: userTasks[0].pk,
                instalacao_nome: userTasks[0].instalacao_nome,
                acao_operacao: userTasks[0].acao_operacao,
                modo_operacao: userTasks[0].modo_operacao,
                completed: userTasks[0].completed,
                description: userTasks[0].description
            });
        }

        return userTasks || [];
    }, [userTasks]);

    // Separar tarefas pendentes e concluídas
    const tasksPending = enrichedTasks.filter(t => !t.completed);
    const tasksCompleted = enrichedTasks.filter(t => t.completed);

    // Taxa de conclusão
    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    // Agrupar tarefas pendentes por instalação
    const tasksByInstallation = useMemo(() => {
        const grouped = {};

        tasksPending.forEach(task => {
            const instalacao = task.instalacao_nome || 'Sem Instalação';
            if (!grouped[instalacao]) {
                grouped[instalacao] = {
                    tasks: [],
                    licenseStatus: task.tt_instalacaolicenciamento
                };
            }
            grouped[instalacao].tasks.push(task);
        });

        // Ordenar instalações alfabeticamente
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [tasksPending]);

    const completedTasksByInstallation = useMemo(() => {
        const grouped = {};

        tasksCompleted.forEach(task => {
            const instalacao = task.instalacao_nome || 'Sem Instalação';
            if (!grouped[instalacao]) {
                grouped[instalacao] = {
                    tasks: [],
                    licenseStatus: task.tt_instalacaolicenciamento
                };
            }
            grouped[instalacao].tasks.push(task);
        });

        // Ordenar instalações alfabeticamente
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [tasksCompleted]);

    console.log('📦 Tarefas agrupadas por instalação:', tasksByInstallation.length, 'instalações');
    console.log('✅ Tarefas concluídas agrupadas:', completedTasksByInstallation.length, 'instalações');

    // Handlers
    const handleCompleteTask = async (taskId, completionData) => {
        try {
            await completeTask(taskId, completionData);
            setCompletionDialogOpen(false);
            setSelectedTask(null);
        } catch (error) {
            console.error('Erro ao completar tarefa:', error);
        }
    };

    const handleTaskClick = (task) => {
        if (!task.completed) {
            setSelectedTask(task);
            setCompletionDialogOpen(true);
        }
    };

    // Loading state
    if (isLoading) {
        return <LoadingContainer message={MESSAGES.LOADING.OPERATIONS} fullHeight />;
    }

    // Error state
    if (error) {
        return (
            <ErrorContainer
                error={error}
                message={MESSAGES.ERROR.LOAD_OPERATIONS}
                onRetry={refresh}
                fullHeight
            />
        );
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
            {/* AppBar */}
            <AppBar position="sticky" elevation={1}>
                <Toolbar>
                    <Assignment sx={{ mr: 2 }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {MESSAGES.UI.MY_TASKS}
                    </Typography>
                    <Typography variant="body2" sx={{ mr: 2, opacity: 0.9 }}>
                        Olá, {user?.user_name || (userRole === 'supervisor' ? 'Supervisor' : userRole === 'manager' ? 'Gestor' : 'Operador')}
                    </Typography>
                    <IconButton color="inherit" onClick={refresh} aria-label={MESSAGES.UI.REFRESH}>
                        <Refresh />
                    </IconButton>
                </Toolbar>
            </AppBar>

            {/* Conteúdo */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                {/* Estatísticas */}
                <Grid container spacing={3} mb={4}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                            <CardContent>
                                <Stack spacing={1}>
                                    <Schedule sx={{ fontSize: 40 }} />
                                    <Typography variant="h3" fontWeight="bold">
                                        {tasksPending.length}
                                    </Typography>
                                    <Typography variant="body2">
                                        Tarefas Pendentes
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                            <CardContent>
                                <Stack spacing={1}>
                                    <CheckCircle sx={{ fontSize: 40 }} />
                                    <Typography variant="h3" fontWeight="bold">
                                        {tasksCompleted.length}
                                    </Typography>
                                    <Typography variant="body2">
                                        Tarefas Concluídas
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                            <CardContent>
                                <Stack spacing={1}>
                                    <Assignment sx={{ fontSize: 40 }} />
                                    <Typography variant="h3" fontWeight="bold">
                                        {stats.total}
                                    </Typography>
                                    <Typography variant="body2">
                                        Total de Tarefas
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                            <CardContent>
                                <Stack spacing={1}>
                                    <TaskAlt sx={{ fontSize: 40 }} />
                                    <Typography variant="h3" fontWeight="bold">
                                        {completionRate}%
                                    </Typography>
                                    <Typography variant="body2">
                                        Taxa de Conclusão
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Barra de Progresso */}
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight="600">
                                Progresso Geral
                            </Typography>
                            <Chip
                                label={`${completionRate}%`}
                                color={completionRate >= 80 ? 'success' : completionRate >= 50 ? 'warning' : 'error'}
                            />
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={completionRate}
                            sx={{
                                height: 12,
                                borderRadius: 6,
                                '& .MuiLinearProgress-bar': {
                                    bgcolor: completionRate >= 80 ? 'success.main' : completionRate >= 50 ? 'warning.main' : 'error.main'
                                }
                            }}
                        />
                        <Stack direction="row" justifyContent="space-between" mt={1}>
                            <Typography variant="caption" color="text.secondary">
                                {stats.completed} concluídas
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {stats.pending} pendentes
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Total: {stats.total}
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>

                {/* Tarefas Pendentes */}
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Schedule /> Tarefas Pendentes ({tasksPending.length})
                </Typography>

                {tasksPending.length === 0 ? (
                    <Alert severity="success" sx={{ mb: 4 }}>
                        🎉 Excelente! Não tem tarefas pendentes.
                    </Alert>
                ) : (
                    <Stack spacing={2} mb={4}>
                        {tasksByInstallation.map(([instalacao, group]) => {
                            const licenseColor = getInstallationLicenseColor(group.licenseStatus);
                            return (
                            <Accordion
                                key={instalacao}
                                defaultExpanded={group.tasks.length <= 5}
                                sx={{
                                    '&:before': {
                                        display: 'none',
                                    },
                                    boxShadow: 2,
                                    borderRadius: 1,
                                    borderLeft: `6px solid ${licenseColor}`,
                                    '&.Mui-expanded': {
                                        margin: 0,
                                        mb: 2
                                    }
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMore />}
                                    sx={{
                                        bgcolor: 'background.paper',
                                        borderRadius: 1,
                                        '&:hover': {
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                >
                                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                                        <Box display="flex" alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 14,
                                                    height: 14,
                                                    borderRadius: '50%',
                                                    bgcolor: licenseColor,
                                                    mr: 1.5,
                                                    flexShrink: 0
                                                }}
                                            />
                                            <Typography variant="h6" fontWeight="600">
                                                {instalacao}
                                            </Typography>
                                        </Box>
                                        <Badge
                                            badgeContent={group.tasks.length}
                                            color="warning"
                                            sx={{ mr: 2 }}
                                        />
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ pt: 2 }}>
                                    <Grid container spacing={3}>
                                        {group.tasks.map((task) => (
                                            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={task.pk}>
                                                <Card
                                                    sx={{
                                                        borderLeft: 4,
                                                        borderColor: 'warning.main',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        '&:hover': {
                                                            transform: 'translateY(-4px)',
                                                            boxShadow: 4
                                                        }
                                                    }}
                                                    onClick={() => handleTaskClick(task)}
                                                >
                                                    <CardContent>
                                                        <Stack spacing={2}>
                                                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                                                <Typography variant="subtitle1" fontWeight="600">
                                                                    {task.acao_operacao || 'Ação'}
                                                                </Typography>
                                                                <Chip
                                                                    label="Pendente"
                                                                    color="warning"
                                                                    size="small"
                                                                    icon={<Schedule />}
                                                                />
                                                            </Box>

                                                            <Divider />

                                                            <Stack spacing={1}>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    <strong>Modo:</strong> {task.modo_operacao || '-'}
                                                                </Typography>

                                                                {task.dia_operacao && (
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        <strong>Dia:</strong> {task.dia_operacao}
                                                                    </Typography>
                                                                )}
                                                            </Stack>

                                                            <Button
                                                                variant="contained"
                                                                color="success"
                                                                fullWidth
                                                                startIcon={<TaskAlt />}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleTaskClick(task);
                                                                }}
                                                            >
                                                                Concluir Tarefa
                                                            </Button>
                                                        </Stack>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>
                            );
                        })}
                    </Stack>
                )}

                {/* Tarefas Concluídas */}
                {tasksCompleted.length > 0 && (
                    <>
                        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <CheckCircle /> Tarefas Concluídas ({tasksCompleted.length})
                        </Typography>

                        <Stack spacing={2}>
                            {completedTasksByInstallation.map(([instalacao, group]) => {
                                const licenseColor = getInstallationLicenseColor(group.licenseStatus);
                                return (
                                <Accordion
                                    key={instalacao}
                                    defaultExpanded={false}
                                    sx={{
                                        '&:before': {
                                            display: 'none',
                                        },
                                        boxShadow: 2,
                                        borderRadius: 1,
                                        borderLeft: `6px solid ${licenseColor}`,
                                        '&.Mui-expanded': {
                                            margin: 0,
                                            mb: 2
                                        }
                                    }}
                                >
                                    <AccordionSummary
                                        expandIcon={<ExpandMore />}
                                        sx={{
                                            bgcolor: 'success.lighter',
                                            borderRadius: 1,
                                            '&:hover': {
                                                bgcolor: 'success.light'
                                            }
                                        }}
                                    >
                                        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                                            <Box display="flex" alignItems="center">
                                                <Box
                                                    sx={{
                                                        width: 14,
                                                        height: 14,
                                                        borderRadius: '50%',
                                                        bgcolor: licenseColor,
                                                        mr: 1.5,
                                                        flexShrink: 0
                                                    }}
                                                />
                                                <Typography variant="h6" fontWeight="600">
                                                    {instalacao}
                                                </Typography>
                                            </Box>
                                            <Badge
                                                badgeContent={group.tasks.length}
                                                color="success"
                                                sx={{ mr: 2 }}
                                            />
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ pt: 2 }}>
                                        <Grid container spacing={3}>
                                            {group.tasks.map((task) => (
                                                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={task.pk}>
                                                    <Card
                                                        sx={{
                                                            borderLeft: 4,
                                                            borderColor: 'success.main',
                                                            opacity: 0.8
                                                        }}
                                                    >
                                                        <CardContent>
                                                            <Stack spacing={2}>
                                                                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                                                    <Typography variant="subtitle1" fontWeight="600">
                                                                        {task.acao_operacao || 'Ação'}
                                                                    </Typography>
                                                                    <Chip
                                                                        label="Concluída"
                                                                        color="success"
                                                                        size="small"
                                                                        icon={<CheckCircle />}
                                                                    />
                                                                </Box>

                                                                <Divider />

                                                                <Stack spacing={1}>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        <strong>Modo:</strong> {task.modo_operacao || '-'}
                                                                    </Typography>

                                                                    {task.dia_operacao && (
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            <strong>Dia:</strong> {task.dia_operacao}
                                                                        </Typography>
                                                                    )}
                                                                </Stack>
                                                            </Stack>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                                );
                            })}
                        </Stack>
                    </>
                )}
            </Box>

            {/* Dialog de conclusão */}
            {selectedTask && (
                <TaskCompletionDialog
                    open={completionDialogOpen}
                    task={selectedTask}
                    onClose={() => {
                        setCompletionDialogOpen(false);
                        setSelectedTask(null);
                    }}
                    onComplete={handleCompleteTask}
                />
            )}
        </Box>
    );
};

export default OperatorDesktopView;
