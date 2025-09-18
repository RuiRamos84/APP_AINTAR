import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Typography, Paper, Box, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
    Grid, Card, CardContent, Avatar, Tabs, Tab, TextField,
    Select, MenuItem, FormControl, InputLabel, Pagination
} from '@mui/material';
import {
    CheckCircle, Visibility, Refresh, Assignment, Schedule,
    Euro, FilterList, History
} from '@mui/icons-material';
import paymentService from '../services/paymentService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PAYMENT_STATUS_COLORS } from '../services/paymentTypes';
import { useMetaData } from '../../../contexts/MetaDataContext'; 

const PaymentAdminPage = ({ userInfo }) => {
    const { metaData } = useMetaData();
    const queryClient = useQueryClient();
    const [tab, setTab] = useState(0);
    const [error, setError] = useState('');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    // Filtros e paginação para o histórico
    const [filters, setFilters] = useState({
        startDate: null,
        endDate: null,
        method: '',
        status: '',
        user: ''
    });
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const hasAccess = true;

    const getUserNameByPk = useCallback((userPk) => {
        if (!userPk || !metaData?.who) {
            return `Utilizador ${userPk}`;
        }

        const user = metaData.who.find(user => user.pk === userPk);
        return user?.name || `Utilizador ${userPk}`;
    }, [metaData]);

    // Usar useQuery para buscar pagamentos pendentes
    const { data: payments = [], isLoading: isLoadingPending, refetch: fetchPendingPayments } = useQuery({
        queryKey: ['pendingPayments'],
        queryFn: async () => {
            const result = await paymentService.getPendingPayments();
            return result || []; // Garantir que é sempre um array
        },
        enabled: hasAccess && tab === 0,
    });

    // Usar useMutation para aprovar pagamentos
    const { mutate: approvePayment, isLoading: isApproving } = useMutation({
        mutationFn: (paymentPk) => paymentService.approvePayment(paymentPk),
        onSuccess: () => {
            // Invalida a query de pagamentos pendentes para a atualizar automaticamente
            queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
            setConfirmOpen(false);
            setSelectedPayment(null);
        },
        onError: (err) => {
            setError(err.message || 'Erro na aprovação');
        }
    });

    // Usar useQuery para o histórico de pagamentos
    const { data: historyData, isLoading: isLoadingHistory, isError: isErrorHistory, error: historyError } = useQuery({
        queryKey: ['paymentHistory', page, filters],
        queryFn: () => paymentService.getPaymentHistory({
                page,
                page_size: pageSize,
                ...filters,
                start_date: filters.startDate || null,
                end_date: filters.endDate || null,
                exclude_pending: true
        }),
        enabled: hasAccess && tab === 1,
        keepPreviousData: true, // Melhora a experiência de paginação
    });

    const totalPages = Math.ceil((historyData?.total || 0) / pageSize);

    const handleTabChange = (_, newTab) => {
        setTab(newTab);
        setPage(1);
        // A query de histórico será ativada automaticamente pelo 'enabled'
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({ startDate: null, endDate: null, method: '', status: '', user: '' });
        setPage(1);
    };

    const handleDetailsClick = async (payment) => {
        if (!payment?.pk) return;

        setSelectedPayment(null);
        setDetailsOpen(true);

        try {
            const result = await paymentService.getPaymentDetails(payment.pk);
            const paymentData = result.success ? result.payment : payment;

            if (paymentData.payment_reference) {
                try {
                    const ref = typeof paymentData.payment_reference === 'string'
                        ? JSON.parse(paymentData.payment_reference)
                        : paymentData.payment_reference;

                    if (ref.submitted_by) {
                        paymentData.submitter_name = getUserNameByPk(ref.submitted_by);
                    }
                } catch (e) {
                    console.error('Erro ao processar payment_reference:', e);
                }
            }

            setSelectedPayment(paymentData);
        } catch (err) {
            console.error('Erro geral:', err);
            setSelectedPayment(payment);
        }
    };

    // ===== VERIFICAÇÃO DE ACESSO =====
    if (!hasAccess) {
        return (
            <Container>
                <Alert severity="warning" sx={{ mt: 3 }}>
                    Acesso negado. Apenas utilizadores autorizados podem gerir pagamentos.
                </Alert>
            </Container>
        );
    }

    const currentData = tab === 0 ? payments : historyData?.payments ?? [];

    return (
        <Container maxWidth="lg">
            <Box py={3}>
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Avatar sx={{
                        width: 80,
                        height: 80,
                        mx: 'auto',
                        mb: 2,
                        bgcolor: 'primary.main'
                    }}>
                        <Assignment sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h4" gutterBottom>
                        Gestão de Pagamentos
                    </Typography>
                </Box>

                {/* Tabs */}
                <Paper sx={{ mb: 3 }}>
                    <Tabs value={tab} onChange={handleTabChange}>
                        <Tab
                            icon={<Schedule />}
                            label={`Pendentes (${payments.length})`}
                            iconPosition="start"
                        />
                        <Tab
                            icon={<History />}
                            label="Histórico"
                            iconPosition="start"
                        />
                    </Tabs>
                </Paper>

                {/* Filtros (só no histórico) */}
                {tab === 1 && (
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, sm: 2 }}>
                                <TextField
                                    type="date"
                                    label="Data início"
                                    value={filters.startDate || ''}
                                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                    size="small"
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                                <TextField
                                    type="date"
                                    label="Data fim"
                                    value={filters.endDate || ''}
                                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                    size="small"
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Método</InputLabel>
                                    <Select
                                        value={filters.method}
                                        onChange={(e) => handleFilterChange('method', e.target.value)}
                                    >
                                        <MenuItem value="">Todos</MenuItem>
                                        <MenuItem value="CASH">Numerário</MenuItem>
                                        <MenuItem value="BANK_TRANSFER">Transferência</MenuItem>
                                        <MenuItem value="MUNICIPALITY">Municípios</MenuItem>
                                        <MenuItem value="MBWAY">MB WAY</MenuItem>
                                        <MenuItem value="MULTIBANCO">Multibanco</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Estado</InputLabel>
                                    <Select
                                        value={filters.status}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                    >
                                        <MenuItem value="">Todos</MenuItem>
                                        <MenuItem value="SUCCESS">Aprovado</MenuItem>
                                        <MenuItem value="DECLINED">Rejeitado</MenuItem>
                                        <MenuItem value="PENDING_VALIDATION">Pendente</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                                <Button
                                    variant="outlined"
                                    onClick={clearFilters}
                                    fullWidth
                                >
                                    Limpar
                                </Button>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => queryClient.invalidateQueries({ queryKey: ['paymentHistory'] })}
                                    fullWidth
                                >
                                    Filtrar
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>
                )}

                {/* Stats (só pendentes) */}
                {tab === 0 && (
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Schedule sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                                    <Typography variant="h4">{payments.length}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Pendentes
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Euro sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                                    <Typography variant="h4">
                                        €{payments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Button
                                        variant="contained"
                                        startIcon={isLoadingPending ? null : <Refresh />}
                                        onClick={fetchPendingPayments}
                                        disabled={isLoadingPending}
                                        fullWidth
                                    >
                                        {isLoadingPending ? 'A carregar...' : 'Actualizar'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {(error || (tab === 1 && historyData?.error)) && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {/* Tabela */}
                <Paper elevation={2}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Documento</TableCell>
                                    <TableCell>Método</TableCell>
                                    {tab === 1 && <TableCell>Estado</TableCell>}
                                    <TableCell align="right">Valor</TableCell>
                                    <TableCell>Data</TableCell>
                                    <TableCell align="center">Acções</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(isLoadingPending && tab === 0) || (isLoadingHistory && tab === 1) ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : currentData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={tab === 1 ? 6 : 5} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">
                                                {tab === 0 ? 'Nenhum pagamento pendente' : 'Nenhum registo encontrado'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    currentData.map((payment) => (
                                        <TableRow key={payment.pk} hover>
                                            <TableCell>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {payment.regnumber || payment.order_id}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {payment.document_descr || 'Sem descrição'}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={payment.payment_method}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: `${PAYMENT_STATUS_COLORS[payment.payment_method] || 'grey.300'}`,
                                                        color: 'white'
                                                    }}
                                                />
                                            </TableCell>
                                            {tab === 1 && (
                                                <TableCell>
                                                    <Chip
                                                        label={payment.payment_status}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: `${PAYMENT_STATUS_COLORS[payment.payment_status] || 'grey.300'}`,
                                                            color: 'white'
                                                        }}
                                                    />
                                                </TableCell>
                                            )}
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={600}>
                                                    €{Number(payment.amount || 0).toFixed(2)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {new Date(payment.created_at).toLocaleDateString('pt-PT')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    onClick={() => handleDetailsClick(payment)}
                                                    color="primary"
                                                >
                                                    <Visibility />
                                                </IconButton>
                                                {tab === 0 && (
                                                    <IconButton
                                                        onClick={() => {
                                                            setSelectedPayment(payment);
                                                            setConfirmOpen(true);
                                                        }}
                                                        color="success"
                                                    >
                                                        <CheckCircle />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Paginação (só no histórico) */}
                    {tab === 1 && totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_, newPage) => setPage(newPage)}
                                color="primary"
                            />
                        </Box>
                    )}
                </Paper>
            </Box>

            {/* Modal Detalhes */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assignment />
                        Detalhes do Pagamento {selectedPayment?.regnumber && `- ${selectedPayment.regnumber}`}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedPayment && (
                        <Box>
                            {/* DADOS DO PAGAMENTO */}
                            <Paper sx={{ p: 2, mb: 3, bgcolor: 'success.light', color: 'white' }}>
                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Euro />
                                    Pagamento
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2">
                                            <strong>Valor Pago:</strong> €{Number(selectedPayment.amount || 0).toFixed(2)}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Typography variant="body2" component="span">
                                                <strong>Método:</strong>
                                            </Typography>
                                            <Chip label={selectedPayment.payment_method} size="small" />
                                        </Box>
                                        <Typography variant="body2" component="span">
                                            <strong>Estado:</strong>
                                            <Chip
                                                label={selectedPayment.payment_status}
                                                size="small"
                                            />
                                        </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2">
                                            <strong>ID Transação:</strong> {selectedPayment.transaction_id}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Order ID:</strong> {selectedPayment.order_id}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Data Criação:</strong> {new Date(selectedPayment.created_at).toLocaleString('pt-PT')}
                                        </Typography>
                                        {selectedPayment.updated_at && (
                                            <Typography variant="body2">
                                                <strong>Última Actualização:</strong> {new Date(selectedPayment.updated_at).toLocaleString('pt-PT')}
                                            </Typography>
                                        )}
                                    </Grid>
                                </Grid>
                            </Paper>

                            {/* VALIDAÇÃO */}
                            {(selectedPayment.validated_by || selectedPayment.validated_at) && (
                                <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light', color: 'white' }}>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircle />
                                        Validação
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Validado por:</strong> {selectedPayment.validator_name || `Utilizador ${selectedPayment.validated_by}`}
                                    </Typography>
                                    {selectedPayment.validated_at && (
                                        <Typography variant="body2">
                                            <strong>Data Validação:</strong> {new Date(selectedPayment.validated_at).toLocaleString('pt-PT')}
                                        </Typography>
                                    )}
                                </Paper>
                            )}

                            {/* DETALHES ESPECÍFICOS */}
                            {selectedPayment.payment_reference && (
                                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                    <Typography variant="h6" gutterBottom>
                                        Detalhes Específicos
                                    </Typography>
                                    {(() => {
                                        try {
                                            const ref = typeof selectedPayment.payment_reference === 'string'
                                                ? JSON.parse(selectedPayment.payment_reference)
                                                : selectedPayment.payment_reference;

                                            return (
                                                <Box>
                                                    {ref.payment_details && (
                                                        <Typography variant="body2" gutterBottom>
                                                            <strong>Referencia:</strong> {ref.payment_details}
                                                        </Typography>
                                                    )}
                                                    {ref.submitted_by && (
                                                        <Typography variant="body2" gutterBottom>
                                                            <strong>Submetido por:</strong> {selectedPayment.submitter_name || `Utilizador ${ref.submitted_by}`}
                                                        </Typography>
                                                    )}
                                                    {ref.submitted_at && (
                                                        <Typography variant="body2" gutterBottom>
                                                            <strong>Data Submissão:</strong> {new Date(ref.submitted_at).toLocaleString('pt-PT')}
                                                        </Typography>
                                                    )}
                                                    {ref.payment_type && (
                                                        <Typography variant="body2" gutterBottom>
                                                            <strong>Tipo:</strong> {ref.payment_type}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            );
                                        } catch (e) {
                                            return (
                                                <Paper sx={{ p: 1, bgcolor: 'grey.100' }}>
                                                    <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                                                        {selectedPayment.payment_reference}
                                                    </Typography>
                                                </Paper>
                                            );
                                        }
                                    })()}
                                </Paper>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
                    {tab === 0 && selectedPayment && (
                        <Button
                            variant="contained"
                            color="success"
                        onClick={() => { // Apenas abre o modal de confirmação
                                setDetailsOpen(false);
                                setConfirmOpen(true);
                            }}
                            startIcon={<CheckCircle />}
                        >
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
                    <Button
                        variant="contained"
                        onClick={() => approvePayment(selectedPayment.pk)}
                        color="success"
                        disabled={isApproving}
                    >
                        {isApproving ? 'A aprovar...' : 'Aprovar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default PaymentAdminPage;