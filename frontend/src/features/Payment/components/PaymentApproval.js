import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Alert,
    useTheme
} from '@mui/material';
import {
    CheckCircle as ApproveIcon,
    Visibility as ViewIcon,
    Refresh as RefreshIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS } from '../services/paymentTypes';
import paymentService from '../services/paymentService';

/**
 * Componente para aprovação de pagamentos manuais (admin)
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.userInfo - Informações do usuário atual
 */
const PaymentApproval = ({ userInfo }) => {
    const theme = useTheme();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [authorized, setAuthorized] = useState(false);

    // Verificar autorização do usuário
    useEffect(() => {
        // Checar se o usuário tem permissão para aprovar pagamentos
        // Precisa ter profil 0, 1 ou 2 E user_id 15 ou 16
        const isAuthorized =
            userInfo &&
            ['0', '1', '2'].includes(userInfo.profil) &&
            [15, 16].includes(Number(userInfo.user_id));

        setAuthorized(isAuthorized);

        if (isAuthorized) {
            fetchPendingPayments();
        }
    }, [userInfo]);

    // Buscar pagamentos pendentes de validação
    const fetchPendingPayments = async () => {
        if (!authorized) return;

        setLoading(true);
        setError(null);

        try {
            // Em um cenário real, você chamaria a API para obter os pagamentos pendentes
            // const response = await paymentService.getPendingPayments();

            // Mock de dados para demonstração
            const mockPayments = [
                {
                    pk: 1,
                    order_id: 'ORD-2023-001',
                    transaction_id: 'MANUAL-123456',
                    amount: 150.00,
                    payment_method: PAYMENT_METHODS.CASH,
                    payment_status: PAYMENT_STATUS.PENDING_VALIDATION,
                    created_at: '2023-04-22T14:30:00',
                    payment_reference: JSON.stringify({
                        referenceInfo: 'Pagamento em dinheiro na sede'
                    }),
                    entity: 'MANUAL'
                },
                {
                    pk: 2,
                    order_id: 'ORD-2023-002',
                    transaction_id: 'MANUAL-234567',
                    amount: 299.99,
                    payment_method: PAYMENT_METHODS.BANK_TRANSFER,
                    payment_status: PAYMENT_STATUS.PENDING_VALIDATION,
                    created_at: '2023-04-22T15:45:00',
                    payment_reference: JSON.stringify({
                        transferReference: 'REF123456',
                        transferDate: '2023-04-22'
                    }),
                    entity: 'MANUAL'
                }
            ];

            setPayments(mockPayments);
        } catch (err) {
            console.error('Erro ao obter pagamentos pendentes:', err);
            setError('Não foi possível carregar os pagamentos pendentes');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Formatar data
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';

        const date = new Date(dateString);
        return date.toLocaleString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Formatar valor
    const formatAmount = (amount) => {
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    // Abrir modal de detalhes do pagamento
    const handleViewDetails = (payment) => {
        setSelectedPayment(payment);
        setDetailsOpen(true);
    };

    // Abrir confirmação de aprovação
    const handleApproveClick = (payment) => {
        if (!authorized) return;

        setSelectedPayment(payment);
        setConfirmOpen(true);
    };

    // Aprovar pagamento
    const handleApprovePayment = async () => {
        if (!authorized || !selectedPayment) return;

        setLoading(true);
        setError(null);

        try {
            // Em um ambiente real, você chamaria o serviço de aprovação
            const result = await paymentService.approvePayment(selectedPayment.pk);

            if (result.success) {
                // Remover o pagamento aprovado da lista
                setPayments(payments.filter(p => p.pk !== selectedPayment.pk));
                setConfirmOpen(false);

                // Em um aplicativo real, você poderia mostrar uma notificação de sucesso
            } else {
                throw new Error(result.error || 'Não foi possível aprovar o pagamento');
            }
        } catch (err) {
            console.error('Erro ao aprovar pagamento:', err);
            setError('Erro ao aprovar pagamento: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Renderizar detalhes do pagamento com base no método
    const renderPaymentDetails = () => {
        if (!selectedPayment) return null;

        let referenceDetails = {};
        try {
            referenceDetails = JSON.parse(selectedPayment.payment_reference);
        } catch (err) {
            console.error('Erro ao analisar referência:', err);
            referenceDetails = { error: 'Erro ao analisar dados de referência' };
        }

        switch (selectedPayment.payment_method) {
            case PAYMENT_METHODS.CASH:
                return (
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Informações de Referência
                        </Typography>
                        <Typography variant="body1" paragraph>
                            {referenceDetails.referenceInfo || 'N/A'}
                        </Typography>
                    </Box>
                );

            case PAYMENT_METHODS.BANK_TRANSFER:
                return (
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Detalhes da Transferência
                        </Typography>

                        <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Referência:</strong> {referenceDetails.transferReference || 'N/A'}
                        </Typography>

                        <Typography variant="body2">
                            <strong>Data:</strong> {referenceDetails.transferDate || 'N/A'}
                        </Typography>
                    </Box>
                );

            default:
                return (
                    <Typography variant="body2" color="text.secondary">
                        Detalhes não disponíveis para este método de pagamento.
                    </Typography>
                );
        }
    };

    // Se o usuário não tem autorização, mostrar mensagem de acesso negado
    if (!authorized) {
        return (
            <Box>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <WarningIcon color="warning" sx={{ fontSize: 64, mb: 2 }} />
                    <Typography variant="h5" gutterBottom color="warning.main">
                        Acesso Negado
                    </Typography>
                    <Typography variant="body1">
                        Você não tem permissão para aprovar pagamentos. Esta funcionalidade é restrita a administradores específicos.
                    </Typography>
                </Paper>
            </Box>
        );
    }

    if (loading && payments.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5">
                    Pagamentos Pendentes de Validação
                </Typography>

                <Button
                    startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                    onClick={() => {
                        setRefreshing(true);
                        fetchPendingPayments();
                    }}
                    disabled={refreshing}
                >
                    Atualizar
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {payments.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                        Não há pagamentos pendentes de validação no momento.
                    </Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID do Pedido</TableCell>
                                <TableCell>Método</TableCell>
                                <TableCell>Valor</TableCell>
                                <TableCell>Data</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {payments.map((payment) => (
                                <TableRow key={payment.pk}>
                                    <TableCell>{payment.order_id}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={PAYMENT_METHOD_LABELS[payment.payment_method]}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>{formatAmount(payment.amount)}</TableCell>
                                    <TableCell>{formatDate(payment.created_at)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label="Pendente Validação"
                                            size="small"
                                            color="warning"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            color="info"
                                            onClick={() => handleViewDetails(payment)}
                                            size="small"
                                            sx={{ mr: 1 }}
                                        >
                                            <ViewIcon />
                                        </IconButton>
                                        <IconButton
                                            color="success"
                                            onClick={() => handleApproveClick(payment)}
                                            size="small"
                                        >
                                            <ApproveIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Modal de detalhes do pagamento */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Detalhes do Pagamento
                </DialogTitle>
                <DialogContent>
                    {selectedPayment && (
                        <Box>
                            <Card variant="outlined" sx={{ mb: 2 }}>
                                <CardContent>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Pedido
                                    </Typography>
                                    <Typography variant="h6" gutterBottom>
                                        {selectedPayment.order_id}
                                    </Typography>

                                    <Box display="flex" justifyContent="space-between" mt={2}>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                Método
                                            </Typography>
                                            <Chip
                                                label={PAYMENT_METHOD_LABELS[selectedPayment.payment_method]}
                                                color="primary"
                                            />
                                        </Box>

                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                Valor
                                            </Typography>
                                            <Typography variant="h6" color="primary.main">
                                                {formatAmount(selectedPayment.amount)}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box mt={3}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Data do Registro
                                        </Typography>
                                        <Typography variant="body1">
                                            {formatDate(selectedPayment.created_at)}
                                        </Typography>
                                    </Box>

                                    <Box mt={3}>
                                        {renderPaymentDetails()}
                                    </Box>
                                </CardContent>
                            </Card>

                            <Box display="flex" justifyContent="flex-end">
                                <Button
                                    variant="contained"
                                    color="success"
                                    startIcon={<ApproveIcon />}
                                    onClick={() => {
                                        setDetailsOpen(false);
                                        handleApproveClick(selectedPayment);
                                    }}
                                    disabled={!authorized}
                                >
                                    Aprovar Pagamento
                                </Button>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de confirmação */}
            <Dialog
                open={confirmOpen}
                onClose={() => !loading && setConfirmOpen(false)}
            >
                <DialogTitle>
                    Confirmar Aprovação
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Tem certeza que deseja aprovar este pagamento?
                        {selectedPayment && (
                            <>
                                <br /><br />
                                <strong>Pedido:</strong> {selectedPayment.order_id}<br />
                                <strong>Valor:</strong> {selectedPayment && formatAmount(selectedPayment.amount)}<br />
                                <strong>Método:</strong> {selectedPayment && PAYMENT_METHOD_LABELS[selectedPayment.payment_method]}
                            </>
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setConfirmOpen(false)}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleApprovePayment}
                        variant="contained"
                        color="success"
                        disabled={loading || !authorized}
                        startIcon={loading ? <CircularProgress size={20} /> : <ApproveIcon />}
                    >
                        {loading ? 'Processando...' : 'Aprovar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PaymentApproval;