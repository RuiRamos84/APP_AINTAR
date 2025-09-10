import React, { useState, useContext } from 'react';
import {
    Box, Button, TextField, Typography, Alert, CircularProgress
} from '@mui/material';
import { Euro as CashIcon } from '@mui/icons-material';
import { PaymentContext } from '../context/PaymentContext';
import { canProcessCashPayments, PAYMENT_METHODS } from '../services/paymentTypes';

const CashPayment = ({ onSuccess, userInfo }) => {
    const { state, payManual } = useContext(PaymentContext);
    const [reference, setReference] = useState('');
    const [error, setError] = useState('');

    // ===== USAR GESTÃO CENTRALIZADA =====
    const hasPermission = canProcessCashPayments(userInfo?.user_id);

    const handlePay = async () => {
        if (!reference.trim()) {
            setError('Informação de referência obrigatória');
            return;
        }

        setError('');
        try {
            const result = await payManual('CASH', reference.trim());
            onSuccess?.(result);
        } catch (err) {
            setError(err.message);
        }
    };

    if (!hasPermission) {
        return (
            <Alert severity="warning" sx={{ m: 3 }}>
                Sem permissão para pagamento em numerário.
            </Alert>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <CashIcon sx={{ fontSize: 48, color: 'success.main' }} />
                <Typography variant="h6">Pagamento em Numerário</Typography>
                <Typography variant="body2" color="text.secondary">
                    Registo de pagamento em dinheiro
                </Typography>
                <Typography variant="h6" color="primary" sx={{ mt: 1, fontWeight: 600 }}>
                    €{Number(state.amount || 0).toFixed(2)}
                </Typography>
            </Box>

            <TextField
                fullWidth
                label="Informação de referência"
                multiline
                rows={3}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: Pagamento em dinheiro recebido na sede, recibo nº 123"
                sx={{ mb: 2 }}
                helperText="Descreva as circunstâncias do pagamento para facilitar a validação"
            />

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Button
                fullWidth
                variant="contained"
                onClick={handlePay}
                disabled={state.loading || !reference.trim()}
                startIcon={state.loading ? <CircularProgress size={20} /> : <CashIcon />}
                sx={{
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #3dd96b 0%, #2fe9c7 100%)'
                    }
                }}
            >
                {state.loading ? 'A registar...' : 'Registar Pagamento'}
            </Button>

            <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                    <strong>Importante:</strong><br />
                    • Este pagamento requer validação posterior<br />
                    • Forneça informações detalhadas para agilizar a aprovação<br />
                    • O documento ficará pendente até à validação
                </Typography>
            </Alert>
        </Box>
    );
};

export default CashPayment;