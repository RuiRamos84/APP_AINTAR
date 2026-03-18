import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Stack, Card, CardContent, Chip, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    FormControl, InputLabel, Select, MenuItem, Grid, Avatar, Alert,
    Paper, Divider, alpha, useTheme, CircularProgress,
    TablePagination
} from '@mui/material';
import {
    Add, Edit, Delete, Visibility, CheckCircle, Schedule,
    Close, PhotoCamera, GppGood, Download, ZoomIn,
    Business, CalendarToday, Engineering, LocationOn, Map as MapIcon,
} from '@mui/icons-material';
import { SearchBar, SortableHeadCell } from '@/shared/components/data';
import { useSortable } from '@/shared/hooks/useSortable';
import { formatDate, formatDateOnly, formatCompletedTaskValue, getUserNameByPk } from '../../utils/formatters';
import DirectTaskForm from '../DirectTaskForm';
import LocationPickerMap from '@/features/documents/components/forms/LocationPickerMap';

const OperationTaskManager = ({
    operations, metaData, onCreateTask, onCreateDirect, onUpdateMeta, onDeleteMeta,
    onValidate, isLoading
}) => {
    const theme = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [directOpen, setDirectOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedOp, setSelectedOp] = useState(null);
    const [validationOpen, setValidationOpen] = useState(false);
    const [selectedExec, setSelectedExec] = useState(null);
    const [classification, setClassification] = useState('');
    const [controlMemo, setControlMemo] = useState('');
    const [imagePreview, setImagePreview] = useState(null);

    const classificationOptions = metaData?.opcontrolo || [];

    // Filtrar operações — reset de página ao mudar pesquisa
    const filteredOps = useMemo(() => {
        setPage(0);
        if (!searchTerm) return operations;
        const lower = searchTerm.toLowerCase();
        return operations.filter(op =>
            (op.instalacao_nome || '').toLowerCase().includes(lower) ||
            (op.acao_nome || '').toLowerCase().includes(lower) ||
            (op.modo_nome || '').toLowerCase().includes(lower) ||
            (op.operador1_nome || '').toLowerCase().includes(lower)
        );
    }, [operations, searchTerm]);

    // Ordenação
    const { sorted: sortedOps, sortKey, sortDir, requestSort } = useSortable(filteredOps, 'instalacao_nome');

    // Slice da página atual (após ordenação)
    const pagedOps = useMemo(
        () => sortedOps.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [sortedOps, page, rowsPerPage]
    );

    const handleOpenDetails = (op) => {
        setSelectedOp(op);
        setDetailsOpen(true);
    };

    const handleOpenValidation = (exec) => {
        setSelectedExec(exec);
        setClassification('');
        setControlMemo('');
        setValidationOpen(true);
    };

    const handleSubmitValidation = () => {
        if (!selectedExec || !classification) return;
        const formData = new FormData();
        formData.append('pk', selectedExec.pk);
        formData.append('control_tt_operacaocontrolo', classification);
        if (controlMemo.trim()) formData.append('control_memo', controlMemo.trim());
        onValidate?.(formData);
        setValidationOpen(false);
        setSelectedExec(null);
        setDetailsOpen(false);
        setSelectedOp(null);
    };

    const getStatusChip = (op) => {
        if (op.hasExecutions) {
            return <Chip label={`Executada (${op.executionCount}x)`} size="small" color="success" variant="outlined" />;
        }
        return <Chip label="Pendente" size="small" color="warning" variant="outlined" />;
    };

    const getValidationChip = (op) => {
        if (!op.hasExecutions) return <Chip label="-" size="small" variant="outlined" />;
        const lastExec = op.lastExecution;
        if (lastExec?.control_tt_operacaocontrolo) {
            return <Chip label="Validada" size="small" color="success" icon={<GppGood />} />;
        }
        return <Chip label="Aguarda Validação" size="small" color="info" variant="outlined" />;
    };

    const getInstallationType = (op) => {
        if (op.instalacao_nome?.toLowerCase().includes('etar')) return 'ETAR';
        if (op.instalacao_nome?.toLowerCase().includes('ee')) return 'EE';
        return null;
    };

    return (
        <Stack spacing={2}>
            {/* Header: search + create buttons */}
            <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ flex: 1 }}>
                    <SearchBar searchTerm={searchTerm} onSearch={setSearchTerm} />
                </Box>
                <Tooltip title="Registar execução direta (ETAR / EE / Rede / Caixa)">
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setDirectOpen(true)}
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        Registar Execução
                    </Button>
                </Tooltip>
            </Stack>

            {/* Table */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Estado</TableCell>
                                <TableCell>Validação</TableCell>
                                <SortableHeadCell label="Instalação" field="instalacao_nome" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                <SortableHeadCell label="Ação" field="acao_nome" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                <SortableHeadCell label="Modo" field="modo_nome" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                <SortableHeadCell label="Data" field="data" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                <SortableHeadCell label="Operador 1" field="operador1_nome" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                <SortableHeadCell label="Operador 2" field="operador2_nome" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
                                <TableCell align="center">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : filteredOps.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Nenhuma tarefa encontrada
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : pagedOps.map((op) => {
                                const instType = getInstallationType(op);
                                return (
                                    <TableRow key={op.pk} hover sx={{ cursor: 'pointer' }} onClick={() => handleOpenDetails(op)}>
                                        <TableCell>{getStatusChip(op)}</TableCell>
                                        <TableCell>{getValidationChip(op)}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                                {instType && (
                                                    <Chip label={instType} size="small" variant="filled"
                                                        sx={{ fontSize: 10, height: 20, bgcolor: instType === 'ETAR' ? alpha('#4caf50', 0.15) : alpha('#2196f3', 0.15) }} />
                                                )}
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                                                    {op.instalacao_nome || '-'}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                                {op.acao_nome || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" noWrap>{op.modo_nome || '-'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{op.data ? formatDateOnly(op.data) : '-'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                                <Typography variant="body2" noWrap>{op.operador1_nome || '-'}</Typography>
                                                {op.lastExecution && op.lastExecution.who_exec === op.who1 && (
                                                    <CheckCircle color="success" sx={{ fontSize: 14 }} />
                                                )}
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" noWrap>{op.operador2_nome || '-'}</Typography>
                                        </TableCell>
                                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                            <Tooltip title="Ver Detalhes">
                                                <IconButton size="small" onClick={() => handleOpenDetails(op)}>
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                {filteredOps.length > 0 && (
                    <TablePagination
                        component="div"
                        count={filteredOps.length}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        rowsPerPageOptions={[25, 50, 100]}
                        labelRowsPerPage="Por página:"
                        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
                    />
                )}
            </Card>

            {/* Details Dialog */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" fontWeight={700}>Detalhes da Tarefa</Typography>
                        <IconButton onClick={() => setDetailsOpen(false)} size="small"><Close /></IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ pt: 2 }}>
                    {selectedOp && (
                        <Stack spacing={2}>
                            {/* ── Cabeçalho compacto ── */}
                            <Box>
                                {/* Linha 1: Ação + status */}
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                    <Typography variant="h6" fontWeight={700} sx={{ flex: 1, lineHeight: 1.3 }}>
                                        {selectedOp.acao_nome || `Tarefa #${selectedOp.pk}`}
                                    </Typography>
                                    <Box flexShrink={0}>{getStatusChip(selectedOp)}</Box>
                                </Stack>

                                {/* Linha 2: Instalação · Data · Modo */}
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <Business sx={{ fontSize: 14, color: 'text.disabled' }} />
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                            {selectedOp.instalacao_nome || '-'}
                                        </Typography>
                                    </Stack>
                                    {selectedOp.data && (
                                        <>
                                            <Typography variant="body2" color="text.disabled">·</Typography>
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <CalendarToday sx={{ fontSize: 14, color: 'text.disabled' }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatDateOnly(selectedOp.data)}
                                                </Typography>
                                            </Stack>
                                        </>
                                    )}
                                    {selectedOp.modo_nome && selectedOp.modo_nome !== '-' && (
                                        <>
                                            <Typography variant="body2" color="text.disabled">·</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {selectedOp.modo_nome}
                                            </Typography>
                                        </>
                                    )}
                                </Stack>

                                {/* Descrição */}
                                {selectedOp.descr && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                                        {selectedOp.descr}
                                    </Typography>
                                )}
                            </Box>

                            <Divider />

                            {/* Operadores */}
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Operadores
                                </Typography>
                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                                    <Engineering sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
                                    <Typography variant="body2" fontWeight={500}>
                                        {selectedOp.operador1_nome || '-'}
                                    </Typography>
                                    {selectedOp.operador2_nome && selectedOp.operador2_nome !== '-' && (
                                        <>
                                            <Typography variant="body2" color="text.disabled">·</Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {selectedOp.operador2_nome}
                                            </Typography>
                                        </>
                                    )}
                                </Stack>
                            </Box>

                            {/* Localização GPS */}
                            {selectedOp.clat && selectedOp.clong && (
                                <>
                                    <Divider />
                                    <Box>
                                        <Typography variant="subtitle2" gutterBottom color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <LocationOn fontSize="small" /> Localização do Local
                                        </Typography>
                                        <LocationPickerMap
                                            lat={selectedOp.clat}
                                            lng={selectedOp.clong}
                                            readOnly
                                            height={200}
                                        />
                                        <Box
                                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedOp.clat},${selectedOp.clong}`, '_blank', 'noopener,noreferrer')}
                                            sx={{
                                                mt: 1, display: 'flex', alignItems: 'center', gap: 1.5,
                                                p: 1.5, borderRadius: 2,
                                                border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                                                bgcolor: alpha(theme.palette.success.main, 0.05),
                                                cursor: 'pointer', transition: 'all 0.2s',
                                                '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.12), borderColor: theme.palette.success.main },
                                            }}
                                        >
                                            <MapIcon fontSize="small" color="success" />
                                            <Typography variant="body2" fontWeight={600} color="success.main">
                                                Navegar para este local (Google Maps)
                                            </Typography>
                                        </Box>
                                    </Box>
                                </>
                            )}

                            {/* Registos de Execução */}
                            {selectedOp.executions?.length > 0 && (
                                <>
                                    <Divider />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Registos de Execução ({selectedOp.executionCount})
                                        </Typography>
                                        <Stack spacing={1.5} sx={{ mt: 1 }}>
                                            {selectedOp.executions.map((exec, idx) => {
                                                const isValidated = !!exec.control_tt_operacaocontrolo;
                                                const completedValue = formatCompletedTaskValue(exec);
                                                return (
                                                    <Paper key={exec.pk || idx} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                                        <Stack spacing={1}>
                                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                                    <Chip label={`#${exec.pk || idx + 1}`} size="small" variant="outlined" />
                                                                    <Chip
                                                                        label={isValidated ? 'Validada' : 'Aguarda Validação'}
                                                                        size="small"
                                                                        color={isValidated ? 'success' : 'info'}
                                                                        icon={isValidated ? <GppGood /> : undefined}
                                                                    />
                                                                </Stack>
                                                                {!isValidated && (
                                                                    <Button
                                                                        size="small" variant="outlined" color="primary"
                                                                        startIcon={<GppGood />}
                                                                        onClick={() => handleOpenValidation(exec)}
                                                                    >
                                                                        Validar
                                                                    </Button>
                                                                )}
                                                            </Stack>
                                                            <Grid container spacing={1}>
                                                                <Grid size={{ xs: 6 }}>
                                                                    <Typography variant="caption" color="text.secondary">Executor</Typography>
                                                                    <Typography variant="body2">
                                                                        {getUserNameByPk(exec.who_exec || exec.ts_who, metaData)}
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid size={{ xs: 6 }}>
                                                                    <Typography variant="caption" color="text.secondary">Data</Typography>
                                                                    <Typography variant="body2">
                                                                        {formatDate(exec.ts_exec || exec.data_execucao)}
                                                                    </Typography>
                                                                </Grid>
                                                            </Grid>
                                                            {completedValue && (
                                                                <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.05), p: 1, borderRadius: 1 }}>
                                                                    <Typography variant="caption" color="text.secondary">{completedValue.label}</Typography>
                                                                    <Typography variant="body2">{completedValue.value}</Typography>
                                                                </Box>
                                                            )}
                                                            {exec.valuememo && (
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary">Comentário</Typography>
                                                                    <Typography variant="body2">{exec.valuememo}</Typography>
                                                                </Box>
                                                            )}
                                                            {exec.foto && (
                                                                <Chip
                                                                    icon={<PhotoCamera />}
                                                                    label="Foto anexada"
                                                                    size="small" variant="outlined"
                                                                    onClick={() => setImagePreview(exec.foto)}
                                                                    sx={{ alignSelf: 'flex-start', cursor: 'pointer' }}
                                                                />
                                                            )}
                                                            {isValidated && exec.control_memo && (
                                                                <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), p: 1, borderRadius: 1 }}>
                                                                    <Typography variant="caption" color="text.secondary">Feedback do Supervisor</Typography>
                                                                    <Typography variant="body2">{exec.control_memo}</Typography>
                                                                </Box>
                                                            )}
                                                        </Stack>
                                                    </Paper>
                                                );
                                            })}
                                        </Stack>
                                    </Box>
                                </>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
                </DialogActions>
            </Dialog>

            {/* Validation Dialog */}
            <Dialog open={validationOpen} onClose={() => setValidationOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Validar Execução</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl fullWidth required>
                            <InputLabel>Classificação</InputLabel>
                            <Select value={classification} onChange={(e) => setClassification(e.target.value)} label="Classificação" displayEmpty>
                                <MenuItem value="" disabled><em>Selecione uma classificação</em></MenuItem>
                                {classificationOptions.map(opt => (
                                    <MenuItem key={opt.pk} value={opt.pk}>{opt.value}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth multiline rows={3}
                            label="Observações do Supervisor"
                            value={controlMemo}
                            onChange={(e) => setControlMemo(e.target.value)}
                            placeholder="Observações sobre esta execução..."
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setValidationOpen(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSubmitValidation} disabled={!classification}>
                        Validar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Image Preview */}
            <Dialog open={!!imagePreview} onClose={() => setImagePreview(null)} maxWidth="md">
                <DialogContent sx={{ p: 0 }}>
                    {imagePreview && (
                        <Box sx={{ position: 'relative' }}>
                            <img
                                src={`/api/v1/operacao_photo/${imagePreview}`}
                                alt="Foto da execução"
                                style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                            />
                            <IconButton
                                onClick={() => setImagePreview(null)}
                                sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
                            >
                                <Close />
                            </IconButton>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog — Registo Rápido (DirectTaskForm) */}
            <Dialog
                open={directOpen}
                onClose={() => setDirectOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Registo Rápido de Operação</Typography>
                        <IconButton onClick={() => setDirectOpen(false)} size="small"><Close /></IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
                    <DirectTaskForm
                        onSubmit={async (data) => {
                            await onCreateDirect?.(data);
                            setDirectOpen(false); // só fecha se não houver erro
                        }}
                        onCancel={() => setDirectOpen(false)}
                    />
                </DialogContent>
            </Dialog>


        </Stack>
    );
};

export default OperationTaskManager;
