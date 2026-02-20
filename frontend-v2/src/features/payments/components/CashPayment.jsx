import React, { useState } from 'react';
import {
    Box, Button, TextField, Typography, Alert, CircularProgress, Avatar, Fade, Paper
} from '@mui/material';
import { Euro as CashIcon, Receipt as ReceiptIcon } from '@mui/icons-material';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { useMutation } from '@tanstack/react-query';
import paymentService from '../services/paymentService';

const CashPayment = ({ onSuccess, documentId, amount }) => {
    const [reference, setReference] = useState('');
    const [error, setError] = useState('');
    const { hasPermission } = usePermissionContext();

    const canProcess = hasPermission(730); // payments.cash.action

    const { mutate: registerPayment, isLoading } = useMutation({
        mutationFn: () => paymentService.processManual(documentId, amount, 'CASH', reference.trim()),
        onSuccess: (result) => onSuccess?.(result),
        onError: (err) => setError(err.message || 'Ocorreu um erro ao registar o pagamento.'),
    });

    const handlePay = () => {
        if (!reference.trim()) {
            setError('Informação de referência obrigatória');
            return;
        }
        setError('');
        registerPayment();
    };

    if (!canProcess) {
        return (
            <Alert severity="warning" sx={{ m: 3 }}>
                Sem permissão para pagamento em numerário.
            </Alert>
        );
    }

    return (
        <Fade in>
            <Box sx={{ maxWidth: 500, mx: 'auto', p: 3 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Avatar sx={{
                        width: 80, height: 80, mx: 'auto', mb: 2,
                        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                    }}>
                        <CashIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                        Pagamento em Numerário
                    </Typography>
                    <Paper sx={{
                        p: 2, mt: 2,
                        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                        color: 'white', borderRadius: 3
                    }}>
                        <Typography variant="h4" sx={{ fontWeight: 600 }}>
                            €{Number(amount || 0).toFixed(2)}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>Valor a registar</Typography>
                    </Paper>
                </Box>

                <TextField
                    fullWidth
                    label="Informação de referência"
                    multiline
                    rows={3}
                    value={reference}
                    onChange={(e) => { setReference(e.target.value); setError(''); }}
                    placeholder="Ex: Pagamento em dinheiro recebido na sede, recibo nº 123"
                    sx={{ mb: 2 }}
                    helperText="Descreva as circunstâncias do pagamento para facilitar a validação"
                />

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handlePay}
                    disabled={isLoading || !reference.trim()}
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <ReceiptIcon />}
                    sx={{
                        py: 1.5,
                        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #3dd96b 0%, #2fe9c7 100%)' }
                    }}
                >
                    {isLoading ? 'A registar...' : 'Registar Pagamento'}
                </Button>

                <Alert severity="info" sx={{ mt: 2 }} icon={false}>
                    <Typography variant="body2">
                        <strong>Importante:</strong><br />
                        • Este pagamento requer validação posterior<br />
                        • Forneça informações detalhadas para agilizar a aprovação<br />
                        • O documento ficará pendente até à validação
                    </Typography>
                </Alert>
            </Box>
        </Fade>
    );
};

export default CashPayment;
