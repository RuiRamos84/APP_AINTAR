import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Stack, Card, CardContent, Chip, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    FormControl, InputLabel, Select, MenuItem, Grid, Avatar, Alert,
    Paper, Divider, alpha, useTheme, CircularProgress
} from '@mui/material';
import {
    Add, Edit, Delete, Visibility, CheckCircle, Schedule,
    Close, PhotoCamera, GppGood, Download, ZoomIn
} from '@mui/icons-material';
import { SearchBar } from '@/shared/components/data';
import { formatDate, formatCompletedTaskValue, getUserNameByPk } from '../../utils/formatters';

const OperationTaskManager = ({
    operations, metaData, onCreateMeta, onUpdateMeta, onDeleteMeta,
    onValidate, isLoading
}) => {
    const theme = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedOp, setSelectedOp] = useState(null);
    const [validationOpen, setValidationOpen] = useState(false);
    const [selectedExec, setSelectedExec] = useState(null);
    const [classification, setClassification] = useState('');
    const [controlMemo, setControlMemo] = useState('');
    const [imagePreview, setImagePreview] = useState(null);

    const classificationOptions = metaData?.operacaocontrolo || [
        { pk: 1, value: 'Conforme' },
        { pk: 2, value: 'Com observações' },
        { pk: 3, value: 'Não conforme' },
    ];

    // Filtrar operações
    const filteredOps = useMemo(() => {
        if (!searchTerm) return operations;
        const lower = searchTerm.toLowerCase();
        return operations.filter(op =>
            (op.instalacao_nome || '').toLowerCase().includes(lower) ||
            (op.acao_nome || '').toLowerCase().includes(lower) ||
            (op.modo_nome || '').toLowerCase().includes(lower) ||
            (op.operador1_nome || '').toLowerCase().includes(lower)
        );
    }, [operations, searchTerm]);

    const handleOpenDetails = (op) => {
        setSelectedOp(op);
        setDetailsOpen(true);
    };

    const handleOpenValidation = (exec) => {
        setSelectedExec(exec);
        setClassification(exec.control_tt_operacaocontrolo || '');
        setControlMemo(exec.control_memo || '');
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
            {/* Search */}
            <SearchBar searchTerm={searchTerm} onSearch={setSearchTerm} />

            {/* Table */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Estado</TableCell>
                                <TableCell>Validação</TableCell>
                                <TableCell>Instalação</TableCell>
                                <TableCell>Ação</TableCell>
                                <TableCell>Modo</TableCell>
                                <TableCell>Dia</TableCell>
                                <TableCell>Operador 1</TableCell>
                                <TableCell>Operador 2</TableCell>
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
                            ) : filteredOps.map((op) => {
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
                                            <Typography variant="body2">{op.dia_nome || '-'}</Typography>
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
                    <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary">
                            {filteredOps.length} tarefa{filteredOps.length !== 1 ? 's' : ''}
                        </Typography>
                    </Box>
                )}
            </Card>

            {/* Details Dialog */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Detalhes da Tarefa</Typography>
                        <IconButton onClick={() => setDetailsOpen(false)} size="small"><Close /></IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedOp && (
                        <Stack spacing={3}>
                            {/* Installation Info */}
                            <Box>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                    {getInstallationType(selectedOp) && (
                                        <Chip label={getInstallationType(selectedOp)} size="small"
                                            color={getInstallationType(selectedOp) === 'ETAR' ? 'success' : 'primary'} />
                                    )}
                                    <Typography variant="h6" fontWeight={600}>
                                        {selectedOp.instalacao_nome || '-'}
                                    </Typography>
                                </Stack>
                            </Box>

                            {/* Operation Details */}
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Ação</Typography>
                                    <Typography variant="body2" fontWeight={500}>{selectedOp.acao_nome || '-'}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Modo</Typography>
                                    <Typography variant="body2" fontWeight={500}>{selectedOp.modo_nome || '-'}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Dia/Frequência</Typography>
                                    <Typography variant="body2" fontWeight={500}>{selectedOp.dia_nome || '-'}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Descrição</Typography>
                                    <Typography variant="body2" fontWeight={500}>{selectedOp.description || '-'}</Typography>
                                </Grid>
                            </Grid>

                            <Divider />

                            {/* Operators */}
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>Operadores Atribuídos</Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Avatar sx={{ width: 32, height: 32, fontSize: 12 }}>
                                                {selectedOp.operador1_nome?.charAt(0) || '?'}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {selectedOp.operador1_nome || 'Não atribuído'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">Operador Principal</Typography>
                                            </Box>
                                        </Stack>
                                    </Grid>
                                    {selectedOp.operador2_nome && selectedOp.operador2_nome !== 'Não atribuído' && (
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Avatar sx={{ width: 32, height: 32, fontSize: 12 }}>
                                                    {selectedOp.operador2_nome?.charAt(0) || '?'}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {selectedOp.operador2_nome}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">Operador Secundário</Typography>
                                                </Box>
                                            </Stack>
                                        </Grid>
                                    )}
                                </Grid>
                            </Box>

                            {/* Executions */}
                            {selectedOp.executions?.length > 0 && (
                                <>
                                    <Divider />
                                    <Box>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Registos de Execução ({selectedOp.executionCount})
                                        </Typography>
                                        <Stack spacing={1.5}>
                                            {selectedOp.executions.map((exec, idx) => {
                                                const isValidated = !!exec.control_tt_operacaocontrolo;
                                                const completedValue = formatCompletedTaskValue(exec);
                                                return (
                                                    <Paper key={exec.pk || idx} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                                        <Stack spacing={1}>
                                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                                    <Chip
                                                                        label={`#${exec.pk || idx + 1}`}
                                                                        size="small" variant="outlined"
                                                                    />
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
                            <Select value={classification} onChange={(e) => setClassification(e.target.value)} label="Classificação">
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
        </Stack>
    );
};

export default OperationTaskManager;
