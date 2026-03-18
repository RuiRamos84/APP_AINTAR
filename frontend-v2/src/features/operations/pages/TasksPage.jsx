import React, { useState, useMemo } from 'react';
import {
    Box, Typography, CircularProgress, Chip, Stack,
    Card, CardContent, CardActions, Button, Accordion, AccordionSummary, AccordionDetails,
    LinearProgress, Alert, useTheme, alpha, Fab, Tooltip, Collapse,
    Dialog, DialogTitle, DialogContent, IconButton,
} from '@mui/material';
import {
    Assignment as AssignmentIcon,
    Refresh as RefreshIcon,
    ExpandMore,
    CheckCircle,
    Schedule,
    TaskAlt,
    WifiOff,
    Inbox as InboxIcon,
    CalendarToday as CalendarIcon,
    Business as BusinessIcon,
    CameraAlt as CameraIcon,
    Phone as PhoneIcon,
    LocationOn as LocationIcon,
    Person as PersonIcon,
    Add as AddIcon,
    Close as CloseIcon,
    Send as SendIcon,
    InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { useAuth } from '@/core/contexts/AuthContext';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useOperationTasks } from '../hooks/useOperationTasks';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import DocumentDetailsModal from '@/features/documents/components/details/DocumentDetailsModal';
import AddStepModal from '@/features/documents/components/modals/AddStepModal';
import DirectTaskForm from '../components/DirectTaskForm';
import { useOffline } from '../hooks/useOffline';
import { getInstallationLicenseColor, formatCompletedTaskValue, formatDateOnly, formatPhone } from '../utils/formatters';
import { textIncludes } from '../utils/textUtils';
import { exportTasksToExcel } from '../services/exportService';
import MESSAGES from '../constants/messages';
import ExportButton from '../components/ExportButton';
import DetailsDrawer from '../components/DetailsDrawer';
import TaskCompletionDialog from '../components/TaskCompletionDialog';

const TASK_TYPE = {
    1: { label: 'Numérico',     color: 'primary' },
    2: { label: 'Texto',        color: 'default' },
    3: { label: 'Seleção',      color: 'secondary' },
    4: { label: 'Confirmação',  color: 'success' },
    5: { label: 'Análise',      color: 'info' },
    6: { label: 'Foto',         color: 'warning' },
};

const TasksPage = () => {
    const theme = useTheme();
    const { user } = useAuth();
    const { isOnline, hasPendingActions } = useOffline();

    const [searchTerm, setSearchTerm] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);
    const [selectedPedido, setSelectedPedido] = useState(null);
    const [stepPedido, setStepPedido] = useState(null);
    const [directOpen, setDirectOpen] = useState(false);
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
        createTask,
    } = useOperationTasks();

    const {
        data: pedidos = [],
        isLoading: pedidosLoading,
        refetch: refetchPedidos,
    } = useDocuments('assigned', {
        refetchOnWindowFocus: false,
        refetchInterval: false,
        staleTime: Infinity,
    });

    const sortedPedidos = useMemo(() => {
        const urgencyOrder = (p) => {
            if (p.urgency === '2') return 0;
            if (p.urgency === '1') return 1;
            return 2;
        };
        return [...pedidos].sort((a, b) => {
            const urgencyDiff = urgencyOrder(a) - urgencyOrder(b);
            if (urgencyDiff !== 0) return urgencyDiff;
            // Mais antigo primeiro: "2026-02-17 às 22:37" ordena lexicograficamente
            const dateA = (a.submission || a.when_start || '').replace(' às ', 'T');
            const dateB = (b.submission || b.when_start || '').replace(' às ', 'T');
            return dateA.localeCompare(dateB);
        });
    }, [pedidos]);

    // Pesquisa
    const filteredInstallations = useMemo(() => {
        if (!searchTerm) return tasksByInstallation;
        return tasksByInstallation
            .map(([name, data]) => {
                const filtered = data.tasks.filter(t =>
                    textIncludes(t.instalacao_nome, searchTerm) ||
                    textIncludes(t.acao_operacao, searchTerm) ||
                    textIncludes(t.modo_operacao, searchTerm) ||
                    textIncludes(t.operador1_nome, searchTerm)
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
        /* Wrapper: viewport height menos toolbar(72) e padding do MainLayout(24+24) */
        <Box sx={{ height: { md: 'calc(100vh - 120px)' }, overflow: { md: 'hidden' } }}>
        <ModulePage
            title={MESSAGES.SECTIONS.MY_TASKS}
            subtitle="Gestão de tarefas operacionais diárias"
            icon={AssignmentIcon}
            color="#2196f3"
            compact
            fillHeight
            breadcrumbs={[
                { label: 'Operação', path: '/operation' },
                { label: MESSAGES.SECTIONS.MY_TASKS },
            ]}
            center={
                <Stack direction="row" alignItems="center" spacing={2}>
                    {[
                        { label: 'Total', value: stats.total, color: theme.palette.primary.main },
                        { label: 'Pendentes', value: stats.pending, color: theme.palette.warning.main },
                        { label: 'Concluídas', value: stats.completed, color: theme.palette.success.main },
                        { label: 'Pedidos', value: pedidos.length, color: theme.palette.info.main },
                    ].map((stat) => (
                        <Stack key={stat.label} direction="row" alignItems="baseline" spacing={0.5}>
                            <Typography variant="h6" fontWeight={700} color={stat.color} lineHeight={1}>
                                {stat.value}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                        </Stack>
                    ))}
                    {stats.total > 0 && (
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                            <LinearProgress
                                variant="determinate"
                                value={stats.completionRate}
                                sx={{
                                    width: 80, height: 6, borderRadius: 3,
                                    bgcolor: alpha(theme.palette.success.main, 0.15),
                                    '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: theme.palette.success.main }
                                }}
                            />
                            <Typography variant="body2" fontWeight={600} color="success.main">
                                {stats.completionRate}%
                            </Typography>
                        </Stack>
                    )}
                </Stack>
            }
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
                            <Fab color="primary" size="small" onClick={() => { refetch(); refetchPedidos(); }} disabled={isLoading || pedidosLoading}>
                                {(isLoading || pedidosLoading) ? <CircularProgress size={22} color="inherit" /> : <RefreshIcon />}
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
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, overflow: { md: 'hidden' } }}>

                        {/* === COLUNA ESQUERDA: Tarefas === */}
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, flexShrink: 0 }}>
                                <AssignmentIcon sx={{ color: 'primary.main' }} />
                                <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>Tarefas Pendentes</Typography>
                                <Chip label={stats.pending} size="small" color="primary" />
                                <Tooltip title="Criar tarefa pontual">
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={() => setDirectOpen(true)}
                                        sx={{ whiteSpace: 'nowrap' }}
                                    >
                                        Criar Tarefa
                                    </Button>
                                </Tooltip>
                            </Stack>
                            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: { md: 0.5 } }}>

                            {filteredInstallations.length === 0 && (
                                <Box textAlign="center" py={6}>
                                    <TaskAlt sx={{ fontSize: 56, color: 'success.main', mb: 1.5, opacity: 0.6 }} />
                                    <Typography variant="body1" color="text.secondary">
                                        {searchTerm ? 'Nenhuma tarefa encontrada' : MESSAGES.EMPTY.NO_TASKS_TODAY}
                                    </Typography>
                                </Box>
                            )}

                            {filteredInstallations.map(([instalacao, data]) => (
                                <Accordion
                                    key={instalacao}
                                    defaultExpanded
                                    sx={{ mb: 1, borderRadius: 2, '&:before': { display: 'none' }, '&.Mui-expanded': { mb: 1 } }}
                                >
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%', mr: 1 }}>
                                            <Box sx={{
                                                width: 10, height: 10, borderRadius: '50%',
                                                bgcolor: getInstallationLicenseColor(data.licenseStatus), flexShrink: 0
                                            }} />
                                            <Typography fontWeight={600} sx={{ flex: 1 }}>{instalacao}</Typography>
                                            <Chip label={data.tasks.length} size="small" color="primary" />
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ pt: 0 }}>
                                        <Stack spacing={2}>
                                            {data.tasks.map(task => {
                                                const tipo = TASK_TYPE[task.operacao_tipo];
                                                return (
                                                    <Card key={task.pk} variant="outlined" sx={{
                                                        borderRadius: 2, display: 'flex', flexDirection: 'column',
                                                        borderTop: `3px solid ${theme.palette.primary.main}`,
                                                    }}>
                                                        <CardContent sx={{ flex: 1, pb: 1 }}>
                                                            {/* Linha 1: Nome da ação + tipo */}
                                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.75 }}>
                                                                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3, flex: 1, mr: 1 }}>
                                                                    {task.acao_operacao || `Tarefa #${task.pk}`}
                                                                </Typography>
                                                                <Stack direction="row" spacing={0.5} flexShrink={0}>
                                                                    {task.requer_foto && (
                                                                        <Chip icon={<CameraIcon sx={{ fontSize: '14px !important' }} />} label="Foto" size="small" color="warning" variant="outlined" />
                                                                    )}
                                                                    {tipo && (
                                                                        <Chip label={tipo.label} size="small" color={tipo.color} variant="outlined" />
                                                                    )}
                                                                </Stack>
                                                            </Stack>
                                                            {/* Linha 2: Data */}
                                                            {task.dia_operacao && (
                                                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                                                                    <CalendarIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        {formatDateOnly(task.dia_operacao)}
                                                                    </Typography>
                                                                </Stack>
                                                            )}
                                                            {/* Linha 3: Descrição (se diferente da ação) */}
                                                            {task.descr && task.descr !== task.acao_operacao && (
                                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }} noWrap>
                                                                    {task.descr}
                                                                </Typography>
                                                            )}
                                                            {/* Linha 4: Operador(es) */}
                                                            {task.operador1_nome && (
                                                                <Typography variant="caption" color="text.disabled">
                                                                    {task.operador1_nome}
                                                                    {task.operador2_nome ? ` · ${task.operador2_nome}` : ''}
                                                                </Typography>
                                                            )}
                                                        </CardContent>
                                                        <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
                                                            <Button variant="outlined" size="medium" fullWidth onClick={() => handleOpenDetails(task)}>
                                                                Detalhes
                                                            </Button>
                                                            <Button variant="contained" color="success" size="medium" fullWidth onClick={() => handleOpenCompletion(task)}>
                                                                Concluir
                                                            </Button>
                                                        </CardActions>
                                                    </Card>
                                                );
                                            })}
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
                            ))}

                            {/* Tarefas Concluídas */}
                            {completedTasks.length > 0 && (
                                <Box sx={{ mt: 2 }}>
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
                                            <Accordion key={`completed-${instalacao}`} sx={{ mb: 1, opacity: 0.7, borderRadius: 2, '&:before': { display: 'none' } }}>
                                                <AccordionSummary expandIcon={<ExpandMore />}>
                                                    <Typography fontWeight={600}>{instalacao} ({data.tasks.length})</Typography>
                                                </AccordionSummary>
                                                <AccordionDetails sx={{ pt: 0 }}>
                                                    <Stack spacing={1}>
                                                        {data.tasks.map(task => {
                                                            const completedValue = formatCompletedTaskValue(task);
                                                            return (
                                                                <Card key={task.pk} variant="outlined" sx={{ borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.03) }}>
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
                            </Box>{/* end scrollable tarefas */}
                        </Box>

                        {/* === COLUNA DIREITA: Pedidos === */}
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, flexShrink: 0 }}>
                                <InboxIcon sx={{ color: 'info.main' }} />
                                <Typography variant="subtitle1" fontWeight={600}>Pedidos Atribuídos</Typography>
                                {pedidosLoading
                                    ? <CircularProgress size={18} />
                                    : <Chip label={pedidos.length} size="small" color="info" />
                                }
                            </Stack>
                            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: { md: 0.5 } }}>

                            {!pedidosLoading && pedidos.length === 0 && (
                                <Box textAlign="center" py={6}>
                                    <InboxIcon sx={{ fontSize: 56, color: 'info.main', mb: 1.5, opacity: 0.4 }} />
                                    <Typography variant="body1" color="text.secondary">Sem pedidos atribuídos</Typography>
                                </Box>
                            )}

                            <Stack spacing={2}>
                                {sortedPedidos.map(pedido => {
                                    const addressParts = [pedido.address?.trim()];
                                    if (pedido.door) addressParts.push(`Porta ${pedido.door}`);
                                    if (pedido.floor) addressParts.push(`Piso ${pedido.floor}`);
                                    const fullAddress = [
                                        addressParts.filter(Boolean).join(' '),
                                        pedido.postal,
                                        pedido.nut4,
                                    ].filter(Boolean).join(' · ');
                                    const mapsUrl = (pedido.glat && pedido.glong)
                                        ? `https://www.google.com/maps/dir/?api=1&destination=${pedido.glat},${pedido.glong}`
                                        : fullAddress
                                            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
                                            : null;

                                    return (
                                        <Card key={pedido.pk} variant="outlined" sx={{
                                            borderRadius: 2, display: 'flex', flexDirection: 'column',
                                            borderTop: `3px solid ${theme.palette.info.main}`,
                                        }}>
                                            <CardContent sx={{ flex: 1, pb: 1 }}>
                                                {/* Linha 1: Número + badges */}
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.5 }}>
                                                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2, flex: 1, mr: 1 }}>
                                                        {pedido.regnumber}
                                                    </Typography>
                                                    <Stack direction="row" spacing={0.5} flexShrink={0}>
                                                        {pedido.notification > 0 && (
                                                            <Chip label="Novo" size="small" color="info" />
                                                        )}
                                                        {pedido.urgency && pedido.urgency !== '0' && (
                                                            <Chip
                                                                label={pedido.urgency === '2' ? 'M. Urgente' : 'Urgente'}
                                                                size="small"
                                                                color={pedido.urgency === '2' ? 'error' : 'warning'}
                                                            />
                                                        )}
                                                    </Stack>
                                                </Stack>

                                                {/* Linha 2: Tipo + Data (mesma linha) */}
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                                    <Typography variant="body2" fontWeight={600} color="text.primary">
                                                        {pedido.tt_type || ''}
                                                    </Typography>
                                                    {(pedido.when_start || pedido.submission) && (
                                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                                            <CalendarIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                                                            <Typography variant="caption" color="text.secondary">
                                                                {pedido.when_start || pedido.submission}
                                                            </Typography>
                                                        </Stack>
                                                    )}
                                                </Stack>

                                                {/* Linha 3: Requerente + Telefone (clicável) */}
                                                {(pedido.ts_entity || pedido.phone) && (
                                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                                                        <PersonIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
                                                        <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
                                                            {pedido.ts_entity}
                                                        </Typography>
                                                        {pedido.phone && (
                                                            <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}
                                                                component="a" href={`tel:${pedido.phone}`}
                                                                sx={{ color: 'inherit', textDecoration: 'none' }}
                                                            >
                                                                <PhoneIcon sx={{ fontSize: 13, color: 'primary.main' }} />
                                                                <Typography variant="body2" color="primary.main" fontWeight={500}>
                                                                    {formatPhone(pedido.phone)}
                                                                </Typography>
                                                            </Stack>
                                                        )}
                                                    </Stack>
                                                )}

                                                {/* Linha 4: Morada (clicável → Google Maps) */}
                                                {fullAddress && (
                                                    <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ mb: 0.25 }}>
                                                        <LocationIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0, mt: '2px' }} />
                                                        <Typography
                                                            variant="body2"
                                                            component="a"
                                                            href={mapsUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            sx={{
                                                                color: 'text.secondary',
                                                                textDecoration: 'none',
                                                                '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                                                                overflow: 'hidden',
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                            }}
                                                        >
                                                            {fullAddress}
                                                        </Typography>
                                                    </Stack>
                                                )}

                                                {/* Linha 5: Memo */}
                                                {pedido.memo && (
                                                    <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ mt: 0.5 }}>
                                                        <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0 }}>📝</Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                        }}>
                                                            {pedido.memo}
                                                        </Typography>
                                                    </Stack>
                                                )}
                                            </CardContent>
                                            <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    size="medium"
                                                    startIcon={<SendIcon />}
                                                    sx={{ flex: 1 }}
                                                    onClick={() => setStepPedido(pedido)}
                                                >
                                                    Concluir
                                                </Button>
                                                <Tooltip title="Ver detalhes do pedido">
                                                    <IconButton size="small" onClick={() => setSelectedPedido(pedido)}>
                                                        <InfoIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </CardActions>
                                        </Card>
                                    );
                                })}
                            </Stack>
                            </Box>{/* end scrollable pedidos */}
                        </Box>

                    </Box>
            )}

            {/* Dialog — Criar Tarefa Pontual */}
            <Dialog open={directOpen} onClose={() => setDirectOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Criar Tarefa Pontual</Typography>
                        <IconButton onClick={() => setDirectOpen(false)} size="small"><CloseIcon /></IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
                    <DirectTaskForm
                        onSubmit={async (data) => {
                            await createTask(data);
                            setDirectOpen(false);
                        }}
                        onCancel={() => setDirectOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Modal Pedido — detalhes completos */}
            <DocumentDetailsModal
                open={!!selectedPedido}
                onClose={() => setSelectedPedido(null)}
                documentData={selectedPedido}
                isOwner={true}
                onActionSuccess={() => setSelectedPedido(null)}
            />

            {/* Modal Registar Ação — direto, sem abrir detalhes */}
            <AddStepModal
                open={!!stepPedido}
                onClose={() => setStepPedido(null)}
                documentId={stepPedido?.pk}
                onSuccess={() => { setStepPedido(null); refetchPedidos(); }}
            />

            {/* Drawers e Diálogos */}
            <DetailsDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                item={selectedTask}
                canExecuteActions={true}
                onComplete={handleOpenCompletion}
            />

            <TaskCompletionDialog
                open={completionOpen}
                onClose={() => { setCompletionOpen(false); setSelectedTask(null); }}
                task={selectedTask}
                onComplete={handleCompleteTask}
            />
        </ModulePage>
        </Box>
    );
};

export default TasksPage;
