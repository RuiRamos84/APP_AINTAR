import React, { useState, useContext } from 'react';
import {
    Box, Button, TextField, Typography, Alert, CircularProgress,
    Paper, InputAdornment, Grid
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
            console.log('🏦 Processando transferência bancária:', {
                amount: state.amount,
                formData
            });

            // Criar estrutura de dados detalhada
            const transferDetails = {
                type: 'BANK_TRANSFER',
                accountHolder: formData.accountHolder.trim(),
                iban: formData.iban.replace(/\s/g, ''),
                transferDate: formData.transferDate,
                transferReference: formData.transferReference.trim(),
                notes: formData.notes.trim(),
                amount: state.amount,
                submitted_at: new Date().toISOString()
            };

            // Criar descrição legível para reference_info
            const referenceInfo = `Transferência bancária de ${formData.accountHolder} (IBAN: ${formData.iban}) realizada em ${new Date(formData.transferDate).toLocaleDateString('pt-PT')}${formData.transferReference ? `, Ref: ${formData.transferReference}` : ''}${formData.notes ? `, Obs: ${formData.notes}` : ''}`;

            const result = await payManual('BANK_TRANSFER', referenceInfo);

            console.log('✅ Transferência registada:', result);
            onSuccess?.(result);
        } catch (err) {
            console.error('❌ Erro transferência:', err);
            setError(err.message);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <BankIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="h6" gutterBottom>
                    Transferência Bancária
                </Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                    €{Number(state.amount || 0).toFixed(2)}
                </Typography>
            </Box>

            {/* Dados para transferência */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light', color: 'white' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    🏛️ Dados para transferência:
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2">
                            <strong>IBAN:</strong> PT50 0033 0000 4570 8378 2190 5
                        </Typography>
                        <Typography variant="body2">
                            <strong>Titular:</strong> AINTAR
                        </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2">
                            <strong>Valor:</strong> €{Number(state.amount || 0).toFixed(2)}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Referência:</strong> {state.documentId}
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* Formulário de confirmação */}
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                📝 Confirmação da transferência realizada:
            </Typography>

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
                helperText="Nome do titular da conta que fez a transferência"
            />

            <TextField
                fullWidth
                required
                label="IBAN da conta origem"
                value={formData.iban}
                onChange={handleChange('iban')}
                placeholder="PT50 0000 0000 0000 0000 0000 0"
                sx={{ mb: 2 }}
                helperText="IBAN da conta que fez a transferência"
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
                helperText="Referência ou número da operação (se disponível)"
            />

            <TextField
                fullWidth
                label="Observações"
                multiline
                rows={2}
                value={formData.notes}
                onChange={handleChange('notes')}
                sx={{ mb: 2 }}
                helperText="Informações adicionais que possam ajudar na validação"
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
                sx={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #3f9cfe 0%, #00e2fe 100%)'
                    }
                }}
            >
                {state.loading ? 'A registar...' : 'Confirmar Transferência'}
            </Button>

            <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                    <strong>Nota importante:</strong><br />
                    • Este registo confirma que a transferência já foi realizada<br />
                    • Será necessária validação posterior para aprovação<br />
                    • Certifique-se de que os dados estão corretos
                </Typography>
            </Alert>
        </Box>
    );
};

export default BankTransferPayment;