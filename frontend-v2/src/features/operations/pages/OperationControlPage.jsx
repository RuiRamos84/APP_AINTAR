import React, { useState, useMemo, useCallback } from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    CircularProgress,
    Grid,
    IconButton,
    useTheme,
    alpha,
    Card
} from '@mui/material';
import {
    Search as SearchIcon,
    CheckCircle,
    Cancel,
    Edit,
    Download as DownloadIcon,
    Visibility as VisibilityIcon,
    Close as CloseIcon,
    LockOpen as UnlockIcon,
    Warning,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    Description as DescriptionIcon,
    ZoomIn as PreviewIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/notification/notificationService';
import { operationService } from '../services/operationService';
import metadataService from '@/services/metadataService';
import { SearchBar, SortableHeadCell } from '@/shared/components/data';
import { useSortable } from '@/shared/hooks/useSortable';
import {
    OPERATION_TYPES,
    formatBooleanValue,
} from '../constants/operationTypes';
import FileUploadControl from '../components/FileUploadControl';

// Mapeamento de cores/ícones por pk real da BD (tt_operacaocontrolo)
// pk=1: Incumprimento ligeiro | pk=2: Incumprimento grave | pk=3: Incumprimento muito grave | pk=10: Conforme
const CONTROL_COLOR_MAP = { 1: 'info', 2: 'warning', 3: 'error', 10: 'success' };
const CONTROL_ICON_MAP = {
    1: <Warning fontSize="small" />,
    2: <Warning fontSize="small" />,
    3: <Cancel fontSize="small" />,
    10: <CheckCircle fontSize="small" />,
};

const getFileIcon = (filename) => {
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) return <ImageIcon fontSize="small" color="success" />;
    if (/\.pdf$/i.test(filename)) return <PdfIcon fontSize="small" color="error" />;
    return <DescriptionIcon fontSize="small" color="info" />;
};

const OperationControlPage = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();

    // Filtros
    const [selectedEntity, setSelectedEntity] = useState('');
    const [selectedTipo, setSelectedTipo] = useState('');
    const [selectedInstalacao, setSelectedInstalacao] = useState('');
    const [lastDays, setLastDays] = useState('7');

    // Estado do Modal
    const [controlDialog, setControlDialog] = useState(false);
    const [viewMode, setViewMode] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [controlData, setControlData] = useState({
        control_tt_operacaocontrolo: '',
        control_memo: '',
    });
    const [controlFiles, setControlFiles] = useState([]);
    const [downloading, setDownloading] = useState(null);
    const [filePreview, setFilePreview] = useState(null);

    // Queries
    const { data: metaData, isLoading: loadingMetaData } = useQuery({
        queryKey: ['metadata'],
        queryFn: metadataService.fetchMetaData,
        staleTime: 1000 * 60 * 30
    });

    // Opções de controlo vindas da BD (tt_operacaocontrolo)
    const controlOptions = metaData?.opcontrolo || [];

    const getControlState = (pk) => {
        const option = controlOptions.find(o => o.pk === pk);
        if (!option) return null;
        return {
            label: option.value,
            color: CONTROL_COLOR_MAP[pk] || 'default',
            icon: CONTROL_ICON_MAP[pk] || <Warning fontSize="small" />,
        };
    };

    // Anexos da tarefa selecionada — carregados quando o diálogo abre
    const { data: annexesData, isLoading: loadingAnnexes } = useQuery({
        queryKey: ['controlAnnexes', selectedTask?.pk],
        queryFn: () => operationService.getControlAnnexes(selectedTask.pk),
        enabled: !!selectedTask?.pk && controlDialog,
        staleTime: 0,
    });

    const { data: tasksData, isLoading: loadingTasks, refetch: searchTasks } = useQuery({
        queryKey: ['operationControl', selectedInstalacao, lastDays],
        queryFn: () => operationService.queryControl({
            tb_instalacao: selectedInstalacao,
            last_days: parseInt(lastDays)
        }),
        enabled: false,
    });

    // Pesquisa + ordenação na tabela de resultados
    const [searchTerm, setSearchTerm] = useState('');
    const rawTasks = tasksData?.data || [];
    const filteredTasks = useMemo(() => {
        if (!searchTerm.trim()) return rawTasks;
        const q = searchTerm.toLowerCase();
        return rawTasks.filter(t =>
            (t.tt_operacaoaccao || '').toLowerCase().includes(q) ||
            (t.updt_client || '').toLowerCase().includes(q)
        );
    }, [rawTasks, searchTerm]);
    const { sorted: sortedTasks, sortKey, sortDir, requestSort } = useSortable(filteredTasks, 'data', 'desc');

    // Filtros derivados
    const entities = useMemo(() => {
        if (!metaData?.etar || !metaData?.ee) return [];
        const allEntities = new Set();
        metaData.etar.forEach(e => e.ts_entity && allEntities.add(e.ts_entity));
        metaData.ee.forEach(e => e.ts_entity && allEntities.add(e.ts_entity));
        return Array.from(allEntities).sort();
    }, [metaData]);

    const installations = useMemo(() => {
        if (!metaData || !selectedEntity || !selectedTipo) return [];
        const source = selectedTipo === 'ETAR' ? metaData.etar : metaData.ee;
        if (!source) return [];
        return source
            .filter(inst => inst.ts_entity === selectedEntity)
            .map(inst => ({ pk: inst.pk, nome: inst.nome, subsistema: inst.subsistema }))
            .sort((a, b) => a.nome.localeCompare(b.nome));
    }, [metaData, selectedEntity, selectedTipo]);

    // Mutation
    const updateControlMutation = useMutation({
        mutationFn: operationService.updateControl,
        onSuccess: async () => {
            await searchTasks();
            queryClient.invalidateQueries({ queryKey: ['controlAnnexes'] });
            handleCloseControlDialog();
            notification.success('Controlo guardado com sucesso');
        },
        onError: () => {
            notification.error('Erro ao guardar controlo');
        }
    });

    // Handlers
    const handleSearch = () => {
        if (selectedInstalacao && lastDays) searchTasks();
    };

    const handleOpenControlDialog = (task, isViewMode = false) => {
        setSelectedTask(task);
        setViewMode(isViewMode);
        setControlData({
            control_tt_operacaocontrolo: task.control_tt_operacaocontrolo || '',
            control_memo: task.control_memo || '',
        });
        setControlFiles([]);
        setControlDialog(true);
    };

    const handleCloseControlDialog = () => {
        setControlDialog(false);
        setViewMode(false);
        setSelectedTask(null);
        setControlFiles([]);
    };

    const handleSaveControl = () => {
        if (!controlData.control_tt_operacaocontrolo) {
            notification.warning('Selecione uma classificação antes de guardar');
            return;
        }
        const formData = new FormData();
        formData.append('pk', selectedTask.pk);
        formData.append('control_tt_operacaocontrolo', controlData.control_tt_operacaocontrolo);
        formData.append('control_memo', controlData.control_memo || '');
        controlFiles.forEach((fileItem) => {
            formData.append('files', fileItem.file);
        });
        updateControlMutation.mutate(formData);
    };

    const fetchAnnexBlob = useCallback(async (annexPk) => {
        // O interceptor do apiClient já devolve response.data diretamente
        return await operationService.downloadControlAnnex(annexPk);
    }, []);

    const handleDownloadFile = useCallback(async (annex) => {
        setDownloading(annex.pk);
        try {
            const blob = await fetchAnnexBlob(annex.pk);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = annex.descr || annex.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('[handleDownloadFile]', error);
            notification.error('Erro ao descarregar ficheiro');
        } finally {
            setDownloading(null);
        }
    }, [fetchAnnexBlob]);

    const handlePreviewFile = useCallback(async (annex) => {
        setDownloading(annex.pk);
        try {
            const blob = await fetchAnnexBlob(annex.pk);
            const url = window.URL.createObjectURL(blob);
            const isPdfFile = /\.pdf$/i.test(annex.filename);
            setFilePreview({ url, name: annex.descr || annex.filename, isPdf: isPdfFile });
        } catch (error) {
            console.error('[handlePreviewFile]', error);
            notification.error('Erro ao carregar pré-visualização');
        } finally {
            setDownloading(null);
        }
    }, [fetchAnnexBlob]);

    const handleCloseFilePreview = () => {
        if (filePreview?.url) window.URL.revokeObjectURL(filePreview.url);
        setFilePreview(null);
    };

    const existingAnnexes = annexesData?.data?.data || annexesData?.data || [];

    // Render Helpers
    const formatValueByType = (task) => {
        const type = task.tt_operacaoaccao_type;
        const value = task.valuetext;
        if (!value) return '-';
        switch (type) {
            case OPERATION_TYPES.NUMBER:
                return <Typography fontWeight={600} color="primary.main">{value}</Typography>;
            case OPERATION_TYPES.BOOLEAN:
                return (
                    <Chip
                        label={formatBooleanValue(value)}
                        color={value === '1' ? 'success' : 'default'}
                        size="small"
                        variant="outlined"
                    />
                );
            case OPERATION_TYPES.ANALYSIS:
                if (value === '1' || value === '0') {
                    return (
                        <Chip
                            label={value === '1' ? 'Recolha realizada' : 'Não realizada'}
                            color={value === '1' ? 'success' : 'default'}
                            size="small"
                        />
                    );
                }
                return <Typography fontWeight={600} color="primary.main">{value}</Typography>;
            default:
                return value;
        }
    };

    const glassCard = {
        background: alpha(theme.palette.background.paper, 0.7),
        backdropFilter: 'blur(10px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: theme.shadows[2],
        borderRadius: 3
    };

    const isAlreadyControlled = (task) => task.control_tt_operacaocontrolo !== null && task.control_tt_operacaocontrolo !== undefined;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Controlo Operacional
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Verifique e valide as tarefas executadas nas instalações.
                </Typography>
            </Box>

            {/* Filtros */}
            <Paper sx={{ p: 3, mb: 3, ...glassCard }}>
                <Stack spacing={3}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Município/Associado</InputLabel>
                                <Select
                                    value={selectedEntity}
                                    onChange={(e) => { setSelectedEntity(e.target.value); setSelectedInstalacao(''); }}
                                    label="Município/Associado"
                                >
                                    {entities.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Tipo Instalação</InputLabel>
                                <Select
                                    value={selectedTipo}
                                    onChange={(e) => { setSelectedTipo(e.target.value); setSelectedInstalacao(''); }}
                                    label="Tipo Instalação"
                                >
                                    <MenuItem value="ETAR">ETAR</MenuItem>
                                    <MenuItem value="EE">EE</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Instalação</InputLabel>
                                <Select
                                    value={selectedInstalacao}
                                    onChange={(e) => setSelectedInstalacao(e.target.value)}
                                    label="Instalação"
                                    disabled={!selectedEntity || !selectedTipo}
                                >
                                    {installations.map(i => (
                                        <MenuItem key={i.pk} value={i.pk}>
                                            {i.nome} {i.subsistema && `(${i.subsistema})`}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 2 }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Dias atrás"
                                type="number"
                                value={lastDays}
                                onChange={(e) => setLastDays(e.target.value)}
                            />
                        </Grid>
                    </Grid>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            startIcon={<SearchIcon />}
                            onClick={handleSearch}
                            disabled={!selectedInstalacao || loadingMetaData}
                        >
                            Pesquisar
                        </Button>
                    </Box>
                </Stack>
            </Paper>

            {/* Tabela de resultados */}
            {loadingTasks && (
                <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
            )}

            {!loadingTasks && rawTasks.length > 0 && (
                <Paper sx={{ ...glassCard, overflow: 'hidden' }}>
                    <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                        <SearchBar searchTerm={searchTerm} onSearch={setSearchTerm} placeholder="Pesquisar por ação ou executor..." />
                    </Box>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                    <SortableHeadCell label="Data" field="data" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} sx={{ fontWeight: 600 }} />
                                    <SortableHeadCell label="Ação" field="tt_operacaoaccao" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} sx={{ fontWeight: 600 }} />
                                    <SortableHeadCell label="Executado Por" field="updt_client" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} sx={{ fontWeight: 600 }} />
                                    <TableCell sx={{ fontWeight: 600 }}>Valor</TableCell>
                                    <SortableHeadCell label="Estado" field="control_tt_operacaocontrolo" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} sx={{ fontWeight: 600 }} />
                                    <TableCell align="center" sx={{ fontWeight: 600 }}>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedTasks.map((task) => {
                                    const state = getControlState(task.control_tt_operacaocontrolo);
                                    const controlled = isAlreadyControlled(task);
                                    return (
                                        <TableRow key={task.pk} hover>
                                            <TableCell>{new Date(task.data).toLocaleDateString('pt-PT')}</TableCell>
                                            <TableCell>{task.tt_operacaoaccao}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{task.updt_client || '-'}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {task.updt_time && new Date(task.updt_time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{formatValueByType(task)}</TableCell>
                                            <TableCell>
                                                {state ? (
                                                    <Chip
                                                        icon={state.icon}
                                                        label={state.label}
                                                        color={state.color}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                ) : (
                                                    <Chip label="Pendente" size="small" variant="outlined" />
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Button
                                                    size="small"
                                                    variant={controlled ? 'outlined' : 'contained'}
                                                    color={controlled ? 'inherit' : 'primary'}
                                                    startIcon={controlled ? <VisibilityIcon /> : <Edit />}
                                                    onClick={() => handleOpenControlDialog(task, controlled)}
                                                >
                                                    {controlled ? 'Ver' : 'Controlar'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {!loadingTasks && rawTasks.length === 0 && (
                <Box textAlign="center" py={8} sx={{ opacity: 0.6 }}>
                    <SearchIcon sx={{ fontSize: 64, mb: 2, color: 'text.disabled' }} />
                    <Typography>Nenhum registo encontrado para os filtros selecionados.</Typography>
                </Box>
            )}
            {!loadingTasks && rawTasks.length > 0 && sortedTasks.length === 0 && (
                <Box textAlign="center" py={4} sx={{ opacity: 0.6 }}>
                    <Typography>Nenhum resultado para "{searchTerm}".</Typography>
                </Box>
            )}

            {/* Dialog de Controlo */}
            <Dialog
                open={controlDialog}
                onClose={handleCloseControlDialog}
                maxWidth="sm"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3 } } }}
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">
                            {viewMode ? 'Detalhes do Controlo' : 'Validar Tarefa'}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            {viewMode && (
                                <Chip
                                    label="Modo leitura"
                                    size="small"
                                    variant="outlined"
                                    icon={<VisibilityIcon />}
                                />
                            )}
                            <IconButton onClick={handleCloseControlDialog} size="small">
                                <CloseIcon />
                            </IconButton>
                        </Stack>
                    </Box>
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={3}>
                        {/* Info da Tarefa */}
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                            <Grid container spacing={2}>
                                <Grid size={6}>
                                    <Typography variant="caption" color="text.secondary">Ação</Typography>
                                    <Typography variant="body2" fontWeight={600}>{selectedTask?.tt_operacaoaccao}</Typography>
                                </Grid>
                                <Grid size={6}>
                                    <Typography variant="caption" color="text.secondary">Valor Registado</Typography>
                                    <Box>{selectedTask && formatValueByType(selectedTask)}</Box>
                                </Grid>
                                {selectedTask?.data && (
                                    <Grid size={6}>
                                        <Typography variant="caption" color="text.secondary">Data</Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {new Date(selectedTask.data).toLocaleDateString('pt-PT')}
                                        </Typography>
                                    </Grid>
                                )}
                                {selectedTask?.updt_client && (
                                    <Grid size={6}>
                                        <Typography variant="caption" color="text.secondary">Executado por</Typography>
                                        <Typography variant="body2" fontWeight={600}>{selectedTask.updt_client}</Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>

                        {/* Classificação — 3 valores */}
                        <FormControl fullWidth disabled={viewMode} required>
                            <InputLabel>Classificação</InputLabel>
                            <Select
                                value={controlData.control_tt_operacaocontrolo}
                                onChange={(e) => setControlData({ ...controlData, control_tt_operacaocontrolo: e.target.value })}
                                label="Classificação"
                                displayEmpty
                            >
                                <MenuItem value="" disabled><em>Selecione uma classificação</em></MenuItem>
                                {controlOptions.map((opt) => (
                                    <MenuItem key={opt.pk} value={opt.pk}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Box sx={{ color: `${CONTROL_COLOR_MAP[opt.pk] || 'default'}.main`, display: 'flex' }}>
                                                {CONTROL_ICON_MAP[opt.pk] || <Warning fontSize="small" />}
                                            </Box>
                                            <span>{opt.value}</span>
                                        </Stack>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Observações */}
                        <TextField
                            label="Observações"
                            multiline
                            rows={3}
                            value={controlData.control_memo}
                            onChange={(e) => setControlData({ ...controlData, control_memo: e.target.value })}
                            disabled={viewMode}
                            fullWidth
                        />

                        {/* Ficheiros já anexados */}
                        {loadingAnnexes && (
                            <Box display="flex" justifyContent="center" py={1}>
                                <CircularProgress size={20} />
                            </Box>
                        )}
                        {!loadingAnnexes && existingAnnexes.length > 0 && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                    Ficheiros já anexados ({existingAnnexes.length})
                                </Typography>
                                <Stack spacing={1}>
                                    {existingAnnexes.map((annex) => {
                                        const displayName = annex.descr || annex.filename;
                                        const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(annex.filename);
                                        const isPdfFile = /\.pdf$/i.test(annex.filename);
                                        const canPreview = isImg || isPdfFile;
                                        const busy = downloading === annex.pk;
                                        return (
                                            <Card
                                                key={annex.pk}
                                                variant="outlined"
                                                sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}
                                            >
                                                {getFileIcon(annex.filename)}
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" noWrap title={displayName}>
                                                        {displayName}
                                                    </Typography>
                                                    {annex.data && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {annex.data}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <Stack direction="row" spacing={0.5}>
                                                    {canPreview && (
                                                        <IconButton
                                                            size="small"
                                                            title="Pré-visualizar"
                                                            onClick={() => handlePreviewFile(annex)}
                                                            disabled={busy}
                                                            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                                        >
                                                            {busy ? <CircularProgress size={16} /> : <PreviewIcon fontSize="small" />}
                                                        </IconButton>
                                                    )}
                                                    <IconButton
                                                        size="small"
                                                        title="Descarregar"
                                                        onClick={() => handleDownloadFile(annex)}
                                                        disabled={busy}
                                                        sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                                    >
                                                        {busy && !canPreview ? <CircularProgress size={16} /> : <DownloadIcon fontSize="small" />}
                                                    </IconButton>
                                                </Stack>
                                            </Card>
                                        );
                                    })}
                                </Stack>
                            </Box>
                        )}

                        {/* Upload novos ficheiros — apenas em modo edição */}
                        {!viewMode && (
                            <FileUploadControl
                                files={controlFiles}
                                setFiles={setControlFiles}
                            />
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleCloseControlDialog}>Fechar</Button>
                    {viewMode ? (
                        <Button
                            onClick={() => setViewMode(false)}
                            variant="outlined"
                            startIcon={<UnlockIcon />}
                        >
                            Editar Validação
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSaveControl}
                            variant="contained"
                            disabled={updateControlMutation.isPending}
                            startIcon={updateControlMutation.isPending ? <CircularProgress size={16} color="inherit" /> : null}
                        >
                            {updateControlMutation.isPending ? 'A guardar...' : 'Guardar Validação'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
            {/* Modal de pré-visualização de ficheiros guardados */}
            <Dialog
                open={!!filePreview}
                onClose={handleCloseFilePreview}
                maxWidth="md"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: 2 } } }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
                    <Typography variant="subtitle1" component="div" noWrap sx={{ maxWidth: '80%' }} title={filePreview?.name}>
                        {filePreview?.name}
                    </Typography>
                    <IconButton size="small" onClick={handleCloseFilePreview}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                    {filePreview?.isPdf ? (
                        <iframe
                            src={filePreview.url}
                            title={filePreview.name}
                            style={{ width: '100%', height: '70vh', border: 'none' }}
                        />
                    ) : filePreview?.url ? (
                        <img
                            src={filePreview.url}
                            alt={filePreview?.name}
                            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 4 }}
                        />
                    ) : null}
                </DialogContent>
            </Dialog>
        </Container>
    );
};

export default OperationControlPage;
