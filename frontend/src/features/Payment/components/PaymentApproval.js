import React, { useState, useEffect } from 'react';
import {
    Box, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, IconButton, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { CheckCircle, Visibility, Refresh } from '@mui/icons-material';
import paymentService from '../services/paymentService';

const statusColors = {
    'PENDING_VALIDATION': 'warning',
    'CASH': 'success',
    'BANK_TRANSFER': 'info',
    'MUNICIPALITY': 'primary'
};

const PaymentApproval = ({ userInfo }) => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    // Verificar permissões
    const hasPermission = userInfo && [12, 15].includes(Number(userInfo.user_id));

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const result = await paymentService.getPendingPayments();
            setPayments(result.success ? result.payments : []);
            setError(result.success ? '' : result.error);
        } catch (err) {
            setError('Erro ao carregar pagamentos');
        } finally {
            setLoading(false);
        }
    };

    const approvePayment = async () => {
        try {
            await paymentService.approvePayment(selectedPayment.pk);
            setPayments(prev => prev.filter(p => p.pk !== selectedPayment.pk));
            setConfirmOpen(false);
        } catch (err) {
            setError('Erro na aprovação');
        }
    };

    useEffect(() => {
        if (hasPermission) fetchPayments();
    }, [hasPermission]);

    if (!hasPermission) {
        return <Alert severity="warning">Sem permissão</Alert>;
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" mb={2}>
                <h3>Pagamentos Pendentes</h3>
                <Button startIcon={<Refresh />} onClick={fetchPayments}>
                    Actualizar
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Documento</TableCell>
                            <TableCell>Método</TableCell>
                            <TableCell>Valor</TableCell>
                            <TableCell>Data</TableCell>
                            <TableCell>Acções</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {payments.map((payment) => (
                            <TableRow key={payment.pk}>
                                <TableCell>{payment.document_regnumber}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={payment.payment_method}
                                        color={statusColors[payment.payment_method]}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>€{payment.amount}</TableCell>
                                <TableCell>
                                    {new Date(payment.created_at).toLocaleDateString('pt-PT')}
                                </TableCell>
                                <TableCell>
                                    <IconButton onClick={() => setSelectedPayment(payment)}>
                                        <Visibility />
                                    </IconButton>
                                    <IconButton
                                        color="success"
                                        onClick={() => {
                                            setSelectedPayment(payment);
                                            setConfirmOpen(true);
                                        }}
                                    >
                                        <CheckCircle />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Confirmação */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Confirmar Aprovação</DialogTitle>
                <DialogContent>
                    Aprovar pagamento de €{selectedPayment?.amount}?
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={approvePayment}>
                        Aprovar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PaymentApproval;