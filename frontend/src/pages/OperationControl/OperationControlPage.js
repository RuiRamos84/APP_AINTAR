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
    IconButton,
    Divider
} from '@mui/material';
import {
    Search as SearchIcon,
    CheckCircle,
    Cancel,
    Edit,
    Download as DownloadIcon,
    Visibility as VisibilityIcon,
    Close as CloseIcon,
    NavigateBefore as NavigateBeforeIcon,
    NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import apiClient from '../../services/api';
import { useMetaData } from '../../contexts/MetaDataContext';
import {
    OPERATION_TYPES,
    getOperationTypeConfig,
    formatBooleanValue
} from '../Operation/constants/operationTypes';
import FileUploadControl from './components/FileUploadControl';

const OperationControlPage = () => {
    const { metaData, loading: metaDataLoading } = useMetaData();

    // Seleções dos filtros
    const [selectedEntity, setSelectedEntity] = useState('');
    const [selectedTipo, setSelectedTipo] = useState('');
    const [selectedInstalacao, setSelectedInstalacao] = useState('');
    const [lastDays, setLastDays] = useState('');

    // Dados das tarefas
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Modal de controlo
    const [controlDialog, setControlDialog] = useState(false);
    const [viewMode, setViewMode] = useState(false); // true = visualização, false = edição
    const [selectedTask, setSelectedTask] = useState(null);
    const [controlData, setControlData] = useState({
        control_check: 0,
        control_tt_operacaocontrolo: null,
        control_memo: '',
        control_foto: ''
    });
    const [controlFiles, setControlFiles] = useState([]);

    // Modal de pré-visualização
    const [previewDialog, setPreviewDialog] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [allFiles, setAllFiles] = useState([]);

    // Extrair lista única de entidades (municípios/associados) de ETAR e EE
    const entities = useMemo(() => {
        if (!metaData?.etar || !metaData?.ee) return [];

        const allEntities = new Set();
        metaData.etar.forEach(e => e.ts_entity && allEntities.add(e.ts_entity));
        metaData.ee.forEach(e => e.ts_entity && allEntities.add(e.ts_entity));

        return Array.from(allEntities).sort();
    }, [metaData]);

    // Tipos de instalação
    const installationTypes = [
        { value: 'ETAR', label: 'ETAR' },
        { value: 'EE', label: 'Estação Elevatória' }
    ];

    // Filtrar instalações por entidade e tipo
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

    // Formatar valor baseado no tipo de operação
    const formatValueByType = (task) => {
        const type = task.tt_operacaoaccao_type;
        const value = task.valuetext;
        const config = getOperationTypeConfig(type);

        if (!value) return '-';

        switch (type) {
            case OPERATION_TYPES.NUMBER:
                // Valor numérico - destacar
                return (
                    <Typography variant="body2" fontWeight={600} color="primary.main">
                        {value}
                    </Typography>
                );

            case OPERATION_TYPES.TEXT:
                // Texto - truncar se muito longo
                return (
                    <Typography variant="body2" sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {value}
                    </Typography>
                );

            case OPERATION_TYPES.REFERENCE:
                // Referência - mostrar o refvalue se disponível, senão pk
                const displayValue = task.tt_operacaoaccao_refvalue || value;
                return (
                    <Typography variant="body2">
                        {displayValue}
                    </Typography>
                );

            case OPERATION_TYPES.BOOLEAN:
                // Boolean - chip com cor
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
                // Análise - pode ser valores ou só recolha
                if (value === '1' || value === '0') {
                    return (
                        <Chip
                            label={value === '1' ? 'Recolha realizada' : 'Não realizada'}
                            color={value === '1' ? 'success' : 'default'}
                            size="small"
                        />
                    );
                } else {
                    // Valores das análises
                    return (
                        <Typography variant="body2" fontWeight={600} color="primary.main">
                            {value}
                        </Typography>
                    );
                }

            default:
                return value;
        }
    };

    // Obter nome do tipo de operação
    const getTypeName = (typeId) => {
        const config = getOperationTypeConfig(typeId);
        return config?.name || `Tipo ${typeId}`;
    };

    const handleSearch = async () => {
        if (!selectedInstalacao) {
            setError('Por favor, selecione uma instalação');
            return;
        }

        if (!lastDays || lastDays <= 0) {
            setError('Por favor, indique o número de dias atrás');
            return;
        }

        setLoading(true);
        setError(null);

        const payload = {
            tb_instalacao: selectedInstalacao,
            last_days: parseInt(lastDays)
        };

        console.log('🔍 Pesquisando controlo com:', payload);

        try {
            const response = await apiClient.post('/operation_control/query', payload);

            console.log('📊 Resposta recebida:', {
                total: response.data?.data?.length,
                primeiraTarefa: response.data?.data?.[0]?.data,
                ultimaTarefa: response.data?.data?.[response.data?.data?.length - 1]?.data
            });

            setTasks(response.data?.data || []);
        } catch (err) {
            console.error('Erro ao pesquisar tarefas:', err);
            setError('Erro ao pesquisar tarefas de controlo');
        } finally {
            setLoading(false);
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
        setControlData({
            control_check: 0,
            control_tt_operacaocontrolo: null,
            control_memo: '',
            control_foto: ''
        });
        setControlFiles([]);
    };

    const handleSaveControl = async () => {
        try {
            const formData = new FormData();
            formData.append('pk', selectedTask.pk);
            formData.append('control_check', controlData.control_check);
            formData.append('control_tt_operacaocontrolo', controlData.control_tt_operacaocontrolo || '');
            formData.append('control_memo', controlData.control_memo || '');
            formData.append('control_foto', controlData.control_foto || '');

            // Adicionar arquivos
            controlFiles.forEach((fileItem) => {
                formData.append('files', fileItem.file);
            });

            await apiClient.post('/operation_control/update', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Atualizar a lista
            setTasks(tasks.map(t =>
                t.pk === selectedTask.pk
                    ? { ...t, ...controlData, control_time: new Date().toISOString() }
                    : t
            ));

            handleCloseControlDialog();
        } catch (err) {
            console.error('Erro ao guardar controlo:', err);
            setError('Erro ao guardar controlo');
        }
    };

    const handleDownloadAttachment = async (filename) => {
        try {
            const response = await apiClient.get(
                `/operation_control/download/${selectedTask.pk}?filename=${encodeURIComponent(filename)}`,
                { responseType: 'blob' }
            );

            // Criar URL do blob e fazer download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Erro ao baixar arquivo:', err);
            setError('Erro ao baixar arquivo');
        }
    };

    const loadFilePreview = async (filename) => {
        const ext = filename.split('.').pop().toLowerCase();

        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext)) {
            try {
                const response = await apiClient.get(
                    `/operation_control/download/${selectedTask.pk}?filename=${encodeURIComponent(filename)}`,
                    { responseType: 'blob' }
                );

                const blob = new Blob([response.data], {
                    type: response.headers['content-type'] || 'application/octet-stream'
                });
                const url = window.URL.createObjectURL(blob);

                return { url, filename, type: ext };
            } catch (err) {
                console.error('Erro ao carregar arquivo:', err);
                setError('Erro ao carregar arquivo para visualização');
                return null;
            }
        }
        return null;
    };

    const handleViewAttachment = async (filename) => {
        const ext = filename.split('.').pop().toLowerCase();

        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext)) {
            // Preparar lista de todos os arquivos
            const files = selectedTask.control_foto.split(',');
            const index = files.indexOf(filename);

            setAllFiles(files);
            setCurrentFileIndex(index);

            const preview = await loadFilePreview(filename);
            if (preview) {
                setPreviewFile(preview);
                setPreviewDialog(true);
            }
        } else {
            // Outros arquivos fazer download direto
            handleDownloadAttachment(filename);
        }
    };

    const navigatePreview = useCallback(async (direction) => {
        if (allFiles.length === 0) return;

        const newIndex = direction === 'next'
            ? (currentFileIndex + 1) % allFiles.length
            : (currentFileIndex - 1 + allFiles.length) % allFiles.length;

        // Limpar URL do arquivo anterior
        if (previewFile?.url) {
            window.URL.revokeObjectURL(previewFile.url);
        }

        setCurrentFileIndex(newIndex);
        const preview = await loadFilePreview(allFiles[newIndex]);
        if (preview) {
            setPreviewFile(preview);
        }
    }, [allFiles, currentFileIndex, previewFile, selectedTask]);

    const handleClosePreview = () => {
        if (previewFile?.url) {
            window.URL.revokeObjectURL(previewFile.url);
        }
        setPreviewDialog(false);
        setPreviewFile(null);
        setAllFiles([]);
        setCurrentFileIndex(0);
    };

    // Detectar teclas de navegação
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (!previewDialog) return;

            if (e.key === 'ArrowRight') {
                navigatePreview('next');
            } else if (e.key === 'ArrowLeft') {
                navigatePreview('prev');
            } else if (e.key === 'Escape') {
                handleClosePreview();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [previewDialog, navigatePreview]);

    if (metaDataLoading) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                Controlo de Tarefas de Operação
            </Typography>

            {/* Filtros */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Stack spacing={2}>
                    <Stack direction="row" spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel>Município/Associado</InputLabel>
                            <Select
                                value={selectedEntity}
                                onChange={(e) => {
                                    setSelectedEntity(e.target.value);
                                    setSelectedInstalacao('');
                                }}
                                label="Município/Associado"
                            >
                                {entities.map((entity) => (
                                    <MenuItem key={entity} value={entity}>
                                        {entity}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Tipo de Instalação</InputLabel>
                            <Select
                                value={selectedTipo}
                                onChange={(e) => {
                                    setSelectedTipo(e.target.value);
                                    setSelectedInstalacao('');
                                }}
                                label="Tipo de Instalação"
                            >
                                {installationTypes.map((t) => (
                                    <MenuItem key={t.value} value={t.value}>
                                        {t.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Instalação</InputLabel>
                            <Select
                                value={selectedInstalacao}
                                onChange={(e) => setSelectedInstalacao(e.target.value)}
                                label="Instalação"
                                disabled={!selectedEntity || !selectedTipo}
                            >
                                {installations.map((inst) => (
                                    <MenuItem key={inst.pk} value={inst.pk}>
                                        {inst.nome} {inst.subsistema && `(${inst.subsistema})`}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Dias atrás"
                            type="number"
                            value={lastDays}
                            onChange={(e) => setLastDays(e.target.value)}
                            sx={{ minWidth: 200 }}
                            inputProps={{ min: 1, max: 365 }}
                            placeholder="Ex: 7, 30, 90..."
                            required
                        />
                    </Stack>

                    <Button
                        variant="contained"
                        startIcon={<SearchIcon />}
                        onClick={handleSearch}
                        disabled={!selectedInstalacao || loading}
                    >
                        Pesquisar
                    </Button>
                </Stack>
            </Paper>

            {/* Mensagens de erro */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Loading */}
            {loading && (
                <Box display="flex" justifyContent="center" my={4}>
                    <CircularProgress />
                </Box>
            )}

            {/* Tabela de tarefas */}
            {!loading && tasks.length > 0 && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Data</TableCell>
                                <TableCell>Ação</TableCell>
                                <TableCell>Atualizado Por</TableCell>
                                <TableCell>Atualizado Em</TableCell>
                                <TableCell>Valor</TableCell>
                                <TableCell>Estado</TableCell>
                                <TableCell align="center">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tasks.map((task) => (
                                <TableRow key={task.pk}>
                                    <TableCell>{new Date(task.data).toLocaleDateString('pt-PT')}</TableCell>
                                    <TableCell>{task.tt_operacaoaccao}</TableCell>
                                    <TableCell>{task.updt_client || '-'}</TableCell>
                                    <TableCell>
                                        {task.updt_time
                                            ? new Date(task.updt_time).toLocaleString('pt-PT', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                            : '-'
                                        }
                                    </TableCell>
                                    <TableCell>{formatValueByType(task)}</TableCell>
                                    <TableCell>
                                        {task.control_check === 1 ? (
                                            <Chip icon={<CheckCircle />} label="Verificado" color="success" size="small" />
                                        ) : task.control_check === 0 ? (
                                            <Chip icon={<Cancel />} label="Não conforme" color="error" size="small" />
                                        ) : (
                                            <Chip label="Sem controlo" variant="outlined" size="small" />
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        {task.control_check !== null ? (
                                            // Já foi controlado - botão de visualização
                                            <Button
                                                size="small"
                                                startIcon={<SearchIcon />}
                                                onClick={() => handleOpenControlDialog(task, true)}
                                                variant="outlined"
                                            >
                                                Ver Controlo
                                            </Button>
                                        ) : (
                                            // Ainda não foi controlado - botão de edição
                                            <Button
                                                size="small"
                                                startIcon={<Edit />}
                                                onClick={() => handleOpenControlDialog(task, false)}
                                            >
                                                Controlar
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Dialog de controlo */}
            <Dialog
                open={controlDialog}
                onClose={handleCloseControlDialog}
                maxWidth="sm"
                fullWidth={!viewMode}
            >
                <DialogTitle>{viewMode ? 'Detalhes do Controlo' : 'Controlo de Tarefa'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        {/* Informações da tarefa em 2 colunas */}
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Ação:</strong> {selectedTask?.tt_operacaoaccao}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Data:</strong> {selectedTask?.data && new Date(selectedTask.data).toLocaleDateString('pt-PT')}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Executado por:</strong> {selectedTask?.updt_client || '-'}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Executado em:</strong> {selectedTask?.updt_time
                                        ? new Date(selectedTask.updt_time).toLocaleString('pt-PT', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                        : '-'
                                    }
                                </Typography>
                            </Grid>
                            <Grid size={12}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        <strong>Valor registado:</strong>
                                    </Typography>
                                    {selectedTask && formatValueByType(selectedTask)}
                                </Box>
                            </Grid>
                        </Grid>

                        {/* Informações de controlo (apenas em modo visualização) */}
                        {viewMode && (
                            <>
                                <Divider />
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Controlado por:</strong> {selectedTask?.control_client || '-'}
                                        </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Controlado em:</strong> {selectedTask?.control_time
                                                ? new Date(selectedTask.control_time).toLocaleString('pt-PT', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                                : '-'
                                            }
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </>
                        )}

                        {/* Controlo */}
                        <FormControl fullWidth disabled={viewMode}>
                            <InputLabel>Estado</InputLabel>
                            <Select
                                value={controlData.control_check}
                                onChange={(e) => setControlData({ ...controlData, control_check: e.target.value })}
                                label="Estado"
                            >
                                <MenuItem value={1}>✓ Verificado / Conforme</MenuItem>
                                <MenuItem value={0}>✗ Não Conforme</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label="Observações"
                            multiline
                            rows={4}
                            value={controlData.control_memo}
                            onChange={(e) => setControlData({ ...controlData, control_memo: e.target.value })}
                            fullWidth
                            disabled={viewMode}
                            InputProps={{ readOnly: viewMode }}
                        />

                        {/* Upload de arquivos ou visualização */}
                        {!viewMode ? (
                            <FileUploadControl
                                files={controlFiles}
                                setFiles={setControlFiles}
                                maxFiles={5}
                            />
                        ) : (
                            selectedTask?.control_foto && selectedTask.control_foto.trim() !== '' && (
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        <strong>Anexos:</strong>
                                    </Typography>
                                    <List dense>
                                        {selectedTask.control_foto.split(',').map((filename, index) => {
                                            const trimmedFilename = filename.trim();
                                            if (!trimmedFilename) return null;

                                            const ext = trimmedFilename.split('.').pop().toLowerCase();
                                            const isViewable = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext);

                                            console.log('Anexo:', trimmedFilename, 'Extensão:', ext, 'Visualizável:', isViewable);

                                            return (
                                                <ListItem
                                                    key={index}
                                                    sx={{
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        borderRadius: 1,
                                                        mb: 1
                                                    }}
                                                    secondaryAction={
                                                        <Stack direction="row" spacing={1}>
                                                            {isViewable && (
                                                                <IconButton
                                                                    edge="end"
                                                                    size="small"
                                                                    onClick={() => handleViewAttachment(trimmedFilename)}
                                                                    title="Visualizar"
                                                                >
                                                                    <VisibilityIcon fontSize="small" />
                                                                </IconButton>
                                                            )}
                                                            <IconButton
                                                                edge="end"
                                                                size="small"
                                                                onClick={() => handleDownloadAttachment(trimmedFilename)}
                                                                title="Download"
                                                            >
                                                                <DownloadIcon fontSize="small" />
                                                            </IconButton>
                                                        </Stack>
                                                    }
                                                >
                                                    <ListItemText
                                                        primary={trimmedFilename}
                                                        primaryTypographyProps={{ variant: 'body2' }}
                                                    />
                                                </ListItem>
                                            );
                                        })}
                                    </List>
                                </Box>
                            )
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseControlDialog}>
                        {viewMode ? 'Fechar' : 'Cancelar'}
                    </Button>
                    {!viewMode && (
                        <Button onClick={handleSaveControl} variant="contained">
                            Guardar
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Modal de Pré-visualização */}
            <Dialog
                open={previewDialog}
                onClose={handleClosePreview}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="h6">{previewFile?.filename}</Typography>
                            {allFiles.length > 1 && (
                                <Chip
                                    label={`${currentFileIndex + 1} / ${allFiles.length}`}
                                    size="small"
                                    variant="outlined"
                                />
                            )}
                        </Stack>
                        <IconButton onClick={handleClosePreview} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, position: 'relative' }}>
                    {/* Botão Anterior */}
                    {allFiles.length > 1 && (
                        <IconButton
                            onClick={() => navigatePreview('prev')}
                            sx={{
                                position: 'absolute',
                                left: 16,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                bgcolor: 'background.paper',
                                '&:hover': { bgcolor: 'action.hover' },
                                zIndex: 1
                            }}
                        >
                            <NavigateBeforeIcon />
                        </IconButton>
                    )}

                    {/* Conteúdo */}
                    {previewFile?.type === 'pdf' ? (
                        <iframe
                            src={previewFile.url}
                            style={{ width: '100%', height: '80vh', border: 'none' }}
                            title={previewFile.filename}
                        />
                    ) : (
                        <Box
                            component="img"
                            src={previewFile?.url}
                            alt={previewFile?.filename}
                            sx={{
                                maxWidth: '100%',
                                maxHeight: '80vh',
                                objectFit: 'contain'
                            }}
                        />
                    )}

                    {/* Botão Próximo */}
                    {allFiles.length > 1 && (
                        <IconButton
                            onClick={() => navigatePreview('next')}
                            sx={{
                                position: 'absolute',
                                right: 16,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                bgcolor: 'background.paper',
                                '&:hover': { bgcolor: 'action.hover' },
                                zIndex: 1
                            }}
                        >
                            <NavigateNextIcon />
                        </IconButton>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownloadAttachment(previewFile?.filename)}
                    >
                        Download
                    </Button>
                    <Button onClick={handleClosePreview}>Fechar</Button>
                </DialogActions>
            </Dialog>

            {/* Mensagem quando não há dados */}
            {!loading && tasks.length === 0 && selectedInstalacao && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        Nenhuma tarefa encontrada para os filtros selecionados
                    </Typography>
                </Paper>
            )}
        </Container>
    );
};

export default OperationControlPage;
