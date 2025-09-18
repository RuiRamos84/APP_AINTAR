import React, { useState, useEffect } from 'react';
import {
    Box, Button, TextField, Typography, Alert, CircularProgress
} from '@mui/material';
import { Euro as CashIcon } from '@mui/icons-material';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { useMutation } from '@tanstack/react-query';
import paymentService from '../services/paymentService';

const CashPayment = ({ onSuccess, userInfo, documentId, amount }) => {
    const [reference, setReference] = useState('');
    const [error, setError] = useState('');
    const { hasPermission } = usePermissionContext();
    const [canProcess, setCanProcess] = useState(false);

    const { mutate: registerPayment, isLoading } = useMutation({
        mutationFn: (paymentData) => paymentService.processManual(
            paymentData.documentId,
            paymentData.amount,
            'CASH',
            paymentData.reference
        ),
        onSuccess: (result) => onSuccess?.(result),
        onError: (err) => setError(err.message || 'Ocorreu um erro ao registar o pagamento.'),
    });

    useEffect(() => {
        setCanProcess(hasPermission(4)); // ID 4 = 'payments.cash.process'
    }, [hasPermission]);

    const handlePay = () => {
        if (!reference.trim()) {
            setError('Informação de referência obrigatória');
            return;
        }

        setError('');
        registerPayment({
            documentId,
            amount,
            reference: reference.trim()
        });
    };

    if (!canProcess) {
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
                    €{Number(amount || 0).toFixed(2)}
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
                disabled={isLoading || !reference.trim()}
                startIcon={isLoading ? <CircularProgress size={20} /> : <CashIcon />}
                sx={{
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #3dd96b 0%, #2fe9c7 100%)'
                    }
                }}
            >
                {isLoading ? 'A registar...' : 'Registar Pagamento'}
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