import React, { useState, useMemo } from 'react';
import {
    Box, AppBar, Toolbar, Typography, IconButton, Badge,
    List, ListItem, ListItemText, Chip, Divider, Container, Stack, Card, CardContent,
    Button, Fab, Collapse, Alert, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
    Refresh, CheckCircle, Schedule, Assignment, ExpandMore, ExpandLess,
    TaskAlt, Notifications
} from '@mui/icons-material';

// Componentes
import LoadingContainer from '../common/LoadingContainer';
import ErrorContainer from '../common/ErrorContainer';
import TaskCompletionDialog from '../common/TaskCompletionDialog';
import MESSAGES from '../../constants/messages';
import { useOperationsUnifiedV2 } from '../../hooks/useOperationsUnifiedV2';
import { useUserRole } from '../../hooks/useUserRole';
import { getInstallationLicenseColor, formatCompletedTaskValue } from '../../utils/formatters';

/**
 * VISTA MOBILE PARA OPERADORES - SIMPLIFICADA
 *
 * Foco: Apenas as tarefas do dia
 * - Interface limpa e direta
 * - Cartões swipeable para completar tarefas
 * - Estatísticas básicas no topo
 * - Mobile-first design
 */
const OperatorMobileView = ({ user, deviceInfo }) => {
    // Estados locais
    const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showCompleted, setShowCompleted] = useState(false);

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
        includeMetas: false // Operadores não precisam ver todas as metas
    });

    // Tarefas já vêm com nomes do backend (instalacao_nome, acao_operacao, modo_operacao)
    // Não precisamos enriquecer!
    const enrichedTasks = useMemo(() => {
        // Retornar tarefas diretamente - já vêm com nomes do backend!
        return userTasks || [];
    }, [userTasks]);

    // Separar tarefas pendentes e concluídas
    const tasksToday = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filtered = enrichedTasks.filter(t => {
            const isPending = !t.completed;

            // Converter data da tarefa para Date object
            let taskDate;
            if (t.dia_operacao || t.data) {
                taskDate = new Date(t.dia_operacao || t.data);
                taskDate.setHours(0, 0, 0, 0);
            } else {
                taskDate = today;
            }

            const isToday = taskDate.getTime() === today.getTime();

            return isToday && isPending;
        });

        console.log('📅 Tarefas pendentes hoje:', filtered.length);
        return filtered;
    }, [enrichedTasks]);

    const tasksCompletedToday = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filtered = enrichedTasks.filter(t => {
            const isCompleted = t.completed;

            // Converter data da tarefa para Date object
            let taskDate;
            if (t.dia_operacao || t.data) {
                taskDate = new Date(t.dia_operacao || t.data);
                taskDate.setHours(0, 0, 0, 0);
            } else {
                taskDate = today;
            }

            const isToday = taskDate.getTime() === today.getTime();

            return isToday && isCompleted;
        });

        console.log('✅ Tarefas concluídas hoje:', filtered.length);
        return filtered;
    }, [enrichedTasks]);

    // Agrupar tarefas pendentes por instalação
    const tasksByInstallation = useMemo(() => {
        const grouped = {};

        tasksToday.forEach(task => {
            const instalacao = task.instalacao_nome || 'Sem Instalação';
            if (!grouped[instalacao]) {
                grouped[instalacao] = {
                    tasks: [],
                    licenseStatus: task.tt_instalacaolicenciamento // Capturar status de licenciamento
                };
            }
            grouped[instalacao].tasks.push(task);
        });

        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [tasksToday]);

    // Agrupar tarefas concluídas por instalação
    const completedTasksByInstallation = useMemo(() => {
        const grouped = {};

        tasksCompletedToday.forEach(task => {
            const instalacao = task.instalacao_nome || 'Sem Instalação';
            if (!grouped[instalacao]) {
                grouped[instalacao] = {
                    tasks: [],
                    licenseStatus: task.tt_instalacaolicenciamento // Capturar status de licenciamento
                };
            }
            grouped[instalacao].tasks.push(task);
        });

        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [tasksCompletedToday]);

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
            {/* AppBar fixo no topo */}
            <AppBar position="sticky" elevation={1}>
                <Toolbar>
                    <Assignment sx={{ mr: 1 }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {MESSAGES.UI.MY_TASKS}
                    </Typography>
                    <Typography variant="body2" sx={{ mr: 1, opacity: 0.9, fontSize: '0.75rem' }}>
                        Olá, {user?.user_name || (userRole === 'supervisor' ? 'Supervisor' : userRole === 'manager' ? 'Gestor' : 'Operador')}
                    </Typography>
                    <IconButton color="inherit" onClick={refresh} aria-label={MESSAGES.UI.REFRESH}>
                        <Refresh />
                    </IconButton>
                </Toolbar>
            </AppBar>

            {/* Conteúdo scrollable */}
            <Box sx={{ flex: 1, overflow: 'auto', pb: 10 }}>
                <Container maxWidth="sm" sx={{ py: 2 }}>
                    {/* Estatísticas do dia */}
                    <Card sx={{ mb: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                        <CardContent>
                            <Stack direction="row" spacing={3} justifyContent="space-around" alignItems="center">
                                <Box textAlign="center">
                                    <Typography variant="h3" fontWeight="bold">
                                        {tasksToday.length}
                                    </Typography>
                                    <Typography variant="caption">
                                        Pendentes
                                    </Typography>
                                </Box>
                                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'primary.light' }} />
                                <Box textAlign="center">
                                    <Typography variant="h3" fontWeight="bold">
                                        {tasksCompletedToday.length}
                                    </Typography>
                                    <Typography variant="caption">
                                        Concluídas
                                    </Typography>
                                </Box>
                                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'primary.light' }} />
                                <Box textAlign="center">
                                    <Typography variant="h3" fontWeight="bold">
                                        {stats.total}
                                    </Typography>
                                    <Typography variant="caption">
                                        Total
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* Tarefas Pendentes - Agrupadas por Instalação */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, display: 'flex', alignItems: 'center' }}>
                        <Schedule sx={{ mr: 1 }} />
                        Tarefas Pendentes ({tasksToday.length})
                    </Typography>

                    {tasksToday.length === 0 ? (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            🎉 Excelente! Não tem tarefas pendentes para hoje.
                        </Alert>
                    ) : (
                        <Stack spacing={2}>
                            {tasksByInstallation.map(([instalacao, group]) => {
                                const licenseColor = getInstallationLicenseColor(group.licenseStatus);
                                return (
                                <Accordion key={instalacao}>
                                    <AccordionSummary
                                        expandIcon={<ExpandMore />}
                                        sx={{
                                            borderLeft: `6px solid ${licenseColor}`,
                                            '&:hover': {
                                                bgcolor: 'action.hover'
                                            }
                                        }}
                                    >
                                        <Box display="flex" alignItems="center" width="100%">
                                            <Box
                                                sx={{
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: '50%',
                                                    bgcolor: licenseColor,
                                                    mr: 1.5,
                                                    flexShrink: 0
                                                }}
                                            />
                                            <Typography variant="subtitle1" fontWeight="600" sx={{ flexGrow: 1 }}>
                                                {instalacao}
                                            </Typography>
                                            <Badge badgeContent={group.tasks.length} color="warning" sx={{ mr: 2 }} />
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Stack spacing={2}>
                                            {group.tasks.map((task) => (
                                                <Card
                                                    key={task.pk}
                                                    sx={{
                                                        borderLeft: 4,
                                                        borderColor: 'warning.main',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        '&:active': {
                                                            transform: 'scale(0.98)',
                                                            bgcolor: 'action.hover'
                                                        }
                                                    }}
                                                    onClick={() => handleTaskClick(task)}
                                                >
                                                    <CardContent>
                                                        <Stack spacing={1}>
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

                                                            {task.dia_operacao && (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    <strong>Data:</strong> {new Date(task.dia_operacao).toLocaleDateString('pt-PT')}
                                                                </Typography>
                                                            )}

                                                            {task.descr && (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    <strong>Descrição:</strong> {task.descr}
                                                                </Typography>
                                                            )}

                                                            <Divider sx={{ my: 1 }} />

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
                                            ))}
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
                                );
                            })}
                        </Stack>
                    )}

                    {/* Tarefas Concluídas - Agrupadas por Instalação */}
                    {tasksCompletedToday.length > 0 && (
                        <Box sx={{ mt: 4 }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => setShowCompleted(!showCompleted)}
                                endIcon={showCompleted ? <ExpandLess /> : <ExpandMore />}
                                sx={{ mb: 2 }}
                            >
                                <CheckCircle sx={{ mr: 1 }} />
                                Tarefas Concluídas ({tasksCompletedToday.length})
                            </Button>

                            <Collapse in={showCompleted}>
                                <Stack spacing={2}>
                                    {completedTasksByInstallation.map(([instalacao, group]) => {
                                        const licenseColor = getInstallationLicenseColor(group.licenseStatus);
                                        return (
                                        <Accordion key={`completed-${instalacao}`}>
                                            <AccordionSummary
                                                expandIcon={<ExpandMore />}
                                                sx={{
                                                    borderLeft: `6px solid ${licenseColor}`,
                                                    '&:hover': {
                                                        bgcolor: 'action.hover'
                                                    }
                                                }}
                                            >
                                                <Box display="flex" alignItems="center" width="100%">
                                                    <Box
                                                        sx={{
                                                            width: 12,
                                                            height: 12,
                                                            borderRadius: '50%',
                                                            bgcolor: licenseColor,
                                                            mr: 1.5,
                                                            flexShrink: 0
                                                        }}
                                                    />
                                                    <Typography variant="subtitle1" fontWeight="600" sx={{ flexGrow: 1 }}>
                                                        {instalacao}
                                                    </Typography>
                                                    <Badge badgeContent={group.tasks.length} color="success" sx={{ mr: 2 }} />
                                                </Box>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                <Stack spacing={2}>
                                                    {group.tasks.map((task) => (
                                                        <Card
                                                            key={task.pk}
                                                            sx={{
                                                                borderLeft: 4,
                                                                borderColor: 'success.main',
                                                                opacity: 0.8
                                                            }}
                                                        >
                                                            <CardContent>
                                                                <Stack spacing={1}>
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

                                                                    {task.dia_operacao && (
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            <strong>Data:</strong> {new Date(task.dia_operacao).toLocaleDateString('pt-PT')}
                                                                        </Typography>
                                                                    )}

                                                                    {task.descr && (
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            <strong>Descrição:</strong> {task.descr}
                                                                        </Typography>
                                                                    )}

                                                                    <Divider sx={{ my: 1 }} />

                                                                    <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                                                        📋 Detalhes da Tarefa:
                                                                    </Typography>

                                                                    {task.operador1_nome && (
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            <strong>Operador 1:</strong> {task.operador1_nome}
                                                                        </Typography>
                                                                    )}

                                                                    {task.operador2_nome && (
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            <strong>Operador 2:</strong> {task.operador2_nome}
                                                                        </Typography>
                                                                    )}

                                                                    {(() => {
                                                                        const formattedValue = formatCompletedTaskValue(task);
                                                                        return formattedValue && (
                                                                            <Typography variant="body2" color="text.secondary">
                                                                                <strong>{formattedValue.label}:</strong> {formattedValue.value}
                                                                            </Typography>
                                                                        );
                                                                    })()}

                                                                    {task.valuememo && (
                                                                        <Typography variant="body2" color="text.secondary" sx={{
                                                                            whiteSpace: 'pre-wrap',
                                                                            bgcolor: 'action.hover',
                                                                            p: 1,
                                                                            borderRadius: 1
                                                                        }}>
                                                                            <strong>Observações:</strong><br />
                                                                            {task.valuememo}
                                                                        </Typography>
                                                                    )}

                                                                    {task.caminho_foto && (
                                                                        <Typography variant="body2" color="info.main" sx={{ fontWeight: 500 }}>
                                                                            📷 Foto anexada
                                                                        </Typography>
                                                                    )}

                                                                    <Divider sx={{ my: 1 }} />

                                                                    {task.updt_time && (
                                                                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                                                                            <strong>✓ Concluída em:</strong> {new Date(task.updt_time).toLocaleString('pt-PT')}
                                                                        </Typography>
                                                                    )}

                                                                    {task.updt_client && (
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            Registado por: {task.updt_client}
                                                                        </Typography>
                                                                    )}
                                                                </Stack>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </Stack>
                                            </AccordionDetails>
                                        </Accordion>
                                        );
                                    })}
                                </Stack>
                            </Collapse>
                        </Box>
                    )}
                </Container>
            </Box>

            {/* FAB para refresh (opcional) */}
            {tasksToday.length > 0 && (
                <Fab
                    color="primary"
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16
                    }}
                    onClick={refresh}
                    aria-label={MESSAGES.UI.REFRESH}
                >
                    <Refresh />
                </Fab>
            )}

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

export default OperatorMobileView;
