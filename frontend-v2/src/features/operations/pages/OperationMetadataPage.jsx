import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Box, Typography, Stack, Card, Chip, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    FormControl, InputLabel, Select, MenuItem, Grid, TablePagination,
    CircularProgress, Alert, Fab, alpha, useTheme
} from '@mui/material';
import {
    Settings as SettingsIcon,
    Add, Edit, Delete, Close, Refresh, Save
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { operationService } from '../services/operationService';
import { exportMetasToExcel } from '../services/exportService';
import { useMetaData } from '@/core/hooks/useMetaData';
import ExportButton from '../components/ExportButton';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const EMPTY_FORM = {
    tb_instalacao: '',
    tt_operacaoaccao: '',
    tt_operacaomodo: '',
    tt_operacaodia: '',
    who1: '',
    who2: '',
};

const OperationMetadataPage = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const { data: metaData } = useMetaData();

    // Paginação
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Form state
    const [formOpen, setFormOpen] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Debounce da pesquisa (400ms)
    const debounceRef = useRef(null);
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(0);
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchTerm]);

    // Buscar metas com paginação servidor
    const { data: response, isLoading, error, isFetching, refetch } = useQuery({
        queryKey: ['operacaoMeta', { limit: rowsPerPage, offset: page * rowsPerPage, search: debouncedSearch }],
        queryFn: async () => {
            const res = await operationService.getOperacaoMeta({
                limit: rowsPerPage,
                offset: page * rowsPerPage,
                search: debouncedSearch || undefined,
            });
            return res;
        },
        staleTime: 1000 * 60 * 2,
        placeholderData: keepPreviousData,
    });

    const metas = response?.data || [];
    const totalCount = response?.total || 0;

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data) => operationService.createOperacaoMeta(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['operacaoMeta'] });
            handleCloseForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => operationService.updateOperacaoMeta(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['operacaoMeta'] });
            handleCloseForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => operationService.deleteOperacaoMeta(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['operacaoMeta'] });
            setDeleteConfirmOpen(false);
            setDeletingId(null);
        },
    });

    // Listas para selects
    const installations = useMemo(() => {
        const etars = (metaData?.etar || []).map(e => ({ pk: e.pk, nome: e.nome, tipo: 'ETAR' }));
        const ees = (metaData?.ee || []).map(e => ({ pk: e.pk, nome: e.nome, tipo: 'EE' }));
        return [...etars, ...ees].sort((a, b) => a.nome?.localeCompare(b.nome));
    }, [metaData]);

    const actions = metaData?.operacaoaccao || [];
    const modes = metaData?.operacamodo || [];
    const days = metaData?.operacaodia || [];
    const operators = metaData?.who || [];

    const handleOpenCreate = () => {
        setFormData(EMPTY_FORM);
        setEditingId(null);
        setFormOpen(true);
    };

    const handleOpenEdit = (meta) => {
        setFormData({
            tb_instalacao: meta.pk_instalacao || '',
            tt_operacaoaccao: meta.pk_operacaoaccao || '',
            tt_operacaomodo: meta.pk_operacaomodo || '',
            tt_operacaodia: meta.pk_operacaodia || '',
            who1: meta.pk_operador1 || '',
            who2: meta.pk_operador2 || '',
        });
        setEditingId(meta.pk);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setFormData(EMPTY_FORM);
        setEditingId(null);
    };

    const handleSubmit = () => {
        const payload = { ...formData };
        Object.keys(payload).forEach(k => {
            if (payload[k] === '') delete payload[k];
        });

        if (editingId) {
            updateMutation.mutate({ id: editingId, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleField = (field) => (e) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleChangePage = (_, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };

    const handleExportExcel = () => {
        exportMetasToExcel(metas, { filename: 'Voltas_Operacao' });
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    const getInstType = (meta) => {
        const name = meta.tb_instalacao || '';
        if (name.toLowerCase().includes('etar')) return 'ETAR';
        if (name.toLowerCase().includes('ee')) return 'EE';
        return null;
    };

    return (
        <ModulePage
            title="Gestão de Voltas"
            subtitle="Programação de tarefas operacionais recorrentes"
            icon={SettingsIcon}
            color="#9c27b0"
            breadcrumbs={[
                { label: 'Operação', path: '/operation' },
                { label: 'Gestão de Voltas' },
            ]}
            actions={
                <Stack direction="row" spacing={1} alignItems="center">
                    <SearchBar searchTerm={searchTerm} onSearch={setSearchTerm} />
                    <ExportButton
                        onExportExcel={handleExportExcel}
                        count={totalCount}
                        disabled={isLoading}
                    />
                    <Chip label={`${totalCount} voltas`} size="small" variant="outlined" />
                    {isFetching && !isLoading && <CircularProgress size={18} />}
                    <Tooltip title="Atualizar">
                        <span>
                            <Fab color="primary" size="small" onClick={refetch} disabled={isLoading}>
                                <Refresh />
                            </Fab>
                        </span>
                    </Tooltip>
                    <Tooltip title="Nova volta">
                        <Fab color="success" size="small" onClick={handleOpenCreate}>
                            <Add />
                        </Fab>
                    </Tooltip>
                </Stack>
            }
        >
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>Erro ao carregar voltas: {error.message}</Alert>
            )}

            <Stack spacing={2}>
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <TableContainer sx={{ position: 'relative' }}>
                        {isLoading && (
                            <Box sx={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                bgcolor: 'rgba(255,255,255,0.7)', zIndex: 1
                            }}>
                                <CircularProgress />
                            </Box>
                        )}
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: alpha(theme.palette.primary.main, 0.04) } }}>
                                    <TableCell>Instalação</TableCell>
                                    <TableCell>Ação</TableCell>
                                    <TableCell>Modo</TableCell>
                                    <TableCell>Dia</TableCell>
                                    <TableCell>Operador 1</TableCell>
                                    <TableCell>Operador 2</TableCell>
                                    <TableCell align="center" sx={{ width: 100 }}>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {metas.length === 0 && !isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                {debouncedSearch ? 'Nenhuma volta encontrada para a pesquisa' : 'Nenhuma volta disponível'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : metas.map(meta => {
                                    const instType = getInstType(meta);
                                    return (
                                        <TableRow
                                            key={meta.pk}
                                            hover
                                            sx={{
                                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => handleOpenEdit(meta)}
                                        >
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                                    {instType && (
                                                        <Chip label={instType} size="small"
                                                            sx={{
                                                                fontSize: 10, height: 20,
                                                                bgcolor: instType === 'ETAR' ? alpha('#4caf50', 0.15) : alpha('#2196f3', 0.15),
                                                                fontWeight: 600
                                                            }} />
                                                    )}
                                                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                                        {meta.tb_instalacao || '-'}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell><Typography variant="body2" noWrap>{meta.tt_operacaoaccao || '-'}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" noWrap>{meta.tt_operacaomodo || '-'}</Typography></TableCell>
                                            <TableCell><Typography variant="body2">{meta.tt_operacaodia || '-'}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" noWrap>{meta.ts_operador1 || 'Não atribuído'}</Typography></TableCell>
                                            <TableCell><Typography variant="body2" noWrap>{meta.ts_operador2 || 'Não atribuído'}</Typography></TableCell>
                                            <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                                    <Tooltip title="Editar">
                                                        <IconButton size="small" onClick={() => handleOpenEdit(meta)}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Eliminar">
                                                        <IconButton size="small" color="error"
                                                            onClick={() => { setDeletingId(meta.pk); setDeleteConfirmOpen(true); }}>
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={totalCount}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                        labelRowsPerPage="Linhas por página:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                    />
                </Card>
            </Stack>

            {/* Create/Edit Dialog */}
            <Dialog open={formOpen} onClose={handleCloseForm} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">{editingId ? 'Editar Volta' : 'Nova Volta'}</Typography>
                        <IconButton onClick={handleCloseForm} size="small"><Close /></IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        {/* Instalação (3/4) + Ação (1/4) */}
                        <Grid size={{ xs: 12, sm: 9 }}>
                            <FormControl fullWidth required>
                                <InputLabel>Instalação</InputLabel>
                                <Select value={formData.tb_instalacao} onChange={handleField('tb_instalacao')} label="Instalação">
                                    {installations.map(inst => (
                                        <MenuItem key={inst.pk} value={inst.pk}>
                                            [{inst.tipo}] {inst.nome}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <FormControl fullWidth required>
                                <InputLabel>Ação</InputLabel>
                                <Select value={formData.tt_operacaoaccao} onChange={handleField('tt_operacaoaccao')} label="Ação">
                                    {actions.map(a => (
                                        <MenuItem key={a.pk} value={a.pk}>{a.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        {/* Modo (1/2) + Dia (1/2) */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Modo</InputLabel>
                                <Select value={formData.tt_operacaomodo} onChange={handleField('tt_operacaomodo')} label="Modo">
                                    <MenuItem value="">Nenhum</MenuItem>
                                    {modes.map(m => (
                                        <MenuItem key={m.pk} value={m.pk}>{m.value}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Dia</InputLabel>
                                <Select value={formData.tt_operacaodia} onChange={handleField('tt_operacaodia')} label="Dia">
                                    <MenuItem value="">Nenhum</MenuItem>
                                    {days.map(d => (
                                        <MenuItem key={d.pk} value={d.pk}>{d.value}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        {/* Operador 1 (1/2) + Operador 2 (1/2) */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required>
                                <InputLabel>Operador Principal</InputLabel>
                                <Select value={formData.who1} onChange={handleField('who1')} label="Operador Principal">
                                    {operators.map(op => (
                                        <MenuItem key={op.pk} value={op.pk}>{op.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Operador Secundário</InputLabel>
                                <Select value={formData.who2} onChange={handleField('who2')} label="Operador Secundário">
                                    <MenuItem value="">Nenhum</MenuItem>
                                    {operators.map(op => (
                                        <MenuItem key={op.pk} value={op.pk}>{op.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseForm} disabled={isSaving}>Cancelar</Button>
                    <Button
                        variant="contained" onClick={handleSubmit}
                        disabled={isSaving || !formData.tb_instalacao || !formData.tt_operacaoaccao || !formData.who1}
                        startIcon={isSaving ? <CircularProgress size={16} /> : <Save />}
                    >
                        {isSaving ? 'A guardar...' : editingId ? 'Atualizar' : 'Criar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Eliminar Volta</DialogTitle>
                <DialogContent>
                    <Typography>Tem a certeza que deseja eliminar esta volta? Esta ação não pode ser desfeita.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained" color="error"
                        onClick={() => deleteMutation.mutate(deletingId)}
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? 'A eliminar...' : 'Eliminar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </ModulePage>
    );
};

export default OperationMetadataPage;
