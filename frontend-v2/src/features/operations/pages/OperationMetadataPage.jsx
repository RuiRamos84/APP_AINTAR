import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Box, Typography, Stack, Card, Chip, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, Button,
    CircularProgress, Alert, Fab, alpha, useTheme
} from '@mui/material';
import {
    Settings as SettingsIcon,
    Add, Edit, Close, Refresh, AdminPanelSettings
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar, SortableHeadCell } from '@/shared/components/data';
import { useSortable } from '@/shared/hooks/useSortable';
import { operationService } from '../services/operationService';
import { exportMetasToExcel } from '../services/exportService';
import ExportButton from '../components/ExportButton';
import ProgressiveTaskFormV2 from '../components/ProgressiveTaskFormV2';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const OperationMetadataPage = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();

    // Paginação
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Form state
    const [formOpen, setFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null); // null = criar, object = editar

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

    const { sorted: sortedMetas, sortKey, sortDir, requestSort } = useSortable(metas, 'tb_instalacao');

    // Mutations (apenas criar e editar — delete removido por segurança)
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

    // Handlers
    const handleOpenCreate = () => {
        setEditingTask(null);
        setFormOpen(true);
    };

    const handleOpenEdit = (meta) => {
        setEditingTask(meta);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setEditingTask(null);
    };

    const handleFormSubmit = async (cleanData) => {
        if (editingTask) {
            await updateMutation.mutateAsync({ id: editingTask.pk, data: cleanData });
        } else {
            await createMutation.mutateAsync(cleanData);
        }
    };

    const handleExportExcel = () => {
        exportMetasToExcel(metas, { filename: 'Voltas_Operacao' });
    };

    const getInstType = (meta) => {
        const name = meta.tb_instalacao || '';
        if (name.toLowerCase().includes('etar')) return 'ETAR';
        if (name.toLowerCase().includes('ee')) return 'EE';
        return null;
    };

    // Paginação manual (client-side) para manter compatibilidade
    const handleChangePage = (_, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
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
                                    <SortableHeadCell label="Instalação" field="tb_instalacao" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                    <SortableHeadCell label="Ação" field="tt_operacaoaccao" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                    <SortableHeadCell label="Modo" field="tt_operacaomodo" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                    <SortableHeadCell label="Dia" field="tt_operacaodia" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                    <SortableHeadCell label="Operador 1" field="ts_operador1" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                    <SortableHeadCell label="Operador 2" field="ts_operador2" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                    <TableCell align="center" sx={{ width: 60 }}>Editar</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedMetas.length === 0 && !isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                {debouncedSearch
                                                    ? 'Nenhuma volta encontrada para a pesquisa'
                                                    : 'Nenhuma volta disponível'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : sortedMetas.map(meta => {
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
                                                        <Chip label={instType} size="small" sx={{
                                                            fontSize: 10, height: 20,
                                                            bgcolor: instType === 'ETAR'
                                                                ? alpha('#4caf50', 0.15)
                                                                : alpha('#2196f3', 0.15),
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
                                            <TableCell><Typography variant="body2" noWrap>{meta.ts_operador2 || '—'}</Typography></TableCell>
                                            <TableCell align="center" onClick={e => e.stopPropagation()}>
                                                <Tooltip title="Editar volta">
                                                    <IconButton size="small" onClick={() => handleOpenEdit(meta)}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Paginação manual */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="caption" color="text.secondary">
                            {totalCount} volta{totalCount !== 1 ? 's' : ''} no total
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" color="text.secondary">Página {page + 1}</Typography>
                            <Button size="small" disabled={page === 0} onClick={() => handleChangePage(null, page - 1)}>‹</Button>
                            <Button size="small" disabled={(page + 1) * rowsPerPage >= totalCount} onClick={() => handleChangePage(null, page + 1)}>›</Button>
                        </Stack>
                    </Box>
                </Card>

                {/* Nota de segurança */}
                <Alert severity="info" icon={<AdminPanelSettings fontSize="inherit" />} sx={{ borderRadius: 2 }}>
                    Para <strong>eliminar</strong> uma volta, contacte o administrador do sistema.
                    A eliminação de registos operacionais requer autorização especial.
                </Alert>
            </Stack>

            {/* Dialog com stepper — Criar / Editar */}
            <Dialog
                open={formOpen}
                onClose={handleCloseForm}
                maxWidth="md"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3 } } }}
            >
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">
                            {editingTask ? 'Editar Volta' : 'Nova Volta'}
                        </Typography>
                        <IconButton onClick={handleCloseForm} size="small">
                            <Close />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ pt: 3 }}>
                    <ProgressiveTaskFormV2
                        initialTask={editingTask}
                        onSubmit={handleFormSubmit}
                        onCancel={handleCloseForm}
                    />
                </DialogContent>
            </Dialog>
        </ModulePage>
    );
};

export default OperationMetadataPage;
