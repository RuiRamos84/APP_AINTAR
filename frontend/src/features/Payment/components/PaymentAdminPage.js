import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Paper, Box, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Alert,
    Grid, Card, CardContent, Avatar, Tabs, Tab, TextField,
    Select, MenuItem, FormControl, InputLabel, Pagination
} from '@mui/material';
import {
    CheckCircle, Visibility, Refresh, Assignment, Schedule,
    Euro, FilterList, History
} from '@mui/icons-material';
import paymentService from '../services/paymentService';

const statusColors = {
    'PENDING_VALIDATION': 'warning',
    'SUCCESS': 'success',
    'DECLINED': 'error',
    'CASH': 'success',
    'BANK_TRANSFER': 'info',
    'MUNICIPALITY': 'primary'
};

const PaymentAdminPage = ({ userInfo }) => {
    const [tab, setTab] = useState(0);
    const [payments, setPayments] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    // Filtros
    const [filters, setFilters] = useState({
        startDate: null,
        endDate: null,
        method: '',
        status: '',
        user: ''
    });

    // Paginação
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;

    const hasPermission = userInfo && [12, 16].includes(Number(userInfo.user_id));

    const fetchPendingPayments = async () => {
        setLoading(true);
        try {
            const result = await paymentService.getPendingPayments();
            // Filtrar apenas PENDING_VALIDATION
            const pending = result.success ?
                result.payments.filter(p => p.payment_status === 'PENDING_VALIDATION') : [];
            setPayments(pending);
            setError(result.success ? '' : result.error);
        } catch (err) {
            setError('Erro ao carregar pendentes');
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentHistory = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                page_size: pageSize,
                ...filters,
                start_date: filters.startDate || null,
                end_date: filters.endDate || null,
                exclude_pending: true  // Excluir PENDING_VALIDATION
            };

            const result = await paymentService.getPaymentHistory(params);
            setHistory(result.success ? result.payments : []);
            setTotalPages(Math.ceil((result.total || 0) / pageSize));
            setError(result.success ? '' : result.error);
        } catch (err) {
            setError('Erro ao carregar histórico');
        } finally {
            setLoading(false);
        }
    };

    const approvePayment = async () => {
        try {
            await paymentService.approvePayment(selectedPayment.pk);
            setPayments(prev => prev.filter(p => p.pk !== selectedPayment.pk));
            setConfirmOpen(false);
            setSelectedPayment(null);
        } catch (err) {
            setError('Erro na aprovação');
        }
    };

    const handleTabChange = (_, newTab) => {
        setTab(newTab);
        setPage(1);
        if (newTab === 1) fetchPaymentHistory();
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPage(1);
    };

    const applyFilters = () => {
        if (tab === 1) fetchPaymentHistory();
    };

    const clearFilters = () => {
        setFilters({ startDate: null, endDate: null, method: '', status: '', user: '' });
        setPage(1);
    };

    useEffect(() => {
        if (hasPermission && tab === 0) fetchPendingPayments();
    }, [hasPermission, tab]);

    useEffect(() => {
        if (tab === 1) fetchPaymentHistory();
    }, [page]);

    if (!hasPermission) {
        return (
            <Container>
                <Alert severity="warning" sx={{ mt: 3 }}>
                    Acesso negado.
                </Alert>
            </Container>
        );
    }

    const currentData = tab === 0 ? payments : history;

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
                            <Grid item xs={12} sm={2}>
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
                            <Grid item xs={12} sm={2}>
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
                            <Grid item xs={12} sm={2}>
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
                            <Grid item xs={12} sm={2}>
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
                            <Grid item xs={12} sm={2}>
                                <Button
                                    variant="contained"
                                    onClick={applyFilters}
                                    startIcon={<FilterList />}
                                    fullWidth
                                >
                                    Filtrar
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={2}>
                                <Button
                                    variant="outlined"
                                    onClick={clearFilters}
                                    fullWidth
                                >
                                    Limpar
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>
                )}

                {/* Stats (só pendentes) */}
                {tab === 0 && (
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={4}>
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
                        <Grid item xs={12} sm={4}>
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
                        <Grid item xs={12} sm={4}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Button
                                        variant="contained"
                                        startIcon={loading ? null : <Refresh />}
                                        onClick={fetchPendingPayments}
                                        disabled={loading}
                                        fullWidth
                                    >
                                        {loading ? 'A carregar...' : 'Actualizar'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {error && (
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
                                {currentData.length === 0 ? (
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
                                                    color={statusColors[payment.payment_method] || 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            {tab === 1 && (
                                                <TableCell>
                                                    <Chip
                                                        label={payment.payment_status}
                                                        color={statusColors[payment.payment_status] || 'default'}
                                                        size="small"
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
                                                    onClick={() => {
                                                        setSelectedPayment(payment);
                                                        setDetailsOpen(true);
                                                    }}
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
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Detalhes do Pagamento</DialogTitle>
                <DialogContent>
                    {selectedPayment && (
                        <Box>
                            <Typography variant="body2" gutterBottom>
                                <strong>Documento:</strong> {selectedPayment.regnumber}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                                <strong>Descrição:</strong> {selectedPayment.document_descr || 'Sem descrição'}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                                <strong>Valor:</strong> €{Number(selectedPayment.amount || 0).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                                <strong>Método:</strong> {selectedPayment.payment_method}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                                <strong>Estado:</strong> {selectedPayment.payment_status}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                                <strong>Data:</strong> {new Date(selectedPayment.created_at).toLocaleString('pt-PT')}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                                <strong>ID Transação:</strong> {selectedPayment.transaction_id}
                            </Typography>

                            {selectedPayment.payment_reference && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                        <strong>Detalhes:</strong>
                                    </Typography>
                                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                        {(() => {
                                            try {
                                                const ref = typeof selectedPayment.payment_reference === 'string'
                                                    ? JSON.parse(selectedPayment.payment_reference)
                                                    : selectedPayment.payment_reference;

                                                return (
                                                    <Box>
                                                        {ref.payment_details?.reference_info && (
                                                            <Typography variant="body2">
                                                                <strong>Info:</strong> {ref.payment_details.reference_info}
                                                            </Typography>
                                                        )}
                                                        {ref.submitted_by && (
                                                            <Typography variant="body2">
                                                                <strong>Por:</strong> {ref.submitted_by}
                                                            </Typography>
                                                        )}
                                                        {ref.submitted_at && (
                                                            <Typography variant="body2">
                                                                <strong>Em:</strong> {new Date(ref.submitted_at).toLocaleString('pt-PT')}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                );
                                            } catch (e) {
                                                return (
                                                    <pre style={{ margin: 0, fontSize: '0.8rem' }}>
                                                        {selectedPayment.payment_reference}
                                                    </pre>
                                                );
                                            }
                                        })()}
                                    </Paper>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
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
                        onClick={approvePayment}
                        color="success"
                    >
                        Aprovar
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default PaymentAdminPage;