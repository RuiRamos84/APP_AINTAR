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
    useTheme,
    Tooltip
} from '@mui/material';
import {
    CheckCircle as ApproveIcon,
    Visibility as ViewIcon,
    Refresh as RefreshIcon,
    Warning as WarningIcon,
    Description as DocumentIcon,
    Person as PersonIcon
} from '@mui/icons-material';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS } from '../services/paymentTypes';
import paymentService from '../services/paymentService';

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
    const [approving, setApproving] = useState(false);

    // Verificar autorização do utilizador
    useEffect(() => {
        const isAuthorized = userInfo &&
            ['0', '1', '2'].includes(userInfo.profil) &&
            [12, 16].includes(Number(userInfo.user_id));

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
            const response = await paymentService.getPendingPayments();

            if (response.success) {
                setPayments(response.payments);
            } else {
                setError(response.error || 'Não foi possível carregar os pagamentos pendentes');
            }
        } catch (err) {
            console.error('Erro ao obter pagamentos pendentes:', err);
            setError('Erro ao carregar pagamentos pendentes');
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
        }).format(amount || 0);
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

        setApproving(true);
        setError(null);

        try {
            const result = await paymentService.approvePayment(selectedPayment.pk);

            if (result.success) {
                // Remover o pagamento aprovado da lista
                setPayments(prevPayments =>
                    prevPayments.filter(p => p.pk !== selectedPayment.pk)
                );
                setConfirmOpen(false);
                setDetailsOpen(false);

                // Disparar evento para atualizar documentos se necessário
                if (selectedPayment.document_id) {
                    window.dispatchEvent(new CustomEvent('document-updated', {
                        detail: { documentId: selectedPayment.document_id }
                    }));
                }
            } else {
                throw new Error(result.error || 'Não foi possível aprovar o pagamento');
            }
        } catch (err) {
            console.error('Erro ao aprovar pagamento:', err);
            setError('Erro ao aprovar pagamento: ' + err.message);
        } finally {
            setApproving(false);
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

        return (
            <Box>
                {/* Informações do documento */}
                {selectedPayment.document_regnumber && (
                    <Card variant="outlined" sx={{ mb: 2 }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <DocumentIcon fontSize="small" color="primary" />
                                <Typography variant="subtitle1" fontWeight="bold">
                                    Documento Associado
                                </Typography>
                            </Box>
                            <Typography variant="body2">
                                <strong>Nº Registo:</strong> {selectedPayment.document_regnumber}
                            </Typography>
                            {selectedPayment.document_descr && (
                                <Typography variant="body2">
                                    <strong>Descrição:</strong> {selectedPayment.document_descr}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Informações do pagamento */}
                {selectedPayment.payment_method === PAYMENT_METHODS.CASH && (
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Informações de Referência
                        </Typography>
                        <Typography variant="body1" paragraph>
                            {referenceDetails.referenceInfo || 'N/A'}
                        </Typography>
                        {selectedPayment.submitted_by_name && (
                            <Box display="flex" alignItems="center" gap={1} mt={2}>
                                <PersonIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                    Submetido por: <strong>{selectedPayment.submitted_by_name}</strong>
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}

                {selectedPayment.payment_method === PAYMENT_METHODS.BANK_TRANSFER && (
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Detalhes da Transferência
                        </Typography>

                        <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Referência:</strong> {referenceDetails.transferReference || 'N/A'}
                        </Typography>

                        <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Data:</strong> {referenceDetails.transferDate || 'N/A'}
                        </Typography>

                        {referenceDetails.bankInfo && (
                            <Box mt={2}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Dados Bancários Utilizados
                                </Typography>
                                <Typography variant="body2">
                                    <strong>IBAN:</strong> {referenceDetails.bankInfo.iban || 'N/A'}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Banco:</strong> {referenceDetails.bankInfo.bankName || 'N/A'}
                                </Typography>
                            </Box>
                        )}

                        {selectedPayment.submitted_by_name && (
                            <Box display="flex" alignItems="center" gap={1} mt={2}>
                                <PersonIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                    Submetido por: <strong>{selectedPayment.submitted_by_name}</strong>
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        );
    };

    // Se o utilizador não tem autorização
    if (!authorized) {
        return (
            <Box>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <WarningIcon color="warning" sx={{ fontSize: 64, mb: 2 }} />
                    <Typography variant="h5" gutterBottom color="warning.main">
                        Acesso Negado
                    </Typography>
                    <Typography variant="body1">
                        Não tem permissão para aprovar pagamentos. Esta funcionalidade é restrita a utilizadores específicos da contabilidade.
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
                    Actualizar
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
                        Não há pagamentos pendentes de validação neste momento.
                    </Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Documento</TableCell>
                                <TableCell>Método</TableCell>
                                <TableCell>Valor</TableCell>
                                <TableCell>Data</TableCell>
                                <TableCell>Submetido por</TableCell>
                                <TableCell align="right">Acções</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {payments.map((payment) => (
                                <TableRow key={payment.pk} hover>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2" fontWeight="medium">
                                                {payment.document_regnumber || payment.order_id}
                                            </Typography>
                                            {payment.document_descr && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {payment.document_descr}
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
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
                                        {payment.submitted_by_name || '-'}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Ver detalhes">
                                            <IconButton
                                                color="info"
                                                onClick={() => handleViewDetails(payment)}
                                                size="small"
                                                sx={{ mr: 1 }}
                                            >
                                                <ViewIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Aprovar pagamento">
                                            <IconButton
                                                color="success"
                                                onClick={() => handleApproveClick(payment)}
                                                size="small"
                                            >
                                                <ApproveIcon />
                                            </IconButton>
                                        </Tooltip>
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
                                        Identificador
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
                                            Data do Registo
                                        </Typography>
                                        <Typography variant="body1">
                                            {formatDate(selectedPayment.created_at)}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>

                            {renderPaymentDetails()}

                            <Box display="flex" justifyContent="flex-end" mt={3}>
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
                onClose={() => !approving && setConfirmOpen(false)}
            >
                <DialogTitle>
                    Confirmar Aprovação
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Tem a certeza que deseja aprovar este pagamento?
                        {selectedPayment && (
                            <>
                                <br /><br />
                                <strong>Documento:</strong> {selectedPayment.document_regnumber || selectedPayment.order_id}<br />
                                <strong>Valor:</strong> {formatAmount(selectedPayment.amount)}<br />
                                <strong>Método:</strong> {PAYMENT_METHOD_LABELS[selectedPayment.payment_method]}
                            </>
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setConfirmOpen(false)}
                        disabled={approving}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleApprovePayment}
                        variant="contained"
                        color="success"
                        disabled={approving || !authorized}
                        startIcon={approving ? <CircularProgress size={20} /> : <ApproveIcon />}
                    >
                        {approving ? 'A processar...' : 'Aprovar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PaymentApproval;