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
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Alert,
    CircularProgress,
    IconButton,
    Chip,
    Divider,
    Collapse,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    Grid as Grid
} from '@mui/material';
import {
    Search as SearchIcon,
    Edit as EditIcon,
    Visibility as VisibilityIcon,
    FilterList as FilterListIcon,
    Science as ScienceIcon,
    CalendarToday as CalendarIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import apiClient from '../../services/api';
import { useMetaData } from '../../contexts/MetaDataContext';

const AnalysisPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
    const { metaData, loading: metaDataLoading } = useMetaData();

    // Filtros
    const [selectedEntity, setSelectedEntity] = useState('');
    const [selectedTipo, setSelectedTipo] = useState('');
    const [selectedInstalacao, setSelectedInstalacao] = useState('');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Pesquisa rápida por PK
    const [searchPK, setSearchPK] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    // Dados
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Modal
    const [editDialog, setEditDialog] = useState(false);
    const [selectedAnalysis, setSelectedAnalysis] = useState(null);
    const [resultado, setResultado] = useState('');

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

    // Pesquisa rápida por PK
    const handleQuickSearch = async () => {
        if (!searchPK || searchPK.trim() === '') {
            setError('Digite o número da amostra (PK)');
            return;
        }

        setSearchLoading(true);
        setError(null);

        try {
            const response = await apiClient.get(`/analysis/search/${searchPK.trim()}`);

            if (response.data.success && response.data.data) {
                const analysis = response.data.data;
                setAnalyses([analysis]);
                handleEdit(analysis);
            } else {
                setError(`Nenhuma análise encontrada com PK: ${searchPK}`);
                setAnalyses([]);
            }
        } catch (err) {
            console.error('Erro na pesquisa rápida:', err);
            setError(err.response?.data?.message || 'Erro ao pesquisar análise');
            setAnalyses([]);
        } finally {
            setSearchLoading(false);
        }
    };

    // Buscar análises
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

            if (dataInicio) filters.data_inicio = dataInicio;
            if (dataFim) filters.data_fim = dataFim;

            const response = await apiClient.post('/analysis/query', filters);

            if (response.data.success) {
                setAnalyses(response.data.data);
            } else {
                setError('Erro ao buscar análises');
            }
        } catch (err) {
            console.error('Erro ao buscar análises:', err);
            setError(err.response?.data?.message || 'Erro ao buscar análises');
        } finally {
            setLoading(false);
        }
    };

    // Limpar pesquisa rápida
    const handleClearQuickSearch = () => {
        setSearchPK('');
        setAnalyses([]);
        setError(null);
    };

    // Abrir modal para editar resultado
    const handleEdit = (analysis) => {
        setSelectedAnalysis(analysis);
        setResultado(analysis.resultado || '');
        setEditDialog(true);
    };

    // Salvar resultado
    const handleSave = async () => {
        if (!selectedAnalysis) return;

        try {
            const response = await apiClient.post('/analysis/update', {
                pk: selectedAnalysis.pk,
                resultado: resultado
            });

            if (response.data.success) {
                setEditDialog(false);
                setSelectedAnalysis(null);
                setResultado('');

                // Atualizar lista local
                setAnalyses(prev => prev.map(a =>
                    a.pk === selectedAnalysis.pk
                        ? { ...a, resultado: resultado }
                        : a
                ));

                // Se foi pesquisa por instalação, recarregar
                if (selectedInstalacao && !searchPK) {
                    handleSearch();
                }
            }
        } catch (err) {
            console.error('Erro ao atualizar análise:', err);
            setError(err.response?.data?.message || 'Erro ao atualizar análise');
        }
    };

    // Formatar data
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-PT');
    };

    // Formatar data e hora
    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('pt-PT');
    };

    // Renderizar card mobile
    const renderMobileCard = (analysis) => (
        <Card key={analysis.pk} sx={{ mb: 2 }}>
            <CardContent>
                <Stack spacing={2}>
                    {/* Cabeçalho */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Amostra #{analysis.pk}
                            </Typography>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <CalendarIcon fontSize="small" />
                                {formatDate(analysis.data)}
                            </Typography>
                        </Box>
                        {analysis.resultado && (
                            <Chip
                                icon={<CheckCircleIcon />}
                                label="Concluída"
                                color="success"
                                size="small"
                            />
                        )}
                    </Box>

                    <Divider />

                    {/* Detalhes */}
                    <Stack spacing={1}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Ponto de Análise
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                                {analysis.tt_analiseponto}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Parâmetro
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                                {analysis.tt_analiseparam}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Resultado
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: analysis.resultado ? 'text.primary' : 'text.disabled',
                                    fontStyle: analysis.resultado ? 'normal' : 'italic'
                                }}
                            >
                                {analysis.resultado || 'Aguarda resultado'}
                            </Typography>
                        </Box>

                        {analysis.updt_client && (
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Registado por
                                </Typography>
                                <Typography variant="body2">
                                    {analysis.updt_client} • {formatDateTime(analysis.updt_time)}
                                </Typography>
                            </Box>
                        )}
                    </Stack>

                    {/* Ação */}
                    <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => handleEdit(analysis)}
                        fullWidth
                    >
                        Registar Resultado
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );

    return (
        <Container maxWidth="xl" sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 2, md: 3 } }}>
            {/* Header */}
            <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <ScienceIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                    <Box>
                        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={600}>
                            Análises de Laboratório
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Registo rápido de resultados de análises
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Pesquisa Rápida por PK */}
            <Paper
                elevation={3}
                sx={{
                    p: { xs: 2, md: 3 },
                    mb: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.main}05 100%)`,
                    border: `2px solid ${theme.palette.primary.main}30`
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <SearchIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                        Pesquisa Rápida
                    </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Digite o número (PK) escrito no recipiente da amostra para acesso rápido
                </Typography>

                <Stack
                    direction={isMobile ? 'column' : 'row'}
                    spacing={2}
                    alignItems={isMobile ? 'stretch' : 'center'}
                >
                    <TextField
                        label="Número da Amostra (PK)"
                        value={searchPK}
                        onChange={(e) => setSearchPK(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleQuickSearch();
                            }
                        }}
                        placeholder="Ex: 12345"
                        type="number"
                        sx={{ flex: 1, maxWidth: { xs: '100%', md: 350 } }}
                        autoFocus
                        size={isMobile ? 'medium' : 'medium'}
                    />
                    <Button
                        variant="contained"
                        startIcon={searchLoading ? <CircularProgress size={20} /> : <SearchIcon />}
                        onClick={handleQuickSearch}
                        disabled={searchLoading}
                        size="large"
                        fullWidth={isMobile}
                    >
                        Pesquisar
                    </Button>
                    {analyses.length > 0 && (
                        <Button
                            variant="outlined"
                            onClick={handleClearQuickSearch}
                            fullWidth={isMobile}
                        >
                            Limpar
                        </Button>
                    )}
                </Stack>
            </Paper>

            {/* Filtros Avançados */}
            <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
                <Button
                    startIcon={<FilterListIcon />}
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    sx={{ mb: showAdvancedFilters ? 2 : 0 }}
                >
                    {showAdvancedFilters ? 'Ocultar' : 'Mostrar'} Filtros Avançados
                </Button>

                <Collapse in={showAdvancedFilters}>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                        {/* Entidade */}
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <FormControl fullWidth size={isMobile ? 'medium' : 'medium'}>
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
                        </Grid>

                        {/* Tipo */}
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <FormControl fullWidth size={isMobile ? 'medium' : 'medium'}>
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
                        </Grid>

                        {/* Instalação */}
                        <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                            <FormControl fullWidth size={isMobile ? 'medium' : 'medium'}>
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
                        </Grid>

                        {/* Data Início */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                label="Data Início"
                                type="date"
                                value={dataInicio}
                                onChange={(e) => setDataInicio(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                size={isMobile ? 'medium' : 'medium'}
                            />
                        </Grid>

                        {/* Data Fim */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                label="Data Fim"
                                type="date"
                                value={dataFim}
                                onChange={(e) => setDataFim(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                size={isMobile ? 'medium' : 'medium'}
                            />
                        </Grid>

                        {/* Botão Buscar */}
                        <Grid size={{ xs: 12, sm: 12, md: 4 }}>
                            <Button
                                variant="contained"
                                startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                                onClick={handleSearch}
                                disabled={!selectedInstalacao || loading}
                                fullWidth
                                size="large"
                            >
                                Buscar Análises
                            </Button>
                        </Grid>
                    </Grid>
                </Collapse>
            </Paper>

            {/* Mensagem de erro */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Loading */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Resultados */}
            {!loading && analyses.length > 0 && (
                <Paper sx={{ p: { xs: 1, md: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: { xs: 1, md: 1 } }}>
                        <Typography variant="h6" fontWeight={600}>
                            Resultados ({analyses.length})
                        </Typography>
                        {searchPK && (
                            <Chip
                                label={`Amostra #${searchPK}`}
                                color="primary"
                                size="small"
                            />
                        )}
                    </Box>

                    {isMobile ? (
                        // Vista mobile - Cards
                        <Box sx={{ px: { xs: 1, md: 0 } }}>
                            {analyses.map(renderMobileCard)}
                        </Box>
                    ) : (
                        // Vista desktop - Tabela
                        <TableContainer>
                            <Table size={isTablet ? 'small' : 'medium'}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>PK</TableCell>
                                        <TableCell>Data</TableCell>
                                        <TableCell>Ponto</TableCell>
                                        <TableCell>Parâmetro</TableCell>
                                        <TableCell>Resultado</TableCell>
                                        <TableCell>Registado por</TableCell>
                                        <TableCell>Registado em</TableCell>
                                        <TableCell align="center">Ações</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {analyses.map((analysis) => (
                                        <TableRow
                                            key={analysis.pk}
                                            sx={{
                                                '&:hover': { bgcolor: 'action.hover' },
                                                bgcolor: analysis.resultado ? 'success.lighter' : 'inherit'
                                            }}
                                        >
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>
                                                    #{analysis.pk}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{formatDate(analysis.data)}</TableCell>
                                            <TableCell>{analysis.tt_analiseponto}</TableCell>
                                            <TableCell>{analysis.tt_analiseparam}</TableCell>
                                            <TableCell>
                                                {analysis.resultado ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <CheckCircleIcon fontSize="small" color="success" />
                                                        <Typography variant="body2">{analysis.resultado}</Typography>
                                                    </Box>
                                                ) : (
                                                    <Typography variant="body2" color="text.disabled" fontStyle="italic">
                                                        Aguarda resultado
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>{analysis.updt_client || '-'}</TableCell>
                                            <TableCell>
                                                {analysis.updt_time ? formatDateTime(analysis.updt_time) : '-'}
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleEdit(analysis)}
                                                    color="primary"
                                                    title="Editar resultado"
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}

            {/* Sem resultados */}
            {!loading && analyses.length === 0 && (selectedInstalacao || searchPK) && !error && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <ScienceIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Nenhuma análise encontrada
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Tente ajustar os filtros ou pesquisar por outro número de amostra
                    </Typography>
                </Paper>
            )}

            {/* Modal de edição */}
            <Dialog
                open={editDialog}
                onClose={() => setEditDialog(false)}
                maxWidth="sm"
                fullWidth
                fullScreen={isMobile}
            >
                <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EditIcon color="primary" />
                        <Typography variant="h6">Registar Resultado</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    {selectedAnalysis && (
                        <Stack spacing={3}>
                            {/* Info da amostra */}
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                                <Stack spacing={1.5}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Número da Amostra
                                        </Typography>
                                        <Typography variant="h6" color="primary.main">
                                            #{selectedAnalysis.pk}
                                        </Typography>
                                    </Box>

                                    <Divider />

                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Data
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {formatDate(selectedAnalysis.data)}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Instalação
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {selectedAnalysis.tb_instalacao}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Ponto de Análise
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {selectedAnalysis.tt_analiseponto}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Parâmetro
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {selectedAnalysis.tt_analiseparam}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Stack>
                            </Paper>

                            {/* Campo de resultado */}
                            <TextField
                                label="Resultado da Análise"
                                multiline
                                rows={isMobile ? 6 : 4}
                                value={resultado}
                                onChange={(e) => setResultado(e.target.value)}
                                fullWidth
                                helperText="Registe aqui o resultado obtido da análise de laboratório"
                                autoFocus
                            />
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button onClick={() => setEditDialog(false)} size="large">
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        startIcon={<CheckCircleIcon />}
                        size="large"
                    >
                        Guardar Resultado
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default AnalysisPage;
