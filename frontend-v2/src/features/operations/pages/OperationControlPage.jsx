import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
    Alert,
    CircularProgress,
    Grid,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Divider,
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
    Close as CloseIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operationService } from '../services/operationService';
import metadataService from '@/services/metadataService';
import {
    OPERATION_TYPES,
    formatBooleanValue,
    getOperationTypeConfig
} from '../constants/operationTypes';
import FileUploadControl from '../components/FileUploadControl';

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
        control_check: 0,
        control_tt_operacaocontrolo: null,
        control_memo: '',
        control_foto: ''
    });
    const [controlFiles, setControlFiles] = useState([]);

    // Estado do Preview
    const [previewDialog, setPreviewDialog] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);

    // Queries
    const { data: metaData, isLoading: loadingMetaData } = useQuery({
        queryKey: ['metadata'],
        queryFn: metadataService.fetchMetaData,
        staleTime: 1000 * 60 * 30 // 30 mins
    });

    const { data: tasksData, isLoading: loadingTasks, error: tasksError, refetch: searchTasks } = useQuery({
        queryKey: ['operationControl', selectedInstalacao, lastDays],
        queryFn: () => operationService.queryControl({
            tb_instalacao: selectedInstalacao,
            last_days: parseInt(lastDays)
        }),
        enabled: false, // Só busca quando usuario clica em pesquisar
    });

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
            .map(inst => ({
                pk: inst.pk,
                nome: inst.nome,
                subsistema: inst.subsistema
            }))
            .sort((a, b) => a.nome.localeCompare(b.nome));
    }, [metaData, selectedEntity, selectedTipo]);

    // Mutations
    const updateControlMutation = useMutation({
        mutationFn: operationService.updateControl,
        onSuccess: () => {
            queryClient.invalidateQueries(['operationControl']);
            searchTasks();
            handleCloseControlDialog();
        },
        onError: (error) => {
            console.error('Erro ao guardar controlo:', error);
            // Mostrar toast de erro
        }
    });

    // Handlers
    const handleSearch = () => {
        if (selectedInstalacao && lastDays) {
            searchTasks();
        }
    };

    const handleOpenControlDialog = (task, isViewMode = false) => {
        setSelectedTask(task);
        setViewMode(isViewMode);
        setControlData({
            control_check: task.control_check !== null ? task.control_check : 1,
            control_tt_operacaocontrolo: task.control_tt_operacaocontrolo || null,
            control_memo: task.control_memo || '',
            control_foto: task.control_foto || ''
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
        const formData = new FormData();
        formData.append('pk', selectedTask.pk);
        formData.append('control_check', controlData.control_check);
        formData.append('control_tt_operacaocontrolo', controlData.control_tt_operacaocontrolo || '');
        formData.append('control_memo', controlData.control_memo || '');
        
        controlFiles.forEach((fileItem) => {
            formData.append('files', fileItem.file);
        });

        updateControlMutation.mutate(formData);
    };

    // Render Helpers
    const formatValueByType = (task) => {
        const type = task.tt_operacaoaccao_type;
        const value = task.valuetext;

        if (!value) return '-';

        switch (type) {
            case OPERATION_TYPES.NUMBER:
                return <Typography fontWeight={600} color="primary.main">{value}</Typography>;
            case OPERATION_TYPES.BOOLEAN:
                const isChecked = value === '1';
                return (
                    <Chip 
                        label={formatBooleanValue(value)} 
                        color={isChecked ? 'success' : 'default'} 
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

    // Glass styles
    const glassCard = {
        background: alpha(theme.palette.background.paper, 0.7),
        backdropFilter: 'blur(10px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: theme.shadows[2],
        borderRadius: 3
    };

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
                                    onChange={(e) => {
                                        setSelectedEntity(e.target.value);
                                        setSelectedInstalacao('');
                                    }}
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
                                    onChange={(e) => {
                                        setSelectedTipo(e.target.value);
                                        setSelectedInstalacao('');
                                    }}
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

            {/* Conteúdo */}
            {loadingTasks && (
                <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
            )}

            {!loadingTasks && tasksData?.data?.length > 0 && (
                <Paper sx={{ ...glassCard, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Ação</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Executado Por</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Valor</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 600 }}>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tasksData.data.map((task) => (
                                    <TableRow key={task.pk} hover>
                                        <TableCell>{new Date(task.data).toLocaleDateString('pt-PT')}</TableCell>
                                        <TableCell>{task.tt_operacaoaccao}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{task.updt_client || '-'}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {task.updt_time && new Date(task.updt_time).toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'})}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{formatValueByType(task)}</TableCell>
                                        <TableCell>
                                            {task.control_check === 1 ? (
                                                <Chip icon={<CheckCircle />} label="Verificado" color="success" size="small" variant="outlined" />
                                            ) : task.control_check === 0 ? (
                                                <Chip icon={<Cancel />} label="Não conforme" color="error" size="small" variant="outlined" />
                                            ) : (
                                                <Chip label="Pendente" size="small" variant="outlined" />
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button
                                                size="small"
                                                variant={task.control_check !== null ? "outlined" : "contained"}
                                                color={task.control_check !== null ? "inherit" : "primary"}
                                                startIcon={task.control_check !== null ? <VisibilityIcon /> : <Edit />}
                                                onClick={() => handleOpenControlDialog(task, task.control_check !== null)}
                                            >
                                                {task.control_check !== null ? "Ver" : "Controlar"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {!loadingTasks && tasksData?.data?.length === 0 && (
                <Box textAlign="center" py={8} sx={{ opacity: 0.6 }}>
                    <SearchIcon sx={{ fontSize: 64, mb: 2, color: 'text.disabled' }} />
                    <Typography>Nenhum registo encontrado para os filtros selecionados.</Typography>
                </Box>
            )}

            {/* Dialog de Controlo */}
            <Dialog 
                open={controlDialog} 
                onClose={handleCloseControlDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{viewMode ? 'Detalhes do Controlo' : 'Validar Tarefa'}</DialogTitle>
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
                            </Grid>
                        </Box>

                        <FormControl fullWidth disabled={viewMode}>
                            <InputLabel>Estado da Validação</InputLabel>
                            <Select
                                value={controlData.control_check}
                                onChange={(e) => setControlData({ ...controlData, control_check: e.target.value })}
                                label="Estado da Validação"
                            >
                                <MenuItem value={1}>Conforme / Verificado</MenuItem>
                                <MenuItem value={0}>Não Conforme</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label="Observações"
                            multiline
                            rows={3}
                            value={controlData.control_memo}
                            onChange={(e) => setControlData({ ...controlData, control_memo: e.target.value })}
                            disabled={viewMode}
                            fullWidth
                        />

                        {!viewMode && (
                            <FileUploadControl 
                                files={controlFiles}
                                setFiles={setControlFiles}
                            />
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseControlDialog}>Cancelar</Button>
                    {!viewMode && (
                        <Button 
                            onClick={handleSaveControl} 
                            variant="contained"
                            disabled={updateControlMutation.isPending}
                        >
                            {updateControlMutation.isPending ? 'Guardando...' : 'Guardar Validação'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default OperationControlPage;
