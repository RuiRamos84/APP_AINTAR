import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Alert, Button, CircularProgress, Chip
} from '@mui/material';
import {
    CheckCircle, Error, Schedule, Refresh
} from '@mui/icons-material';
import paymentService from '../services/paymentService';

const statusConfig = {
    'SUCCESS': { icon: CheckCircle, color: 'success', label: 'Pago' },
    'PENDING': { icon: Schedule, color: 'warning', label: 'Pendente' },
    'PENDING_VALIDATION': { icon: Schedule, color: 'info', label: 'Aguarda validação' },
    'DECLINED': { icon: Error, color: 'error', label: 'Rejeitado' },
    'EXPIRED': { icon: Error, color: 'error', label: 'Expirado' }
};

const PaymentStatus = ({ transactionId, onComplete }) => {
    const [status, setStatus] = useState('PENDING');
    const [loading, setLoading] = useState(false);
    const [polling, setPolling] = useState(false);

    const checkStatus = async () => {
        if (!transactionId) return;

        setLoading(true);
        try {
            const result = await paymentService.checkStatus(transactionId);
            setStatus(result.payment_status || 'PENDING');
        } catch (error) {
            console.error('Erro verificação:', error);
        } finally {
            setLoading(false);
        }
    };

    // Polling automático para PENDING
    useEffect(() => {
        if (status === 'PENDING' && !polling) {
            setPolling(true);
            const interval = setInterval(checkStatus, 5000);
            return () => clearInterval(interval);
        }
    }, [status, transactionId]);

    // Config do status
    const config = statusConfig[status] || statusConfig['PENDING'];
    const StatusIcon = config.icon;

    const isComplete = ['SUCCESS', 'PENDING_VALIDATION'].includes(status);
    const isFailed = ['DECLINED', 'EXPIRED'].includes(status);

    return (
        <Box sx={{ textAlign: 'center', p: 3 }}>
            <StatusIcon
                sx={{ fontSize: 64, color: `${config.color}.main`, mb: 2 }}
            />

            <Typography variant="h5" gutterBottom>
                {config.label}
            </Typography>

            <Chip
                label={config.label}
                color={config.color}
                sx={{ mb: 3 }}
            />

            {status === 'PENDING' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    A verificar estado do pagamento...
                </Alert>
            )}

            {status === 'PENDING_VALIDATION' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Pagamento registado. Aguarda validação.
                </Alert>
            )}

            {isFailed && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Pagamento não processado. Tente novamente.
                </Alert>
            )}

            <Box sx={{ mt: 3 }}>
                {!isComplete && (
                    <Button
                        variant="outlined"
                        onClick={checkStatus}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
                        sx={{ mr: 1 }}
                    >
                        Verificar
                    </Button>
                )}

                {isComplete && (
                    <Button
                        variant="contained"
                        onClick={() => onComplete?.({ status, transactionId })}
                    >
                        Concluir
                    </Button>
                )}
            </Box>
        </Box>
    );
};

export default PaymentStatus;