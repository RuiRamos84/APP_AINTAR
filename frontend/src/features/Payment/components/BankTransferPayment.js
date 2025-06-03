import React, { useState, useContext } from 'react';
import {
    Box, Button, TextField, Typography, Alert, CircularProgress,
    Paper, InputAdornment
} from '@mui/material';
import { AccountBalance as BankIcon } from '@mui/icons-material';
import { PaymentContext } from '../context/PaymentContext';

const BankTransferPayment = ({ onSuccess, userInfo }) => {
    const { state, payManual } = useContext(PaymentContext);
    const [formData, setFormData] = useState({
        accountHolder: '',
        iban: '',
        transferDate: new Date().toISOString().split('T')[0],
        transferReference: '',
        notes: ''
    });
    const [error, setError] = useState('');

    const formatIBAN = (value) => {
        const clean = value.replace(/\s/g, '').toUpperCase();
        return clean.match(/.{1,4}/g)?.join(' ') || clean;
    };

    const handleChange = (field) => (e) => {
        const value = field === 'iban' ? formatIBAN(e.target.value) : e.target.value;
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = () => {
        if (!formData.accountHolder.trim()) return 'Nome do titular obrigatório';
        if (!formData.iban.trim() || formData.iban.replace(/\s/g, '').length < 15) return 'IBAN inválido';
        if (!formData.transferDate) return 'Data obrigatória';
        return null;
    };

    const handlePay = async () => {
        const validation = validateForm();
        if (validation) {
            setError(validation);
            return;
        }

        setError('');
        try {
            const result = await payManual('BANK_TRANSFER', formData);
            onSuccess?.(result);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                Transferência Bancária
            </Typography>

            {/* Dados para transferência */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light' }}>
                <Typography variant="subtitle2" gutterBottom>
                    <strong>Dados para transferência:</strong>
                </Typography>
                <Typography variant="body2">IBAN: PT50 0033 0000 4570 8378 2190 5</Typography>
                <Typography variant="body2">Titular: AINTAR</Typography>
                <Typography variant="body2">Valor: €{Number(state.amount || 0).toFixed(2)}</Typography>
                <Typography variant="body2">Referência: {state.documentId}</Typography>
            </Paper>

            {/* Formulário */}
            <TextField
                fullWidth
                required
                label="Titular da conta origem"
                value={formData.accountHolder}
                onChange={handleChange('accountHolder')}
                InputProps={{
                    startAdornment: <InputAdornment position="start"><BankIcon /></InputAdornment>
                }}
                sx={{ mb: 2 }}
            />

            <TextField
                fullWidth
                required
                label="IBAN da conta origem"
                value={formData.iban}
                onChange={handleChange('iban')}
                placeholder="PT50 0000 0000 0000 0000 0000 0"
                sx={{ mb: 2 }}
            />

            <TextField
                fullWidth
                required
                type="date"
                label="Data da transferência"
                value={formData.transferDate}
                onChange={handleChange('transferDate')}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
            />

            <TextField
                fullWidth
                label="Referência da transferência"
                value={formData.transferReference}
                onChange={handleChange('transferReference')}
                sx={{ mb: 2 }}
            />

            <TextField
                fullWidth
                label="Observações"
                multiline
                rows={2}
                value={formData.notes}
                onChange={handleChange('notes')}
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
                disabled={state.loading}
                startIcon={state.loading ? <CircularProgress size={20} /> : <BankIcon />}
            >
                {state.loading ? 'A registar...' : 'Confirmar Transferência'}
            </Button>

            <Alert severity="info" sx={{ mt: 2 }}>
                Necessita validação posterior.
            </Alert>
        </Box>
    );
};

export default BankTransferPayment;