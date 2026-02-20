import React, { useState, useCallback, useMemo } from 'react';
import {
    Container, Typography, Paper, Box, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
    Grid, Card, CardContent, Avatar, Tabs, Tab, TextField,
    Select, MenuItem, FormControl, InputLabel, Pagination, useTheme, useMediaQuery
} from '@mui/material';
import {
    CheckCircle, Visibility, Refresh, Assignment, Schedule,
    Euro, History, Close as CloseIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/contexts/AuthContext';
import useMetaData from '@/core/hooks/useMetaData';
import paymentService from '../services/paymentService';
import { PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '../services/paymentTypes';

const PaymentAdminPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuth();
    const { data: metaData } = useMetaData();
    const queryClient = useQueryClient();

    const [tab, setTab] = useState(0);
    const [error, setError] = useState('');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '', endDate: '', method: '', status: ''
    });
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const getUserNameByPk = useCallback((userPk) => {
        if (!userPk || !metaData?.who) return `Utilizador ${userPk}`;
        const found = metaData.who.find(u => u.pk === userPk);
        return found?.name || `Utilizador ${userPk}`;
    }, [metaData]);

    // Query pagamentos pendentes
    const { data: rawPayments = [], isLoading: isLoadingPending, refetch: fetchPending } = useQuery({
        queryKey: ['pendingPayments'],
        queryFn: async () => {
            const result = await paymentService.getPendingPayments();
            if (result?.payments && Array.isArray(result.payments)) return result.payments;
            if (Array.isArray(result)) return result;
            return [];
        },
        enabled: tab === 0,
    });

    const payments = useMemo(() => Array.isArray(rawPayments) ? rawPayments : [], [rawPayments]);

    // Mutation aprovar
    const { mutate: approvePayment, isLoading: isApproving } = useMutation({
        mutationFn: (paymentPk) => paymentService.approvePayment(paymentPk),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
            queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
            setConfirmOpen(false);
            setSelectedPayment(null);
        },
        onError: (err) => setError(err.message || 'Erro na aprovação'),
    });

    // Query histórico
    const { data: historyData, isLoading: isLoadingHistory } = useQuery({
        queryKey: ['paymentHistory', page, filters],
        queryFn: async () => {
            const result = await paymentService.getPaymentHistory({
                page, page_size: pageSize,
                start_date: filters.startDate || null,
                end_date: filters.endDate || null,
                method: filters.method || null,
                status: filters.status || null,
            });
            if (result && Array.isArray(result.payments)) return result;
            return { payments: [], total: 0 };
        },
        enabled: tab === 1,
        keepPreviousData: true,
    });

    const totalPages = Math.ceil((historyData?.total || 0) / pageSize);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({ startDate: '', endDate: '', method: '', status: '' });
        setPage(1);
    };

    const handleDetailsClick = async (payment) => {
        setSelectedPayment(null);
        setDetailsOpen(true);
        try {
            const result = await paymentService.getPaymentDetails(payment.pk);
            const data = result?.payment || result || payment;

            if (data.payment_reference) {
                try {
                    const ref = typeof data.payment_reference === 'string'
                        ? JSON.parse(data.payment_reference)
                        : data.payment_reference;
                    if (ref.submitted_by) data.submitter_name = getUserNameByPk(ref.submitted_by);
                } catch {}
            }
            setSelectedPayment(data);
        } catch {
            setSelectedPayment(payment);
        }
    };

    const currentData = tab === 0 ? payments : historyData?.payments ?? [];
    const isLoading = (tab === 0 && isLoadingPending) || (tab === 1 && isLoadingHistory);

    const getMethodLabel = (method) => PAYMENT_METHOD_LABELS[method] || method;

    const getStatusLabel = (status) => {
        const labels = {
            PENDING_VALIDATION: 'Pendente', SUCCESS: 'Aprovado',
            DECLINED: 'Rejeitado', PENDING: 'Pendente', EXPIRED: 'Expirado'
        };
        return labels[status] || status;
    };

    return (
        <Container maxWidth="lg" sx={{ py: 3 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                    <Assignment sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                    Gestão de Pagamentos
                </Typography>
            </Box>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(1); }} variant={isMobile ? 'fullWidth' : 'standard'}>
                    <Tab icon={<Schedule />} label={`Pendentes (${payments.length})`} iconPosition="start" />
                    <Tab icon={<History />} label="Histórico" iconPosition="start" />
                </Tabs>
            </Paper>

            {/* Filtros (histórico) */}
            {tab === 1 && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField type="date" label="Data início" value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                size="small" fullWidth InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField type="date" label="Data fim" value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                size="small" fullWidth InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Método</InputLabel>
                                <Select value={filters.method} label="Método"
                                    onChange={(e) => handleFilterChange('method', e.target.value)}>
                                    <MenuItem value="">Todos</MenuItem>
                                    <MenuItem value="CASH">Numerário</MenuItem>
                                    <MenuItem value="BANK_TRANSFER">Transferência</MenuItem>
                                    <MenuItem value="MUNICIPALITY">Municípios</MenuItem>
                                    <MenuItem value="MBWAY">MB WAY</MenuItem>
                                    <MenuItem value="MULTIBANCO">Multibanco</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Estado</InputLabel>
                                <Select value={filters.status} label="Estado"
                                    onChange={(e) => handleFilterChange('status', e.target.value)}>
                                    <MenuItem value="">Todos</MenuItem>
                                    <MenuItem value="SUCCESS">Aprovado</MenuItem>
                                    <MenuItem value="DECLINED">Rejeitado</MenuItem>
                                    <MenuItem value="PENDING_VALIDATION">Pendente</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button variant="outlined" onClick={clearFilters} fullWidth>Limpar</Button>
                                <Button variant="contained" onClick={() => queryClient.invalidateQueries({ queryKey: ['paymentHistory'] })} fullWidth>
                                    Filtrar
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {/* Stats (pendentes) */}
            {tab === 0 && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <Schedule sx={{ fontSize: 36, color: 'warning.main', mb: 0.5 }} />
                                <Typography variant="h4">{payments.length}</Typography>
                                <Typography variant="body2" color="text.secondary">Pendentes</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <Euro sx={{ fontSize: 36, color: 'success.main', mb: 0.5 }} />
                                <Typography variant="h4">
                                    €{payments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">Total Pendente</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <Button
                                    variant="contained" fullWidth
                                    startIcon={isLoadingPending ? null : <Refresh />}
                                    onClick={fetchPending} disabled={isLoadingPending}
                                    sx={{ mt: 1 }}
                                >
                                    {isLoadingPending ? 'A carregar...' : 'Actualizar'}
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {/* Tabela */}
            <Paper elevation={2}>
                <TableContainer>
                    <Table size={isMobile ? 'small' : 'medium'}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Documento</TableCell>
                                {!isMobile && <TableCell>Método</TableCell>}
                                {tab === 1 && !isMobile && <TableCell>Estado</TableCell>}
                                <TableCell align="right">Valor</TableCell>
                                {!isMobile && <TableCell>Data</TableCell>}
                                <TableCell align="center">Acções</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : currentData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            {tab === 0 ? 'Nenhum pagamento pendente' : 'Nenhum registo encontrado'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : currentData.map((payment) => (
                                <TableRow key={payment.pk} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600}>
                                            {payment.regnumber || payment.order_id}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {payment.document_descr || ''}
                                        </Typography>
                                    </TableCell>
                                    {!isMobile && (
                                        <TableCell>
                                            <Chip label={getMethodLabel(payment.payment_method)} size="small"
                                                sx={{ bgcolor: PAYMENT_STATUS_COLORS[payment.payment_method] || 'grey.500', color: 'white' }} />
                                        </TableCell>
                                    )}
                                    {tab === 1 && !isMobile && (
                                        <TableCell>
                                            <Chip label={getStatusLabel(payment.payment_status)} size="small"
                                                sx={{ bgcolor: PAYMENT_STATUS_COLORS[payment.payment_status] || 'grey.500', color: 'white' }} />
                                        </TableCell>
                                    )}
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight={600}>
                                            €{Number(payment.amount || 0).toFixed(2)}
                                        </Typography>
                                    </TableCell>
                                    {!isMobile && (
                                        <TableCell>
                                            {new Date(payment.created_at).toLocaleDateString('pt-PT')}
                                        </TableCell>
                                    )}
                                    <TableCell align="center">
                                        <IconButton size="small" onClick={() => handleDetailsClick(payment)} color="primary">
                                            <Visibility fontSize="small" />
                                        </IconButton>
                                        {tab === 0 && (
                                            <IconButton size="small" color="success" onClick={() => {
                                                setSelectedPayment(payment);
                                                setConfirmOpen(true);
                                            }}>
                                                <CheckCircle fontSize="small" />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {tab === 1 && totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <Pagination count={totalPages} page={page}
                            onChange={(_, p) => setPage(p)} color="primary" size={isMobile ? 'small' : 'medium'} />
                    </Box>
                )}
            </Paper>

            {/* Modal Detalhes */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assignment /> Detalhes do Pagamento
                    </Box>
                    <IconButton onClick={() => setDetailsOpen(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {!selectedPayment ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
                    ) : (
                        <Box>
                            <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'white', borderRadius: 2 }}>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2"><strong>Valor:</strong> €{Number(selectedPayment.amount || 0).toFixed(2)}</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                            <Typography variant="body2"><strong>Método:</strong></Typography>
                                            <Chip label={getMethodLabel(selectedPayment.payment_method)} size="small" />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                            <Typography variant="body2"><strong>Estado:</strong></Typography>
                                            <Chip label={getStatusLabel(selectedPayment.payment_status)} size="small" />
                                        </Box>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2"><strong>ID Transação:</strong> {selectedPayment.transaction_id}</Typography>
                                        <Typography variant="body2"><strong>Order ID:</strong> {selectedPayment.order_id}</Typography>
                                        <Typography variant="body2"><strong>Data:</strong> {new Date(selectedPayment.created_at).toLocaleString('pt-PT')}</Typography>
                                    </Grid>
                                </Grid>
                            </Paper>

                            {(selectedPayment.validated_by || selectedPayment.validated_at) && (
                                <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.light', color: 'white', borderRadius: 2 }}>
                                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <CheckCircle fontSize="small" /> Validação
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Validado por:</strong> {selectedPayment.validator_name || `Utilizador ${selectedPayment.validated_by}`}
                                    </Typography>
                                    {selectedPayment.validated_at && (
                                        <Typography variant="body2">
                                            <strong>Data:</strong> {new Date(selectedPayment.validated_at).toLocaleString('pt-PT')}
                                        </Typography>
                                    )}
                                </Paper>
                            )}

                            {selectedPayment.payment_reference && (() => {
                                try {
                                    const ref = typeof selectedPayment.payment_reference === 'string'
                                        ? JSON.parse(selectedPayment.payment_reference) : selectedPayment.payment_reference;
                                    return (
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="subtitle2" gutterBottom>Detalhes Específicos</Typography>
                                            {ref.payment_details && <Typography variant="body2"><strong>Referência:</strong> {ref.payment_details}</Typography>}
                                            {ref.submitted_by && <Typography variant="body2"><strong>Submetido por:</strong> {selectedPayment.submitter_name || `Utilizador ${ref.submitted_by}`}</Typography>}
                                            {ref.submitted_at && <Typography variant="body2"><strong>Data Submissão:</strong> {new Date(ref.submitted_at).toLocaleString('pt-PT')}</Typography>}
                                            {ref.payment_type && <Typography variant="body2"><strong>Tipo:</strong> {ref.payment_type}</Typography>}
                                        </Paper>
                                    );
                                } catch {
                                    return (
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                                                {selectedPayment.payment_reference}
                                            </Typography>
                                        </Paper>
                                    );
                                }
                            })()}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
                    {tab === 0 && selectedPayment && (
                        <Button variant="contained" color="success" startIcon={<CheckCircle />}
                            onClick={() => { setDetailsOpen(false); setConfirmOpen(true); }}>
                            Aprovar
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Modal Confirmação */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Confirmar Aprovação</DialogTitle>
                <DialogContent>
                    <Typography>
                        Aprovar pagamento de <strong>€{Number(selectedPayment?.amount || 0).toFixed(2)}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                    <Button variant="contained" color="success" disabled={isApproving}
                        onClick={() => approvePayment(selectedPayment.pk)}>
                        {isApproving ? 'A aprovar...' : 'Aprovar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default PaymentAdminPage;
