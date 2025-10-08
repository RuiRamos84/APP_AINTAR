import React, { useState, useMemo, useEffect } from 'react';
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Alert,
    CircularProgress,
    IconButton
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import apiClient from '../../services/api';
import { useMetaData } from '../../contexts/MetaDataContext';

const OperationMetadataPage = () => {
    const { metaData, loading: metaDataLoading } = useMetaData();

    // Filtros
    const [selectedEntity, setSelectedEntity] = useState('');
    const [selectedTipo, setSelectedTipo] = useState('');
    const [selectedInstalacao, setSelectedInstalacao] = useState('');

    // Dados
    const [metadataList, setMetadataList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Modal
    const [editDialog, setEditDialog] = useState(false);
    const [isCreate, setIsCreate] = useState(false);
    const [selectedMetadata, setSelectedMetadata] = useState(null);
    const [formData, setFormData] = useState({
        tt_operacaomodo: '',
        tb_instalacao: '',
        tt_operacaodia: '',
        tt_operacaoaccao: '',
        ts_operador1: '',
        ts_operador2: ''
    });

    // Extrair entidades de ETAR e EE
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

    // Instalações filtradas
    const instalacoes = useMemo(() => {
        if (!selectedEntity || !selectedTipo || !metaData) return [];

        const sourceData = selectedTipo === 'ETAR' ? metaData.etar : metaData.ee;

        return sourceData
            .filter(inst => inst.ts_entity === selectedEntity)
            .map(inst => ({
                pk: inst.pk,
                nome: inst.nome
            }))
            .sort((a, b) => a.nome.localeCompare(b.nome));
    }, [selectedEntity, selectedTipo, metaData]);

    // Reset de instalações quando entidade ou tipo muda
    useEffect(() => {
        setSelectedInstalacao('');
    }, [selectedEntity, selectedTipo]);

    // Buscar metadata
    const handleSearch = async () => {
        if (!selectedInstalacao) {
            setError('Selecione uma instalação');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const filters = {
                tb_instalacao: selectedInstalacao
            };

            const response = await apiClient.post('/operation_metadata/query', filters);

            if (response.data.success) {
                setMetadataList(response.data.data);
            } else {
                setError('Erro ao buscar metadata');
            }
        } catch (err) {
            console.error('Erro ao buscar metadata:', err);
            setError(err.response?.data?.message || 'Erro ao buscar metadata');
        } finally {
            setLoading(false);
        }
    };

    // Abrir modal para criar
    const handleCreate = () => {
        setIsCreate(true);
        setSelectedMetadata(null);
        setFormData({
            tt_operacaomodo: '',
            tb_instalacao: selectedInstalacao || '',
            tt_operacaodia: '',
            tt_operacaoaccao: '',
            ts_operador1: '',
            ts_operador2: ''
        });
        setEditDialog(true);
    };

    // Abrir modal para editar
    const handleEdit = (metadata) => {
        setIsCreate(false);
        setSelectedMetadata(metadata);
        setFormData({
            pk: metadata.pk,
            tt_operacaomodo: metadata.tt_operacaomodo || '',
            tb_instalacao: metadata.tb_instalacao || '',
            tt_operacaodia: metadata.tt_operacaodia || '',
            tt_operacaoaccao: metadata.tt_operacaoaccao || '',
            ts_operador1: metadata.ts_operador1 || '',
            ts_operador2: metadata.ts_operador2 || ''
        });
        setEditDialog(true);
    };

    // Guardar (criar ou atualizar)
    const handleSave = async () => {
        try {
            const endpoint = isCreate ? '/operation_metadata/create' : '/operation_metadata/update';
            const response = await apiClient.post(endpoint, formData);

            if (response.data.success) {
                setEditDialog(false);
                setSelectedMetadata(null);
                setFormData({});
                handleSearch(); // Recarregar lista
            }
        } catch (err) {
            console.error('Erro ao guardar metadata:', err);
            setError(err.response?.data?.message || 'Erro ao guardar metadata');
        }
    };

    // Eliminar
    const handleDelete = async (pk) => {
        if (!window.confirm('Tem a certeza que deseja eliminar esta metadata?')) {
            return;
        }

        try {
            const response = await apiClient.delete(`/operation_metadata/delete/${pk}`);

            if (response.data.success) {
                handleSearch(); // Recarregar lista
            }
        } catch (err) {
            console.error('Erro ao eliminar metadata:', err);
            setError(err.response?.data?.message || 'Erro ao eliminar metadata');
        }
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Gestão de Voltas/Tarefas Template
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Configure as tarefas que serão geradas automaticamente para cada instalação
                </Typography>

                {/* Filtros */}
                <Stack spacing={2} sx={{ mb: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        {/* Entidade */}
                        <FormControl sx={{ minWidth: 200 }}>
                            <InputLabel>Entidade/Município</InputLabel>
                            <Select
                                value={selectedEntity}
                                onChange={(e) => setSelectedEntity(e.target.value)}
                                label="Entidade/Município"
                            >
                                <MenuItem value="">
                                    <em>Selecione...</em>
                                </MenuItem>
                                {entities.map(entity => (
                                    <MenuItem key={entity} value={entity}>
                                        {entity}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Tipo */}
                        <FormControl sx={{ minWidth: 200 }}>
                            <InputLabel>Tipo Instalação</InputLabel>
                            <Select
                                value={selectedTipo}
                                onChange={(e) => setSelectedTipo(e.target.value)}
                                label="Tipo Instalação"
                                disabled={!selectedEntity}
                            >
                                <MenuItem value="">
                                    <em>Selecione...</em>
                                </MenuItem>
                                {installationTypes.map(type => (
                                    <MenuItem key={type.value} value={type.value}>
                                        {type.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Instalação */}
                        <FormControl sx={{ minWidth: 250 }}>
                            <InputLabel>Instalação</InputLabel>
                            <Select
                                value={selectedInstalacao}
                                onChange={(e) => setSelectedInstalacao(e.target.value)}
                                label="Instalação"
                                disabled={!selectedTipo || instalacoes.length === 0}
                            >
                                <MenuItem value="">
                                    <em>Selecione...</em>
                                </MenuItem>
                                {instalacoes.map(inst => (
                                    <MenuItem key={inst.pk} value={inst.pk}>
                                        {inst.nome}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Botão Buscar */}
                        <Button
                            variant="contained"
                            startIcon={<SearchIcon />}
                            onClick={handleSearch}
                            disabled={!selectedInstalacao || loading}
                        >
                            Buscar
                        </Button>

                        {/* Botão Adicionar */}
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<AddIcon />}
                            onClick={handleCreate}
                            disabled={!selectedInstalacao}
                        >
                            Adicionar
                        </Button>
                    </Stack>
                </Stack>

                {/* Mensagem de erro */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Loading */}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {/* Tabela de metadata */}
                {!loading && metadataList.length > 0 && (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Modo</TableCell>
                                    <TableCell>Dia</TableCell>
                                    <TableCell>Ação</TableCell>
                                    <TableCell>Operador 1</TableCell>
                                    <TableCell>Operador 2</TableCell>
                                    <TableCell align="center">Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {metadataList.map((metadata) => (
                                    <TableRow key={metadata.pk}>
                                        <TableCell>{metadata.tt_operacaomodo_nome}</TableCell>
                                        <TableCell>{metadata.tt_operacaodia_nome}</TableCell>
                                        <TableCell>{metadata.tt_operacaoaccao_nome}</TableCell>
                                        <TableCell>{metadata.ts_operador1_nome}</TableCell>
                                        <TableCell>{metadata.ts_operador2_nome || '-'}</TableCell>
                                        <TableCell align="center">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEdit(metadata)}
                                                title="Editar"
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(metadata.pk)}
                                                title="Eliminar"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Sem resultados */}
                {!loading && metadataList.length === 0 && selectedInstalacao && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                            Nenhuma metadata encontrada para esta instalação
                        </Typography>
                    </Box>
                )}
            </Paper>

            {/* Modal de edição/criação */}
            <Dialog
                open={editDialog}
                onClose={() => setEditDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {isCreate ? 'Adicionar Nova Tarefa Template' : 'Editar Tarefa Template'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        {/* Modo de Operação */}
                        <FormControl fullWidth>
                            <InputLabel>Modo de Operação</InputLabel>
                            <Select
                                value={formData.tt_operacaomodo}
                                onChange={(e) => setFormData({...formData, tt_operacaomodo: e.target.value})}
                                label="Modo de Operação"
                            >
                                <MenuItem value="">
                                    <em>Selecione...</em>
                                </MenuItem>
                                {metaData?.operacamodo?.map(modo => (
                                    <MenuItem key={modo.pk} value={modo.pk}>
                                        {modo.value}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Dia */}
                        <FormControl fullWidth>
                            <InputLabel>Dia</InputLabel>
                            <Select
                                value={formData.tt_operacaodia}
                                onChange={(e) => setFormData({...formData, tt_operacaodia: e.target.value})}
                                label="Dia"
                            >
                                <MenuItem value="">
                                    <em>Selecione...</em>
                                </MenuItem>
                                {metaData?.operacaodia?.map(dia => (
                                    <MenuItem key={dia.pk} value={dia.pk}>
                                        {dia.value}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Ação */}
                        <FormControl fullWidth>
                            <InputLabel>Ação</InputLabel>
                            <Select
                                value={formData.tt_operacaoaccao}
                                onChange={(e) => setFormData({...formData, tt_operacaoaccao: e.target.value})}
                                label="Ação"
                            >
                                <MenuItem value="">
                                    <em>Selecione...</em>
                                </MenuItem>
                                {metaData?.operacaoaccao?.map(acao => (
                                    <MenuItem key={acao.pk} value={acao.pk}>
                                        {acao.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Operador 1 */}
                        <FormControl fullWidth>
                            <InputLabel>Operador 1</InputLabel>
                            <Select
                                value={formData.ts_operador1}
                                onChange={(e) => setFormData({...formData, ts_operador1: e.target.value})}
                                label="Operador 1"
                            >
                                <MenuItem value="">
                                    <em>Selecione...</em>
                                </MenuItem>
                                {metaData?.who?.map(user => (
                                    <MenuItem key={user.pk} value={user.pk}>
                                        {user.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Operador 2 */}
                        <FormControl fullWidth>
                            <InputLabel>Operador 2 (opcional)</InputLabel>
                            <Select
                                value={formData.ts_operador2 || ''}
                                onChange={(e) => setFormData({...formData, ts_operador2: e.target.value})}
                                label="Operador 2 (opcional)"
                            >
                                <MenuItem value="">
                                    <em>Nenhum</em>
                                </MenuItem>
                                {metaData?.who?.map(user => (
                                    <MenuItem key={user.pk} value={user.pk}>
                                        {user.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialog(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                    >
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default OperationMetadataPage;
