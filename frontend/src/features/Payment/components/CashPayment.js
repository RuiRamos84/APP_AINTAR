import React, { useState, useContext } from 'react';
import {
    Box, Button, TextField, Typography, Alert, CircularProgress
} from '@mui/material';
import { Euro as CashIcon } from '@mui/icons-material';
import { PaymentContext } from '../context/PaymentContext';

const CashPayment = ({ onSuccess, userInfo }) => {
    const { state, payManual } = useContext(PaymentContext);
    const [reference, setReference] = useState('');
    const [error, setError] = useState('');

    // Verificar permissão
    const hasPermission = userInfo && ['0', '1'].includes(userInfo.profil);

    const handlePay = async () => {
        if (!reference.trim()) {
            setError('Informação de referência obrigatória');
            return;
        }

        setError('');
        try {
            const result = await payManual('CASH', { reference_info: reference });
            onSuccess?.(result);
        } catch (err) {
            setError(err.message);
        }
    };

    if (!hasPermission) {
        return (
            <Alert severity="warning" sx={{ m: 3 }}>
                Sem permissão para este método de pagamento.
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
            </Box>

            <TextField
                fullWidth
                label="Informação de referência"
                multiline
                rows={3}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: Pagamento em dinheiro na sede"
                sx={{ mb: 2 }}
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
            >
                {state.loading ? 'A registar...' : 'Registar Pagamento'}
            </Button>

            <Alert severity="info" sx={{ mt: 2 }}>
                Este pagamento necessita validação posterior.
            </Alert>
        </Box>
    );
};

export default CashPayment;