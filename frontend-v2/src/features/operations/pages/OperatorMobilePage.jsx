import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
    Box, AppBar, Toolbar, Typography, IconButton, Badge,
    List, ListItem, ListItemText, Chip, Container, Stack,
    Card, CardContent, Button, Collapse, Alert,
    LinearProgress, CircularProgress, useTheme, alpha, Snackbar
} from '@mui/material';
import {
    Refresh, CheckCircle, Schedule, ExpandMore,
    TaskAlt, WifiOff, Phone as PhoneIcon,
    Place as PlaceIcon
} from '@mui/icons-material';
import { useOperationTasks } from '../hooks/useOperationTasks';
import { useOffline } from '../hooks/useOffline';
import { getInstallationLicenseColor, formatCompletedTaskValue } from '../utils/formatters';
import MESSAGES from '../constants/messages';
import TaskCompletionDialog from '../components/TaskCompletionDialog';

const OperatorMobilePage = () => {
    const theme = useTheme();
    const { isOnline, hasPendingActions, pendingCount } = useOffline();

    const [completionOpen, setCompletionOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showCompleted, setShowCompleted] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const {
        todayTasks,
        todayCompletedTasks,
        stats,
        isLoading,
        error,
        refetch,
        completeTask,
    } = useOperationTasks();

    // Pull-to-refresh nativo via touch
    const containerRef = useRef(null);
    const touchStart = useRef(0);
    const handleTouchStart = useCallback((e) => {
        if (containerRef.current?.scrollTop === 0) {
            touchStart.current = e.touches[0].clientY;
        }
    }, []);

    const handleTouchEnd = useCallback(async (e) => {
        const diff = e.changedTouches[0].clientY - touchStart.current;
        if (diff > 80 && containerRef.current?.scrollTop === 0) {
            setRefreshing(true);
            await refetch();
            setRefreshing(false);
        }
        touchStart.current = 0;
    }, [refetch]);

    // Agrupar tarefas de hoje por instalação
    const todayByInstallation = useMemo(() => {
        const grouped = {};
        todayTasks.forEach(task => {
            const instalacao = task.instalacao_nome || 'Sem Instalação';
            if (!grouped[instalacao]) {
                grouped[instalacao] = {
                    tasks: [],
                    licenseStatus: task.tt_instalacaolicenciamento
                };
            }
            grouped[instalacao].tasks.push(task);
        });
        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [todayTasks]);

    const handleOpenCompletion = (task) => {
        setSelectedTask(task);
        setCompletionOpen(true);
    };

    const handleCompleteTask = async (taskId, completionData) => {
        await completeTask(taskId, completionData);
        setCompletionOpen(false);
        setSelectedTask(null);
    };

    const totalToday = todayTasks.length + todayCompletedTasks.length;
    const completionRate = totalToday > 0
        ? Math.round((todayCompletedTasks.length / totalToday) * 100)
        : 0;

    return (
        <Box
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            sx={{ minHeight: '100vh', bgcolor: 'background.default', overflowY: 'auto' }}
        >
            {/* AppBar fixa */}
            <AppBar position="sticky" elevation={0} sx={{
                bgcolor: 'primary.main',
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
            }}>
                <Toolbar>
                    <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
                        {MESSAGES.SECTIONS.MY_TASKS_TODAY}
                    </Typography>
                    <IconButton color="inherit" onClick={refetch} disabled={isLoading || refreshing}>
                        {isLoading || refreshing
                            ? <CircularProgress size={22} color="inherit" />
                            : <Refresh />
                        }
                    </IconButton>
                </Toolbar>

                {/* Stats compactos */}
                <Box sx={{ px: 2, pb: 2 }}>
                    <Stack direction="row" spacing={1.5} justifyContent="center">
                        <Chip
                            icon={<Schedule />}
                            label={`${todayTasks.length} pendentes`}
                            size="small"
                            sx={{
                                color: 'white',
                                bgcolor: alpha('#fff', 0.15),
                                fontWeight: 600,
                                '& .MuiChip-icon': { color: alpha('#fff', 0.8) }
                            }}
                        />
                        <Chip
                            icon={<CheckCircle />}
                            label={`${todayCompletedTasks.length} concluídas`}
                            size="small"
                            sx={{
                                color: 'white',
                                bgcolor: alpha('#fff', 0.15),
                                fontWeight: 600,
                                '& .MuiChip-icon': { color: alpha('#fff', 0.8) }
                            }}
                        />
                    </Stack>

                    {/* Barra de progresso */}
                    <Box sx={{ mt: 1.5 }}>
                        <LinearProgress
                            variant="determinate"
                            value={completionRate}
                            sx={{
                                height: 6, borderRadius: 3,
                                bgcolor: alpha('#fff', 0.2),
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 3,
                                    bgcolor: '#fff'
                                }
                            }}
                        />
                        <Typography variant="caption" sx={{
                            color: alpha('#fff', 0.8),
                            display: 'block', textAlign: 'right', mt: 0.3
                        }}>
                            {completionRate}% concluído
                        </Typography>
                    </Box>
                </Box>
            </AppBar>

            {/* Pull-to-refresh indicator */}
            {refreshing && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                    <CircularProgress size={20} />
                </Box>
            )}

            <Container maxWidth="sm" sx={{ pt: 2, pb: 10 }}>
                {/* Offline warning persistente */}
                {!isOnline && (
                    <Alert
                        severity="warning"
                        icon={<WifiOff />}
                        sx={{ mb: 2, borderRadius: 2 }}
                        action={hasPendingActions && (
                            <Chip label={`${pendingCount || '?'} pendentes`} size="small" color="warning" variant="outlined" />
                        )}
                    >
                        {MESSAGES.OFFLINE.WORKING_OFFLINE}
                    </Alert>
                )}

                {/* Erro */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        {MESSAGES.ERROR.LOAD_TASKS}
                        <Button size="small" onClick={refetch} sx={{ ml: 1 }}>
                            {MESSAGES.ACTIONS.RETRY}
                        </Button>
                    </Alert>
                )}

                {/* Loading */}
                {isLoading && !refreshing && (
                    <Box display="flex" justifyContent="center" py={6}>
                        <CircularProgress />
                    </Box>
                )}

                {/* Sem tarefas */}
                {!isLoading && todayTasks.length === 0 && todayCompletedTasks.length === 0 && (
                    <Box textAlign="center" py={8}>
                        <TaskAlt sx={{ fontSize: 80, color: 'success.main', mb: 2, opacity: 0.5 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            {MESSAGES.EMPTY.NO_TASKS_TODAY}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Todas as tarefas do dia foram concluídas
                        </Typography>
                    </Box>
                )}

                {/* Tarefas pendentes por instalação */}
                {todayByInstallation.map(([instalacao, data]) => (
                    <Card key={instalacao} sx={{ mb: 2, borderRadius: 3, overflow: 'visible' }}>
                        {/* Header da instalação */}
                        <Box sx={{
                            px: 2, py: 1.5,
                            bgcolor: alpha(getInstallationLicenseColor(data.licenseStatus), 0.08),
                            borderBottom: `2px solid ${getInstallationLicenseColor(data.licenseStatus)}`
                        }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Box sx={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    bgcolor: getInstallationLicenseColor(data.licenseStatus)
                                }} />
                                <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
                                    {instalacao}
                                </Typography>
                                <Badge badgeContent={data.tasks.length} color="primary" />
                            </Stack>
                        </Box>

                        {/* Lista de tarefas */}
                        <List disablePadding>
                            {data.tasks.map((task, index) => (
                                <ListItem
                                    key={task.pk}
                                    divider={index < data.tasks.length - 1}
                                    sx={{ px: 2, py: 1.5 }}
                                    secondaryAction={
                                        <Button
                                            variant="contained"
                                            color="success"
                                            size="small"
                                            onClick={() => handleOpenCompletion(task)}
                                            sx={{ borderRadius: 2, minWidth: 80, textTransform: 'none' }}
                                        >
                                            Concluir
                                        </Button>
                                    }
                                >
                                    <ListItemText
                                        primary={
                                            <Typography variant="body1" fontWeight={600}>
                                                {task.acao_operacao || task.description || `Tarefa #${task.pk}`}
                                            </Typography>
                                        }
                                        secondary={
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                                                {task.modo_operacao && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {task.modo_operacao}
                                                    </Typography>
                                                )}
                                                {task.phone && (
                                                    <>
                                                        <Typography variant="caption" color="text.disabled">·</Typography>
                                                        <Stack direction="row" alignItems="center" spacing={0.3}>
                                                            <PhoneIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                                                            <Typography variant="caption" color="text.secondary">{task.phone}</Typography>
                                                        </Stack>
                                                    </>
                                                )}
                                            </Stack>
                                        }
                                        secondaryTypographyProps={{ component: 'div' }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Card>
                ))}

                {/* Tarefas concluídas */}
                {todayCompletedTasks.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Button
                            fullWidth
                            onClick={() => setShowCompleted(!showCompleted)}
                            startIcon={<CheckCircle />}
                            endIcon={<ExpandMore sx={{ transform: showCompleted ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
                            sx={{ mb: 1, justifyContent: 'flex-start', color: 'success.main', textTransform: 'none' }}
                        >
                            {MESSAGES.SECTIONS.COMPLETED_TASKS} ({todayCompletedTasks.length})
                        </Button>

                        <Collapse in={showCompleted}>
                            <Stack spacing={1}>
                                {todayCompletedTasks.map(task => {
                                    const completedValue = formatCompletedTaskValue(task);
                                    return (
                                        <Card key={task.pk} variant="outlined" sx={{
                                            borderRadius: 2, opacity: 0.7,
                                            bgcolor: alpha(theme.palette.success.main, 0.03)
                                        }}>
                                            <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <CheckCircle color="success" fontSize="small" />
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="body2" sx={{ textDecoration: 'line-through' }} noWrap>
                                                            {task.acao_operacao || task.description}
                                                        </Typography>
                                                        {completedValue && (
                                                            <Typography variant="caption" color="success.main">
                                                                {completedValue.label}: {completedValue.value}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </Stack>
                        </Collapse>
                    </Box>
                )}
            </Container>

            {/* Diálogo de conclusão (fullscreen em mobile) */}
            <TaskCompletionDialog
                open={completionOpen}
                onClose={() => { setCompletionOpen(false); setSelectedTask(null); }}
                task={selectedTask}
                onComplete={handleCompleteTask}
            />

            {/* Snackbar para ações pendentes sync */}
            <Snackbar
                open={isOnline && hasPendingActions}
                message="A sincronizar ações pendentes..."
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    );
};

export default OperatorMobilePage;
