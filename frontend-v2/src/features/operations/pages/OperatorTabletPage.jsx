import React, { useState, useRef, useMemo, lazy, Suspense } from 'react';
import {
    Box, AppBar, Toolbar, Typography, Chip, BottomNavigation,
    BottomNavigationAction, Paper, Card, CardContent,
    Button, IconButton, Badge, Stack, LinearProgress, Divider, Grid,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    FormControl, InputLabel, Select, MenuItem, Skeleton,
    CircularProgress, Alert, Collapse, Fab, alpha, useTheme,
    Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
    Assignment as TarefasIcon,
    Description as PedidosIcon,
    AddCircle as CriarIcon,
    CheckCircle as DoneIcon,
    Schedule as PendingIcon,
    PhotoCamera as CameraIcon,
    ExpandMore as ExpandMoreIcon,
    Close as CloseIcon,
    Refresh as RefreshIcon,
    KeyboardArrowDown as ExpandIcon,
    KeyboardArrowUp as CollapseIconBtn,
    Engineering as TaskIcon,
    ShoppingCart as RequisicaoIcon,
    Folder as DocIcon,
    AttachFile as AttachIcon,
    Send as SendIcon,
    Person as PersonIcon,
    CalendarToday as CalIcon,
    Phone as PhoneIcon,
    LocationOn as LocationIcon,
    Navigation as NavigateIcon,
    PriorityHigh as UrgentIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import notification from '@/core/services/notification';
import { useAuth } from '@/core/contexts/AuthContext';
import { useOperationTasks } from '../hooks/useOperationTasks';
import { useDocuments, useDocumentDetails, useAddStep } from '@/features/documents/hooks/useDocuments';
import { useMetaData } from '@/core/hooks/useMetaData';
import { getAvailableSteps, getAvailableUsersForStep } from '@/features/documents/utils/workflowUtils';
import { getStatusColor, getStatusLabel } from '@/features/documents/utils/documentUtils';
import { operationService } from '../services/operationService';
import DirectTaskForm from '../components/DirectTaskForm';
import LocationPickerMap from '@/features/documents/components/forms/LocationPickerMap';

const CreateDocumentModal = lazy(() =>
    import('@/features/documents/components/forms/CreateDocumentModal')
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const todayLabel = () =>
    format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: pt });

const statusDoc = (what) => {
    const n = Number(what);
    if (n <= 1) return { label: 'Novo', color: 'info' };
    if (n <= 3) return { label: 'Em curso', color: 'warning' };
    if (n >= 9) return { label: 'Concluído', color: 'success' };
    return { label: 'Em curso', color: 'warning' };
};

// ─────────────────────────────────────────────────────────────────────────────
// PedidoOperadorModal — modal simplificado: info essencial + tramitar
// ─────────────────────────────────────────────────────────────────────────────
const PedidoOperadorModal = ({ open, onClose, docData }) => {
    const theme = useTheme();
    const fileRef = useRef();

    // Dados completos do documento (pelo regnumber)
    const { data: doc, isLoading: loadingDoc } = useDocumentDetails(
        open ? (docData?.regnumber || docData?.pk) : null
    );
    const { data: metaData } = useMetaData();
    const addStepMutation = useAddStep();

    const [step, setStep] = useState('');
    const [user, setUser] = useState('');
    const [memo, setMemo] = useState('');
    const [photo, setPhoto] = useState(null);

    // Reset ao abrir
    React.useEffect(() => {
        if (open) { setStep(''); setUser(''); setMemo(''); setPhoto(null); }
    }, [open]);

    // Passos e utilizadores disponíveis
    const availableSteps = useMemo(() => {
        if (!doc || !metaData) return [];
        return getAvailableSteps(doc, metaData);
    }, [doc, metaData]);

    const availableUsers = useMemo(() => {
        if (!step || !doc || !metaData) return [];
        return getAvailableUsersForStep(Number(step), doc, metaData);
    }, [step, doc, metaData]);

    // Auto-selecionar utilizador quando só há um
    React.useEffect(() => {
        if (availableUsers.length === 1) setUser(String(availableUsers[0].pk));
        else setUser('');
    }, [availableUsers]);

    const currentStepLabel = metaData?.what?.find(s => s.pk === doc?.what)?.step || '—';
    const entityName = doc?.ts_entity_name || doc?.associate_name || docData?.ts_entity_name || '';

    const handlePhoto = (e) => {
        const f = e.target.files?.[0];
        if (f) setPhoto(f);
    };

    const handleSubmit = () => {
        if (!step || !user) return;
        const fd = new FormData();
        fd.append('tb_document', doc.pk);
        fd.append('what', step);
        fd.append('who', user);
        fd.append('memo', memo.trim());
        if (photo) { fd.append('files', photo); fd.append('descr', photo.name); }
        addStepMutation.mutate({ id: doc.pk, formData: fd }, {
            onSuccess: () => onClose(),
        });
    };

    const canSubmit = step && user && !addStepMutation.isPending;

    const rawStatusColor = doc ? getStatusColor(doc.what) : 'default';
    const statusColor = rawStatusColor === 'default' ? 'info' : rawStatusColor;
    const statusLabel = doc ? getStatusLabel(doc.what, metaData) : '';

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ pr: 6, pb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="h6" fontWeight={700}>
                        {docData?.regnumber || `#${docData?.pk}`}
                    </Typography>
                    {docData?.tt_type_name && (
                        <Chip label={docData.tt_type_name} size="small" variant="outlined" />
                    )}
                    {doc && (
                        <Chip label={statusLabel} color={statusColor} size="small" />
                    )}
                </Stack>
                {entityName && (
                    <Typography variant="body2" color="text.secondary" mt={0.25}>{entityName}</Typography>
                )}
                <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 2.5 }}>
                {loadingDoc ? (
                    <Stack spacing={1.5}>
                        <Skeleton variant="rounded" height={60} />
                        <Skeleton variant="rounded" height={40} />
                        <Skeleton variant="rounded" height={40} />
                    </Stack>
                ) : (
                    <Stack spacing={2.5}>
                        {/* Descrição do pedido */}
                        {(doc?.memo || docData?.memo) && (
                            <Paper elevation={0} sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: 2 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                                    DESCRIÇÃO
                                </Typography>
                                <Typography variant="body2">{doc?.memo || docData?.memo}</Typography>
                            </Paper>
                        )}

                        {/* Estado actual + data */}
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <PendingIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    Estado actual: <strong>{currentStepLabel}</strong>
                                </Typography>
                            </Stack>
                            {doc?.submission && !isNaN(new Date(doc.submission)) && (
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                    <CalIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography variant="body2" color="text.secondary">
                                        {format(new Date(doc.submission), 'dd/MM/yyyy')}
                                    </Typography>
                                </Stack>
                            )}
                        </Stack>

                        <Divider />

                        {/* Tramitar */}
                        <Typography variant="subtitle2" fontWeight={700} color="primary">
                            Tramitar Pedido
                        </Typography>

                        {availableSteps.length === 0 ? (
                            <Alert severity="info">
                                Não existem transições disponíveis para este pedido.
                            </Alert>
                        ) : (
                            <Stack spacing={2}>
                                <FormControl fullWidth required>
                                    <InputLabel>Próximo passo</InputLabel>
                                    <Select
                                        value={step}
                                        onChange={e => setStep(e.target.value)}
                                        label="Próximo passo"
                                        sx={{ '& .MuiSelect-select': { fontSize: 16 } }}
                                    >
                                        {availableSteps.map(s => (
                                            <MenuItem key={s.pk} value={String(s.pk)}>
                                                {s.step}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {step && (
                                    <FormControl fullWidth required>
                                        <InputLabel>Atribuir a</InputLabel>
                                        <Select
                                            value={user}
                                            onChange={e => setUser(e.target.value)}
                                            label="Atribuir a"
                                            sx={{ '& .MuiSelect-select': { fontSize: 16 } }}
                                        >
                                            {availableUsers.map(u => (
                                                <MenuItem key={u.pk} value={String(u.pk)}>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <PersonIcon fontSize="small" />
                                                        <span>{u.name}</span>
                                                    </Stack>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}

                                <TextField
                                    label="Observações (opcional)"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={memo}
                                    onChange={e => setMemo(e.target.value)}
                                    placeholder="Informação relevante para o próximo passo..."
                                    inputProps={{ style: { fontSize: 16 } }}
                                />

                                <Box>
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        capture="environment"
                                        ref={fileRef}
                                        onChange={handlePhoto}
                                        style={{ display: 'none' }}
                                    />
                                    <Button
                                        variant="outlined"
                                        startIcon={<CameraIcon />}
                                        onClick={() => fileRef.current.click()}
                                        size="large"
                                        sx={{ minHeight: 44 }}
                                    >
                                        {photo ? photo.name : 'Anexar Foto / Documento'}
                                    </Button>
                                    {photo && (
                                        <IconButton size="small" onClick={() => setPhoto(null)} sx={{ ml: 1 }}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </Box>
                            </Stack>
                        )}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 2.5, pb: 2.5 }}>
                <Button onClick={onClose} disabled={addStepMutation.isPending} size="large">
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!canSubmit || availableSteps.length === 0}
                    startIcon={addStepMutation.isPending ? <CircularProgress size={18} /> : <SendIcon />}
                    size="large"
                    sx={{ minWidth: 140 }}
                >
                    {addStepMutation.isPending ? 'A enviar...' : 'Tramitar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/** Abre o Google Maps com rota para as coordenadas (funciona em Android, iOS e desktop) */
const openNavigation = (lat, lng) => {
    window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        '_blank'
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// TaskLocationDialog — mapa read-only para ver localização de tarefa pendente
// ─────────────────────────────────────────────────────────────────────────────
const TaskLocationDialog = ({ task, open, onClose }) => {
    if (!task) return null;
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ pr: 6 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <LocationIcon color="warning" />
                    <Box>
                        <Typography variant="h6" component="div" fontWeight={700} lineHeight={1.2}>
                            {task.instalacao_nome}
                        </Typography>
                        <Typography variant="body2" component="div" color="text.secondary">
                            {task.acao_operacao}
                        </Typography>
                    </Box>
                </Stack>
                <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ px: 2, pb: 1 }}>
                <Stack spacing={1.5}>
                    <LocationPickerMap
                        lat={task.clat}
                        lng={task.clong}
                        onLocationSelect={() => {}}
                    />
                    <Stack direction="row" spacing={1} justifyContent="center">
                        <Chip
                            icon={<LocationIcon />}
                            label={`Lat: ${parseFloat(task.clat).toFixed(5)}`}
                            size="small"
                            color="warning"
                            variant="outlined"
                        />
                        <Chip
                            label={`Long: ${parseFloat(task.clong).toFixed(5)}`}
                            size="small"
                            color="warning"
                            variant="outlined"
                        />
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
                <Button onClick={onClose}>Fechar</Button>
                <Button
                    variant="contained"
                    color="warning"
                    startIcon={<NavigateIcon />}
                    size="large"
                    onClick={() => openNavigation(task.clat, task.clong)}
                    sx={{ flex: 1 }}
                >
                    Navegar até ao local
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// TaskDetailDialog — detalhe de tarefa concluída
// ─────────────────────────────────────────────────────────────────────────────
const TaskDetailDialog = ({ task, open, onClose }) => {
    if (!task) return null;
    const completedAt = task.updt_time
        ? format(new Date(task.updt_time), "dd/MM/yyyy 'às' HH:mm", { locale: pt })
        : null;
    const taskDate = task.dia_operacao || task.data
        ? format(new Date(task.dia_operacao || task.data), 'dd/MM/yyyy', { locale: pt })
        : null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ pr: 6 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <DoneIcon color="success" />
                    <Box>
                        <Typography variant="h6" component="div" fontWeight={700} lineHeight={1.2}>
                            {task.instalacao_nome}
                        </Typography>
                        <Typography variant="body2" component="div" color="text.secondary">
                            {task.acao_operacao}
                        </Typography>
                    </Box>
                </Stack>
                <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    {/* Meta info */}
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                        {taskDate && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                <CalIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                                <Typography variant="body2" color="text.secondary">Data: <strong>{taskDate}</strong></Typography>
                            </Stack>
                        )}
                        {task.operador1_nome && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                <PersonIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                                <Typography variant="body2" color="text.secondary">{task.operador1_nome}</Typography>
                            </Stack>
                        )}
                        {task.operador2_nome && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                <PersonIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                                <Typography variant="body2" color="text.secondary">{task.operador2_nome}</Typography>
                            </Stack>
                        )}
                    </Stack>

                    {/* Descrição */}
                    {task.descr && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                                DESCRIÇÃO
                            </Typography>
                            <Typography variant="body2">{task.descr}</Typography>
                        </Box>
                    )}

                    <Divider />

                    {/* Resultado */}
                    {task.valuetext && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                                RESULTADO
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>{task.valuetext}</Typography>
                        </Box>
                    )}

                    {/* Observações */}
                    {task.valuememo && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                                OBSERVAÇÕES
                            </Typography>
                            <Typography variant="body2">{task.valuememo}</Typography>
                        </Box>
                    )}

                    {/* Sem resultado registado */}
                    {!task.valuetext && !task.valuememo && (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            Sem resultado ou observações registadas.
                        </Typography>
                    )}

                    {/* Localização GPS */}
                    {task.clat && task.clong && (
                        <>
                            <Divider />
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
                                    LOCALIZAÇÃO
                                </Typography>
                                <LocationPickerMap
                                    lat={task.clat}
                                    lng={task.clong}
                                    onLocationSelect={() => {}}
                                />
                                <Stack direction="row" spacing={1} mt={0.75}>
                                    <Chip icon={<LocationIcon />} label={`Lat: ${parseFloat(task.clat).toFixed(5)}`} size="small" color="warning" variant="outlined" />
                                    <Chip label={`Long: ${parseFloat(task.clong).toFixed(5)}`} size="small" color="warning" variant="outlined" />
                                </Stack>
                            </Box>
                        </>
                    )}

                    {/* Concluída por */}
                    {completedAt && (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <DoneIcon sx={{ fontSize: 14, color: 'success.main' }} />
                            <Typography variant="caption" color="success.main">
                                Concluída por <strong>{task.updt_client}</strong> em {completedAt}
                            </Typography>
                        </Stack>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 2.5, pb: 2 }}>
                <Button onClick={onClose} size="large">Fechar</Button>
            </DialogActions>
        </Dialog>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// TaskCard — card individual de tarefa (touch-friendly)
// ─────────────────────────────────────────────────────────────────────────────
const TaskCard = ({ task, onComplete, onViewDetail, onViewLocation }) => {
    const theme = useTheme();
    const done = task.completed;
    const hasLocation = !!(task.clat && task.clong);

    const taskDate = task.dia_operacao || task.data
        ? format(new Date(task.dia_operacao || task.data), 'dd/MM/yyyy', { locale: pt })
        : null;

    return (
        <Card
            sx={{
                borderLeft: `4px solid ${done
                    ? theme.palette.success.main
                    : theme.palette.primary.main}`,
                opacity: done ? 0.82 : 1,
                transition: 'all 0.15s',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                '&:hover': { boxShadow: 4 },
                '&:active': { opacity: 0.75 },
            }}
            onClick={done ? () => onViewDetail(task) : () => onComplete(task)}
        >
            <CardContent sx={{ pb: '12px !important', flex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
                    <Box flex={1} mr={1}>
                        <Typography variant="subtitle1" fontWeight={700} lineHeight={1.3}>
                            {task.instalacao_nome}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mt={0.25}>
                            {task.acao_operacao}
                        </Typography>
                        {task.descr && task.descr !== task.acao_operacao && (
                            <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
                                {task.descr}
                            </Typography>
                        )}
                    </Box>
                    <Stack direction="column" spacing={0.5} alignItems="flex-end" flexShrink={0}>
                        <Chip
                            size="small"
                            icon={done ? <DoneIcon /> : <PendingIcon />}
                            label={done ? 'Concluída' : 'Pendente'}
                            color={done ? 'success' : 'default'}
                            variant={done ? 'filled' : 'outlined'}
                        />
                        {hasLocation && (
                            <Chip
                                icon={<LocationIcon />}
                                label="Ver local"
                                size="small"
                                color="warning"
                                variant="outlined"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewLocation?.(task);
                                }}
                                sx={{ cursor: 'pointer' }}
                            />
                        )}
                    </Stack>
                </Stack>

                {/* Meta: data + operador */}
                <Stack direction="row" spacing={1.5} flexWrap="wrap" mt={0.5}>
                    {taskDate && (
                        <Stack direction="row" spacing={0.4} alignItems="center">
                            <CalIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.disabled">{taskDate}</Typography>
                        </Stack>
                    )}
                    {task.operador1_nome && (
                        <Stack direction="row" spacing={0.4} alignItems="center">
                            <PersonIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.disabled">{task.operador1_nome}</Typography>
                        </Stack>
                    )}
                    {task.operador2_nome && (
                        <Stack direction="row" spacing={0.4} alignItems="center">
                            <PersonIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.disabled">{task.operador2_nome}</Typography>
                        </Stack>
                    )}
                </Stack>

                {/* Resultado (para concluídas) */}
                {done && task.valuetext && (
                    <Box mt={0.75} px={1} py={0.5} sx={{ bgcolor: alpha(theme.palette.success.main, 0.08), borderRadius: 1 }}>
                        <Typography variant="caption" color="success.dark" fontWeight={600}>
                            Resultado: {task.valuetext}
                        </Typography>
                    </Box>
                )}
                {done && task.valuememo && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5} sx={{ fontStyle: 'italic' }}>
                        {task.valuememo.length > 80 ? task.valuememo.slice(0, 80) + '…' : task.valuememo}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// CompletionDialog — dialogo para registar conclusão de tarefa
// ─────────────────────────────────────────────────────────────────────────────
const CompletionDialog = ({ task, open, onClose, onSubmit, isSubmitting }) => {
    const [valuetext, setValuetext] = useState('');
    const [valuememo, setValuememo] = useState('');
    const [photo, setPhoto] = useState(null);
    const [photoName, setPhotoName] = useState('');
    const fileRef = useRef();

    const handlePhoto = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhoto(file);
        setPhotoName(file.name);
    };

    const handleSubmit = () => {
        onSubmit(task.pk, { valuetext, valuememo, photo });
        setValuetext('');
        setValuememo('');
        setPhoto(null);
        setPhotoName('');
    };

    if (!task) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ pr: 6 }}>
                <Typography variant="h6" component="div" fontWeight={700}>{task.instalacao_nome}</Typography>
                <Typography variant="body2" component="div" color="text.secondary">{task.acao_operacao}</Typography>
                <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2.5}>
                    {/* Mapa de localização (apenas se a tarefa tem coords) */}
                    {task.clat && task.clong && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
                                LOCAL DA OCORRÊNCIA
                            </Typography>
                            <Box sx={{ height: 180, borderRadius: 1.5, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
                                <LocationPickerMap
                                    lat={task.clat}
                                    lng={task.clong}
                                    onLocationSelect={() => {}}
                                />
                            </Box>
                            <Stack direction="row" spacing={1} mt={0.75} alignItems="center" flexWrap="wrap">
                                <Chip icon={<LocationIcon />} label={`Lat: ${parseFloat(task.clat).toFixed(5)}`} size="small" color="warning" variant="outlined" />
                                <Chip label={`Long: ${parseFloat(task.clong).toFixed(5)}`} size="small" color="warning" variant="outlined" />
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<NavigateIcon />}
                                    onClick={() => openNavigation(task.clat, task.clong)}
                                    sx={{ ml: 'auto' }}
                                >
                                    Navegar
                                </Button>
                            </Stack>
                        </Box>
                    )}
                    <TextField
                        label="Resultado / Valor registado"
                        fullWidth
                        value={valuetext}
                        onChange={e => setValuetext(e.target.value)}
                        placeholder="Ex: 45 m³, OK, Concluído..."
                        inputProps={{ style: { fontSize: 16 } }}
                    />
                    <TextField
                        label="Observações"
                        fullWidth
                        multiline
                        rows={3}
                        value={valuememo}
                        onChange={e => setValuememo(e.target.value)}
                        placeholder="Observações ou notas relevantes..."
                        inputProps={{ style: { fontSize: 16 } }}
                    />
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            ref={fileRef}
                            onChange={handlePhoto}
                            style={{ display: 'none' }}
                        />
                        {photo ? (
                            <Chip
                                label={photoName}
                                icon={<AttachIcon />}
                                onDelete={() => { setPhoto(null); setPhotoName(''); fileRef.current.value = ''; }}
                                onClick={() => fileRef.current.click()}
                                color="primary"
                                variant="outlined"
                                sx={{ maxWidth: '100%', height: 44, fontSize: 14, cursor: 'pointer' }}
                            />
                        ) : (
                            <Button
                                variant="outlined"
                                startIcon={<CameraIcon />}
                                onClick={() => fileRef.current.click()}
                                size="large"
                                fullWidth
                                sx={{ minHeight: 52 }}
                            >
                                Tirar Foto / Anexar Ficheiro
                            </Button>
                        )}
                        {!!task.requer_foto && !photo && (
                            <Alert severity="warning" sx={{ width: '100%' }}>
                                Esta tarefa requer registo fotográfico.
                            </Alert>
                        )}
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} disabled={isSubmitting} size="large">Cancelar</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!valuetext && !valuememo && !photo)}
                    startIcon={isSubmitting ? <CircularProgress size={18} /> : <DoneIcon />}
                    size="large"
                    sx={{ minWidth: 160 }}
                >
                    {isSubmitting ? 'A registar...' : 'Confirmar Conclusão'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// RequisicaoDialog — criação de requisição interna
// ─────────────────────────────────────────────────────────────────────────────
const RequisicaoDialog = ({ open, onClose }) => {
    const [memo, setMemo] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (memo.trim().length < 10) return;
        setSaving(true);
        try {
            await operationService.createRequisicaoInterna(memo.trim());
            notification.success('Requisição interna criada com sucesso');
            setMemo('');
            onClose();
        } catch {
            notification.error('Erro ao criar requisição interna');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ pr: 6 }}>
                Requisição Interna
                <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                        Descreva o material, serviço ou equipamento que necessita.
                        Indique a quantidade e urgência se aplicável.
                    </Typography>
                    <TextField
                        label="Descrição da Requisição"
                        fullWidth
                        multiline
                        rows={5}
                        value={memo}
                        onChange={e => setMemo(e.target.value)}
                        placeholder="Ex: Solicito 10 metros de manga de polietileno Ø90, urgente para reparação na Rua das Flores..."
                        helperText={`${memo.length} caracteres (mínimo 10)`}
                        inputProps={{ style: { fontSize: 16 } }}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} disabled={saving} size="large">Cancelar</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={saving || memo.trim().length < 10}
                    startIcon={saving ? <CircularProgress size={18} /> : <RequisicaoIcon />}
                    size="large"
                    sx={{ minWidth: 160 }}
                >
                    {saving ? 'A enviar...' : 'Enviar Requisição'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// TarefasTab
// ─────────────────────────────────────────────────────────────────────────────
const TarefasTab = ({ onNewTask }) => {
    const { pendingTasks, completedTasks, stats, isLoading, error, refetch, completeTask, isCompleting } =
        useOperationTasks();
    const [completingTask, setCompletingTask] = useState(null);
    const [detailTask, setDetailTask] = useState(null);
    const [locationTask, setLocationTask] = useState(null);
    const [showCompleted, setShowCompleted] = useState(false);

    const handleComplete = async (taskId, data) => {
        await completeTask(taskId, data);
        setCompletingTask(null);
    };

    // Hooks ANTES dos early returns (Rules of Hooks)
    const completionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    const groupedPending = useMemo(() => {
        const groups = {};
        pendingTasks.forEach(task => {
            const key = task.instalacao_nome || 'Sem instalação';
            if (!groups[key]) groups[key] = [];
            groups[key].push(task);
        });
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'pt'));
    }, [pendingTasks]);

    const groupedCompleted = useMemo(() => {
        const groups = {};
        completedTasks.forEach(task => {
            const key = task.instalacao_nome || 'Sem instalação';
            if (!groups[key]) groups[key] = [];
            groups[key].push(task);
        });
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'pt'));
    }, [completedTasks]);

    if (isLoading) {
        return (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight={300}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography color="text.secondary">A carregar tarefas...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity="error" action={<Button onClick={refetch}>Tentar novamente</Button>}>
                    Erro ao carregar tarefas.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 9 }}>
            {/* Tarefas pendentes — agrupadas por instalação, 2 colunas */}
            <Box px={2} mt={2}>
                {pendingTasks.length === 0 ? (
                    <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                        <DoneIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                        <Typography variant="h6" color="success.main" fontWeight={700}>
                            Todas as tarefas concluídas!
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mt={0.5}>
                            Não há tarefas pendentes para hoje.
                        </Typography>
                    </Paper>
                ) : (
                    <Box>
                        {groupedPending.map(([instalacao, tasks], index) => (
                            <Accordion
                                key={instalacao}
                                defaultExpanded={false}
                                disableGutters
                                sx={{ mb: 1, '&:before': { display: 'none' }, borderRadius: 1, overflow: 'hidden' }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{ minHeight: 48, bgcolor: 'action.hover' }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography variant="subtitle2" fontWeight={700} color="primary">
                                            {instalacao}
                                        </Typography>
                                        <Chip
                                            label={tasks.length}
                                            size="small"
                                            color="warning"
                                            sx={{ height: 18, fontSize: 11 }}
                                        />
                                    </Stack>
                                </AccordionSummary>
                                <AccordionDetails sx={{ pt: 1.5, pb: 2, px: 1.5 }}>
                                    <Grid container spacing={1.5}>
                                        {tasks.map(task => (
                                            <Grid key={task.pk} size={{ xs: 12, sm: 6 }}>
                                                <TaskCard task={task} onComplete={setCompletingTask} onViewDetail={setDetailTask} onViewLocation={setLocationTask} />
                                            </Grid>
                                        ))}
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Box>
                )}
            </Box>

            {/* Concluídas (colapsável) — agrupadas por instalação, 2 colunas */}
            {completedTasks.length > 0 && (
                <Box px={2} mt={2}>
                    <Button
                        onClick={() => setShowCompleted(v => !v)}
                        startIcon={showCompleted ? <CollapseIconBtn /> : <ExpandIcon />}
                        size="small"
                        color="inherit"
                        sx={{ color: 'text.secondary', mb: 1 }}
                    >
                        {showCompleted ? 'Ocultar' : 'Ver'} tarefas concluídas ({completedTasks.length})
                    </Button>
                    <Collapse in={showCompleted}>
                        <Box>
                            {groupedCompleted.map(([instalacao, tasks]) => (
                                <Accordion
                                    key={instalacao}
                                    defaultExpanded={false}
                                    disableGutters
                                    sx={{ mb: 1, '&:before': { display: 'none' }, borderRadius: 1, overflow: 'hidden' }}
                                >
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        sx={{ minHeight: 44, bgcolor: 'action.hover' }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Typography variant="subtitle2" fontWeight={700} color="success.main">
                                                {instalacao}
                                            </Typography>
                                            <Chip
                                                label={tasks.length}
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                                sx={{ height: 18, fontSize: 11 }}
                                            />
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ pt: 1.5, pb: 2, px: 1.5 }}>
                                        <Grid container spacing={1.5}>
                                            {tasks.map(task => (
                                                <Grid key={task.pk} size={{ xs: 12, sm: 6 }}>
                                                    <TaskCard task={task} onComplete={() => {}} onViewDetail={setDetailTask} />
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Box>
                    </Collapse>
                </Box>
            )}

            {/* FAB nova tarefa */}
            <Fab
                color="primary"
                sx={{ position: 'fixed', bottom: 72, right: 20 }}
                onClick={onNewTask}
            >
                <CriarIcon />
            </Fab>

            <CompletionDialog
                task={completingTask}
                open={!!completingTask}
                onClose={() => setCompletingTask(null)}
                onSubmit={handleComplete}
                isSubmitting={isCompleting}
            />

            <TaskDetailDialog
                task={detailTask}
                open={!!detailTask}
                onClose={() => setDetailTask(null)}
            />

            <TaskLocationDialog
                task={locationTask}
                open={!!locationTask}
                onClose={() => setLocationTask(null)}
            />
        </Box>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// PedidosTab
// ─────────────────────────────────────────────────────────────────────────────
const PedidosTab = ({ onNewPedido }) => {
    const theme = useTheme();
    const { data: pedidos = [], isLoading, error, refetch } = useDocuments('assigned');
    const { data: metaData } = useMetaData();
    const [selectedDoc, setSelectedDoc] = useState(null);

    if (isLoading) {
        return (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight={300}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography color="text.secondary">A carregar pedidos...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity="error" action={<Button onClick={refetch}>Tentar novamente</Button>}>
                    Erro ao carregar pedidos.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 9 }}>
            <Box px={2} mt={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Chip
                        label={`${pedidos.length} pedido${pedidos.length !== 1 ? 's' : ''} a meu cargo`}
                        variant="outlined"
                    />
                    <IconButton size="small" onClick={refetch} title="Atualizar">
                        <RefreshIcon />
                    </IconButton>
                </Stack>

                {pedidos.length === 0 ? (
                    <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                        <PedidosIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="h6" color="text.secondary" fontWeight={600}>
                            Sem pedidos atribuídos
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mt={0.5}>
                            Não há pedidos a seu cargo neste momento.
                        </Typography>
                    </Paper>
                ) : (
                    <Grid container spacing={1.5}>
                        {[...pedidos]
                            .sort((a, b) => {
                                const aUrgent = String(a.urgency) === '1' ? 0 : 1;
                                const bUrgent = String(b.urgency) === '1' ? 0 : 1;
                                if (aUrgent !== bUrgent) return aUrgent - bUrgent;
                                // do mais antigo para o mais recente
                                const aDate = a.submission?.split(' às ')?.[0] || '';
                                const bDate = b.submission?.split(' às ')?.[0] || '';
                                return aDate.localeCompare(bDate);
                            })
                            .map(doc => {
                            const { label: statusLabel, color: statusColor } = statusDoc(doc.what);
                            const isUrgent = String(doc.urgency) === '1';

                            // Morada completa
                            const addressParts = [doc.address, doc.door, doc.floor].filter(Boolean);
                            const fullAddress = addressParts.join(', ');
                            const locality = [doc.postal, doc.nut4].filter(Boolean).join(' ');

                            // Data — formato "2026-02-18 às 09:47" não parseável diretamente
                            const submissionDate = doc.submission?.split(' às ')?.[0] || null;

                            return (
                                <Grid key={doc.pk || doc.regnumber} size={{ xs: 12, sm: 6 }}>
                                <Card
                                    onClick={() => setSelectedDoc(doc)}
                                    sx={{
                                        borderLeft: `4px solid ${isUrgent
                                            ? theme.palette.error.main
                                            : theme.palette[statusColor]?.main || theme.palette.info.main}`,
                                        bgcolor: isUrgent ? alpha(theme.palette.error.main, 0.05) : undefined,
                                        cursor: 'pointer',
                                        transition: 'box-shadow 0.15s',
                                        '&:hover': { boxShadow: 4 },
                                        '&:active': { opacity: 0.85 },
                                    }}
                                >
                                    {/* Banner urgente */}
                                    {isUrgent && (
                                        <Box sx={{
                                            px: 1.5, py: 0.4,
                                            bgcolor: 'error.main',
                                            display: 'flex', alignItems: 'center', gap: 0.5,
                                        }}>
                                            <UrgentIcon sx={{ fontSize: 13, color: '#fff' }} />
                                            <Typography variant="caption" fontWeight={700} sx={{ color: '#fff', letterSpacing: 0.8 }}>
                                                URGENTE
                                            </Typography>
                                        </Box>
                                    )}
                                    <CardContent sx={{ pb: '12px !important' }}>
                                        {/* Linha 1: número + tipo | estado */}
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                                                <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                                                    {doc.regnumber || `#${doc.pk}`}
                                                </Typography>
                                                {doc.tt_type && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        · {doc.tt_type}
                                                    </Typography>
                                                )}
                                            </Stack>
                                            <Chip label={statusLabel} color={statusColor} size="small" />
                                        </Stack>

                                        {/* Linha 2: data */}
                                        {submissionDate && (
                                            <Stack direction="row" spacing={0.5} alignItems="center" mb={0.4}>
                                                <CalIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    {submissionDate}
                                                </Typography>
                                            </Stack>
                                        )}

                                        {/* Linha 3: requerente */}
                                        {doc.ts_entity && (
                                            <Stack direction="row" spacing={0.5} alignItems="center" mb={0.4}>
                                                <PersonIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                                                <Typography variant="caption" fontWeight={600}>
                                                    {doc.ts_entity}
                                                </Typography>
                                            </Stack>
                                        )}

                                        {/* Linha 3: morada */}
                                        {(fullAddress || locality) && (
                                            <Stack direction="row" spacing={0.5} alignItems="flex-start" mb={0.5}>
                                                <LocationIcon sx={{ fontSize: 13, color: 'text.disabled', mt: 0.15 }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    {[fullAddress, locality].filter(Boolean).join(', ')}
                                                </Typography>
                                            </Stack>
                                        )}

                                        {/* Linha 4: telefone */}
                                        {doc.phone && (
                                            <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                                                <PhoneIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    {doc.phone}
                                                </Typography>
                                            </Stack>
                                        )}

                                        {/* Linha 5: memo */}
                                        {doc.memo && (
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                    mt: 0.5,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                {doc.memo}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </Box>

            <Fab
                color="primary"
                sx={{ position: 'fixed', bottom: 72, right: 20 }}
                onClick={onNewPedido}
            >
                <CriarIcon />
            </Fab>

            {/* Modal simplificado de tramitação */}
            <PedidoOperadorModal
                open={!!selectedDoc}
                onClose={() => { setSelectedDoc(null); refetch(); }}
                docData={selectedDoc}
            />
        </Box>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// CriarTab — painel de criação
// ─────────────────────────────────────────────────────────────────────────────
const CriarTab = ({ onNewTask, onNewPedido, onNewRequisicao }) => {
    const theme = useTheme();

    const options = [
        {
            icon: <TaskIcon sx={{ fontSize: 40 }} />,
            label: 'Nova Tarefa Operacional',
            description: 'Registar uma operação imediata (ETAR, EE, Rede, Caixa)',
            color: theme.palette.primary.main,
            action: onNewTask,
        },
        {
            icon: <DocIcon sx={{ fontSize: 40 }} />,
            label: 'Novo Pedido',
            description: 'Criar um novo pedido / ocorrência no sistema',
            color: theme.palette.success.main,
            action: onNewPedido,
        },
        {
            icon: <RequisicaoIcon sx={{ fontSize: 40 }} />,
            label: 'Requisição Interna',
            description: 'Solicitar material, equipamento ou serviço interno',
            color: theme.palette.warning.main,
            action: onNewRequisicao,
        },
    ];

    return (
        <Box px={2} pt={3} pb={9}>
            <Typography variant="h6" fontWeight={700} mb={0.5}>O que pretende criar?</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Selecione uma das opções abaixo
            </Typography>
            <Stack spacing={2}>
                {options.map(opt => (
                    <Card
                        key={opt.label}
                        onClick={opt.action}
                        sx={{
                            cursor: 'pointer',
                            border: `1px solid ${alpha(opt.color, 0.3)}`,
                            borderLeft: `5px solid ${opt.color}`,
                            transition: 'all 0.2s',
                            '&:active': { transform: 'scale(0.98)' },
                        }}
                    >
                        <CardContent>
                            <Stack direction="row" spacing={2.5} alignItems="center">
                                <Box sx={{ color: opt.color }}>{opt.icon}</Box>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={700}>{opt.label}</Typography>
                                    <Typography variant="body2" color="text.secondary">{opt.description}</Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                ))}
            </Stack>
        </Box>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// NewTaskDialog — wrapper do DirectTaskForm
// ─────────────────────────────────────────────────────────────────────────────
const NewTaskDialog = ({ open, onClose, onSubmit }) => (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
            Nova Tarefa Operacional
            <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                <CloseIcon />
            </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
            <DirectTaskForm onSubmit={onSubmit} onCancel={onClose} />
        </DialogContent>
    </Dialog>
);

// ─────────────────────────────────────────────────────────────────────────────
// OperatorTabletPage — componente principal
// ─────────────────────────────────────────────────────────────────────────────
const OperatorTabletPage = () => {
    const { user } = useAuth();
    const [tab, setTab] = useState(0);
    const [newTaskOpen, setNewTaskOpen] = useState(false);
    const [newPedidoOpen, setNewPedidoOpen] = useState(false);
    const [newRequisicaoOpen, setNewRequisicaoOpen] = useState(false);
    const { pendingTasks, completedTasks, stats, refetch, createTask } = useOperationTasks();

    const pendingCount = pendingTasks?.length ?? 0;
    const completionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    const handleNewTask = async (data) => {
        await createTask(data);
        setNewTaskOpen(false);
    };

    const handleTabChange = (_, newVal) => setTab(newVal);

    const openNewTask = () => { setNewTaskOpen(true); setTab(0); };
    const openNewPedido = () => { setNewPedidoOpen(true); };
    const openNewRequisicao = () => { setNewRequisicaoOpen(true); };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
            {/* AppBar compacto com stats na mesma linha */}
            <AppBar position="static" color="default" elevation={1}>
                <Toolbar variant="dense" sx={{ minHeight: 56, gap: 2 }}>
                    {/* Título + data */}
                    <Box sx={{ flexShrink: 0 }}>
                        <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                            Operações
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                            {todayLabel()}
                        </Typography>
                    </Box>

                    {/* Stats — ocupa o espaço central */}
                    {tab === 0 && (
                        <Box flex={1} minWidth={0}>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <Chip
                                    icon={<PendingIcon />}
                                    label={`${stats.pending} pendentes`}
                                    color={stats.pending > 0 ? 'warning' : 'default'}
                                    variant="outlined"
                                    size="small"
                                />
                                <Chip
                                    icon={<DoneIcon />}
                                    label={`${stats.completed} concluídas`}
                                    color="success"
                                    variant="outlined"
                                    size="small"
                                />
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <LinearProgress
                                    variant="determinate"
                                    value={completionPct}
                                    color={completionPct === 100 ? 'success' : 'primary'}
                                    sx={{ borderRadius: 1, height: 5, flex: 1 }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                                    {completionPct}%
                                </Typography>
                            </Stack>
                        </Box>
                    )}

                    {/* Refresh — sempre visível no tab de tarefas */}
                    {tab === 0 && (
                        <IconButton size="small" onClick={refetch} title="Atualizar tarefas" sx={{ flexShrink: 0 }}>
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    )}

                </Toolbar>
            </AppBar>

            {/* Conteúdo (scrollável) */}
            <Box flex={1} overflow="auto">
                {tab === 0 && <TarefasTab onNewTask={openNewTask} />}
                {tab === 1 && <PedidosTab onNewPedido={openNewPedido} />}
                {tab === 2 && (
                    <CriarTab
                        onNewTask={openNewTask}
                        onNewPedido={openNewPedido}
                        onNewRequisicao={openNewRequisicao}
                    />
                )}
            </Box>

            {/* Bottom Navigation */}
            <Paper elevation={3} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200 }}>
                <BottomNavigation value={tab} onChange={handleTabChange} showLabels>
                    <BottomNavigationAction
                        label="Tarefas"
                        icon={
                            <Badge badgeContent={pendingCount} color="warning" max={99}>
                                <TarefasIcon />
                            </Badge>
                        }
                    />
                    <BottomNavigationAction
                        label="Pedidos"
                        icon={<PedidosIcon />}
                    />
                    <BottomNavigationAction
                        label="Criar"
                        icon={<CriarIcon />}
                    />
                </BottomNavigation>
            </Paper>

            {/* Dialogs */}
            <NewTaskDialog
                open={newTaskOpen}
                onClose={() => setNewTaskOpen(false)}
                onSubmit={handleNewTask}
            />

            <Suspense fallback={null}>
                <CreateDocumentModal
                    open={newPedidoOpen}
                    onClose={() => setNewPedidoOpen(false)}
                />
            </Suspense>

            <RequisicaoDialog
                open={newRequisicaoOpen}
                onClose={() => setNewRequisicaoOpen(false)}
            />
        </Box>
    );
};

export default OperatorTabletPage;
