import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, CircularProgress, Chip, Stack,
    Card, CardContent, Accordion, AccordionSummary, AccordionDetails,
    LinearProgress, Alert, useTheme, alpha, Fab, Tooltip, Collapse
} from '@mui/material';
import {
    Assignment as AssignmentIcon,
    Refresh as RefreshIcon,
    ExpandMore,
    CheckCircle,
    Schedule,
    TaskAlt,
    WifiOff,
} from '@mui/icons-material';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useOperationTasks } from '../hooks/useOperationTasks';
import { useOffline } from '../hooks/useOffline';
import { getInstallationLicenseColor, formatCompletedTaskValue, formatDate } from '../utils/formatters';
import { exportTasksToExcel } from '../services/exportService';
import MESSAGES from '../constants/messages';
import ExportButton from '../components/ExportButton';
import DetailsDrawer from '../components/DetailsDrawer';
import TaskCompletionDialog from '../components/TaskCompletionDialog';

const TasksPage = () => {
    const theme = useTheme();
    const { user } = useAuth();
    const { isOnline, hasPendingActions } = useOffline();

    const [searchTerm, setSearchTerm] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [completionOpen, setCompletionOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    const {
        tasks,
        pendingTasks,
        completedTasks,
        tasksByInstallation,
        completedByInstallation,
        stats,
        isLoading,
        error,
        refetch,
        completeTask,
    } = useOperationTasks();

    // Pesquisa
    const filteredInstallations = useMemo(() => {
        if (!searchTerm) return tasksByInstallation;
        const lower = searchTerm.toLowerCase();
        return tasksByInstallation
            .map(([name, data]) => {
                const filtered = data.tasks.filter(t =>
                    (t.instalacao_nome || '').toLowerCase().includes(lower) ||
                    (t.acao_operacao || '').toLowerCase().includes(lower) ||
                    (t.modo_operacao || '').toLowerCase().includes(lower)
                );
                return filtered.length > 0 ? [name, { ...data, tasks: filtered }] : null;
            })
            .filter(Boolean);
    }, [tasksByInstallation, searchTerm]);

    const handleOpenDetails = (task) => {
        setSelectedTask(task);
        setDrawerOpen(true);
    };

    const handleOpenCompletion = (task) => {
        setSelectedTask(task);
        setCompletionOpen(true);
        setDrawerOpen(false);
    };

    const handleCompleteTask = async (taskId, completionData) => {
        await completeTask(taskId, completionData);
        setCompletionOpen(false);
        setSelectedTask(null);
    };

    const handleExportExcel = () => {
        exportTasksToExcel(tasks, { filename: 'Minhas_Tarefas' });
    };

    return (
        <ModulePage
            title={MESSAGES.SECTIONS.MY_TASKS}
            subtitle="Gestão de tarefas operacionais diárias"
            icon={AssignmentIcon}
            color="#2196f3"
            breadcrumbs={[
                { label: 'Operação', path: '/operation' },
                { label: MESSAGES.SECTIONS.MY_TASKS },
            ]}
            actions={
                <Stack direction="row" spacing={1} alignItems="center">
                    <SearchBar searchTerm={searchTerm} onSearch={setSearchTerm} />
                    <ExportButton
                        onExportExcel={handleExportExcel}
                        count={tasks.length}
                        disabled={isLoading}
                    />
                    {!isOnline && (
                        <Chip icon={<WifiOff />} label="Offline" color="warning" size="small" />
                    )}
                    {hasPendingActions && (
                        <Chip label="Sync pendente" color="info" size="small" variant="outlined" />
                    )}
                    <Tooltip title="Atualizar">
                        <span>
                            <Fab color="primary" size="small" onClick={refetch} disabled={isLoading}>
                                {isLoading ? <CircularProgress size={22} color="inherit" /> : <RefreshIcon />}
                            </Fab>
                        </span>
                    </Tooltip>
                </Stack>
            }
        >
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {MESSAGES.ERROR.LOAD_TASKS}: {error.message}
                </Alert>
            )}

            {isLoading && (
                <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
            )}

            {!isLoading && !error && (
                <>
                    {/* Stats + Progress compacto */}
                    <Card variant="outlined" sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
                        <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
                            <Grid container spacing={2} alignItems="center">
                                {[
                                    { label: 'Total', value: stats.total, icon: <AssignmentIcon fontSize="small" />, color: theme.palette.primary.main },
                                    { label: 'Pendentes', value: stats.pending, icon: <Schedule fontSize="small" />, color: theme.palette.warning.main },
                                    { label: 'Concluídas', value: stats.completed, icon: <CheckCircle fontSize="small" />, color: theme.palette.success.main },
                                ].map((stat) => (
                                    <Grid size={{ xs: 4 }} key={stat.label}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Box sx={{
                                                width: 36, height: 36, borderRadius: 2,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                bgcolor: alpha(stat.color, 0.1), color: stat.color
                                            }}>
                                                {stat.icon}
                                            </Box>
                                            <Box>
                                                <Typography variant="h6" fontWeight={700} lineHeight={1} color={stat.color}>
                                                    {stat.value}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {stat.label}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                        {stats.total > 0 && (
                            <Box sx={{ px: 2.5, pb: 1.5 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Progresso do dia
                                    </Typography>
                                    <Typography variant="caption" fontWeight={600} color="success.main">
                                        {stats.completionRate}%
                                    </Typography>
                                </Stack>
                                <LinearProgress
                                    variant="determinate"
                                    value={stats.completionRate}
                                    sx={{
                                        height: 6, borderRadius: 3,
                                        bgcolor: alpha(theme.palette.success.main, 0.1),
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 3,
                                            bgcolor: theme.palette.success.main
                                        }
                                    }}
                                />
                            </Box>
                        )}
                    </Card>

                    {/* Empty state */}
                    {filteredInstallations.length === 0 && !showCompleted && (
                        <Box textAlign="center" py={6}>
                            <TaskAlt sx={{ fontSize: 64, color: 'success.main', mb: 2, opacity: 0.6 }} />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                {searchTerm ? 'Nenhuma tarefa encontrada' : MESSAGES.EMPTY.NO_TASKS_TODAY}
                            </Typography>
                            {searchTerm && (
                                <Typography variant="body2" color="text.secondary">
                                    Tente ajustar os termos de pesquisa
                                </Typography>
                            )}
                        </Box>
                    )}

                    {/* Tarefas Pendentes por Instalação */}
                    {filteredInstallations.map(([instalacao, data]) => (
                        <Accordion
                            key={instalacao}
                            sx={{
                                mb: 1, borderRadius: 2,
                                '&:before': { display: 'none' },
                                '&.Mui-expanded': { mb: 1 }
                            }}
                        >
                            <AccordionSummary expandIcon={<ExpandMore />}>
                                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%', mr: 1 }}>
                                    <Box sx={{
                                        width: 10, height: 10, borderRadius: '50%',
                                        bgcolor: getInstallationLicenseColor(data.licenseStatus),
                                        flexShrink: 0
                                    }} />
                                    <Typography fontWeight={600} sx={{ flex: 1 }}>
                                        {instalacao}
                                    </Typography>
                                    <Chip label={data.tasks.length} size="small" color="primary" />
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0 }}>
                                <Stack spacing={1}>
                                    {data.tasks.map(task => (
                                        <Card
                                            key={task.pk}
                                            variant="outlined"
                                            sx={{
                                                borderRadius: 2,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                                                    borderLeftColor: theme.palette.primary.main,
                                                    transform: 'translateX(2px)'
                                                }
                                            }}
                                            onClick={() => handleOpenDetails(task)}
                                        >
                                            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                                                            {task.acao_operacao || `Tarefa #${task.pk}`}
                                                        </Typography>
                                                        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" sx={{ mt: 0.25, gap: 0.5 }}>
                                                            {task.dia_operacao && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {formatDate(task.dia_operacao)}
                                                                </Typography>
                                                            )}
                                                            {task.descr && (
                                                                <>
                                                                    <Typography variant="caption" color="text.disabled">·</Typography>
                                                                    <Typography variant="caption" color="text.secondary" noWrap>
                                                                        {task.descr}
                                                                    </Typography>
                                                                </>
                                                            )}
                                                            {task.operador1_nome && (
                                                                <>
                                                                    <Typography variant="caption" color="text.disabled">·</Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {task.operador1_nome}
                                                                    </Typography>
                                                                </>
                                                            )}
                                                        </Stack>
                                                    </Box>
                                                    <Chip
                                                        label="Concluir"
                                                        color="success"
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenCompletion(task);
                                                        }}
                                                        sx={{
                                                            cursor: 'pointer', ml: 1, flexShrink: 0,
                                                            '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.1) }
                                                        }}
                                                    />
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>
                            </AccordionDetails>
                        </Accordion>
                    ))}

                    {/* Tarefas Concluídas */}
                    {completedTasks.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Chip
                                label={`${MESSAGES.SECTIONS.COMPLETED_TASKS} (${completedTasks.length})`}
                                onClick={() => setShowCompleted(!showCompleted)}
                                color={showCompleted ? 'success' : 'default'}
                                variant={showCompleted ? 'filled' : 'outlined'}
                                icon={<CheckCircle />}
                                sx={{ mb: 2 }}
                            />

                            <Collapse in={showCompleted}>
                                {completedByInstallation.map(([instalacao, data]) => (
                                    <Accordion
                                        key={`completed-${instalacao}`}
                                        sx={{ mb: 1, opacity: 0.7, borderRadius: 2, '&:before': { display: 'none' } }}
                                    >
                                        <AccordionSummary expandIcon={<ExpandMore />}>
                                            <Typography fontWeight={600}>{instalacao} ({data.tasks.length})</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ pt: 0 }}>
                                            <Stack spacing={1}>
                                                {data.tasks.map(task => {
                                                    const completedValue = formatCompletedTaskValue(task);
                                                    return (
                                                        <Card key={task.pk} variant="outlined" sx={{
                                                            borderRadius: 2,
                                                            bgcolor: alpha(theme.palette.success.main, 0.03)
                                                        }}>
                                                            <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                                    <Box sx={{ minWidth: 0 }}>
                                                                        <Typography variant="subtitle2" sx={{ textDecoration: 'line-through', opacity: 0.6 }} noWrap>
                                                                            {task.acao_operacao || task.description}
                                                                        </Typography>
                                                                        {completedValue && (
                                                                            <Typography variant="caption" color="success.main">
                                                                                {completedValue.label}: {completedValue.value}
                                                                            </Typography>
                                                                        )}
                                                                    </Box>
                                                                    <CheckCircle color="success" fontSize="small" sx={{ flexShrink: 0, ml: 1 }} />
                                                                </Stack>
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </Stack>
                                        </AccordionDetails>
                                    </Accordion>
                                ))}
                            </Collapse>
                        </Box>
                    )}
                </>
            )}

            {/* Drawers e Diálogos */}
            <DetailsDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                item={selectedTask}
                canExecuteActions={true}
                onComplete={handleOpenCompletion}
                onNavigate={(item) => {
                    const target = item || selectedTask;
                    if (!target) return;
                    if (target.latitude && target.longitude) {
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`);
                    }
                }}
                getAddressString={(i) => `${i?.address || ''}, ${i?.postal || ''}`}
            />

            <TaskCompletionDialog
                open={completionOpen}
                onClose={() => { setCompletionOpen(false); setSelectedTask(null); }}
                task={selectedTask}
                onComplete={handleCompleteTask}
            />
        </ModulePage>
    );
};

export default TasksPage;
