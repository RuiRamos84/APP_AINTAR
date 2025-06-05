import React, { useState, useContext, useEffect } from 'react';
import {
    Box, Button, TextField, Alert, CircularProgress, Typography,
    InputAdornment, Card, CardContent, Avatar, Fade, Stepper,
    Step, StepLabel, Paper
} from '@mui/material';
import {
    PhoneAndroid, Security, Speed, CheckCircle, Send
} from '@mui/icons-material';
import { PaymentContext } from '../context/PaymentContext';

const steps = ['Telemóvel', 'Confirmação', 'Pagamento'];

const MBWayPayment = ({ onSuccess, transactionId }) => {
    const { state, payWithMBWay, checkStatus } = useContext(PaymentContext);
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');

    const [localStep, setLocalStep] = useState(0);

    // Polling automático
    useEffect(() => {
        if (localStep === 2 && state.transactionId) {
            const interval = setInterval(() => checkStatus(), 30000);
            return () => clearInterval(interval);
        }
    }, [localStep, state.transactionId, checkStatus]);

    useEffect(() => {
        if (state.transactionId && localStep === 1) {
            setLocalStep(2);
            onSuccess?.();
        }
    }, [state.transactionId, localStep, onSuccess]);

    const formatPhone = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 3) return numbers;
        if (numbers.length <= 6) return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
        return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6, 9)}`;
    };

    const validatePhone = (phone) => /^9\d{8}$/.test(phone.replace(/\s/g, ''));

    const handlePhoneChange = (e) => {
        const formatted = formatPhone(e.target.value);
        if (formatted.replace(/\s/g, '').length <= 9) {
            setPhone(formatted);
            setError('');
        }
    };

    const handleSubmit = async () => {
        const cleanPhone = phone.replace(/\s/g, '');

        if (!validatePhone(cleanPhone)) {
            setError('Número inválido (9 dígitos)');
            return;
        }

        if (!transactionId) {
            setError('Checkout não criado');
            return;
        }

        setError('');
        setLocalStep(1); // Avançar para processing

        try {
            await payWithMBWay(cleanPhone);
            // Estado gerido pelo contexto + useEffect
        } catch (err) {
            setError(err.message);
            setLocalStep(0); // Voltar ao início
        }
    };

    return (
        <Box sx={{ maxWidth: 500, mx: 'auto', p: 3 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar sx={{
                    width: 64,
                    height: 64,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'primary.main'
                }}>
                    <PhoneAndroid sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h5" gutterBottom>MB WAY</Typography>
                <Typography variant="body2" color="text.secondary">
                    Pagamento de €{Number(state.amount || 0).toFixed(2)}
                </Typography>
            </Box>

            {/* Stepper */}
            <Stepper activeStep={localStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {/* Erro global */}
            {(error || state.error) && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error || state.error}
                </Alert>
            )}

            {/* Step 0: Input */}
            {localStep === 0 && (
                <Fade in timeout={300}>
                    <Box>
                        <TextField
                            fullWidth
                            label="Número de telemóvel"
                            value={phone}
                            onChange={handlePhoneChange}
                            placeholder="9XX XXX XXX"
                            error={!!error}
                            helperText={error || 'Exemplo: 912 345 678'}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Typography variant="body2" color="text.secondary">
                                            +351
                                        </Typography>
                                    </InputAdornment>
                                )
                            }}
                            sx={{
                                mb: 3,
                                '& input': { fontSize: '1.1rem', fontFamily: 'monospace' }
                            }}
                        />

                        {/* Features */}
                        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                            <Card sx={{ flex: 1, bgcolor: 'success.light' }}>
                                <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                                    <Speed sx={{ fontSize: 20, color: 'white' }} />
                                    <Typography variant="caption" display="block" color="white">
                                        Instantâneo
                                    </Typography>
                                </CardContent>
                            </Card>
                            <Card sx={{ flex: 1, bgcolor: 'info.light' }}>
                                <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                                    <Security sx={{ fontSize: 20, color: 'white' }} />
                                    <Typography variant="caption" display="block" color="white">
                                        Seguro
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Box>

                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleSubmit}
                            disabled={!validatePhone(phone.replace(/\s/g, '')) || state.loading}
                            startIcon={state.loading ? <CircularProgress size={20} /> : <Send />}
                            sx={{ py: 1.5 }}
                        >
                            {state.loading ? 'A enviar...' : 'Enviar Pagamento'}
                        </Button>

                        <Alert severity="info" sx={{ mt: 2 }}>
                            Receberá uma notificação para autorizar o pagamento.
                        </Alert>
                    </Box>
                </Fade>
            )}

            {/* Step 1: Processing */}
            {localStep === 1 && (
                <Fade in timeout={300}>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CircularProgress size={60} sx={{ mb: 3 }} />

                        <Typography variant="h6" gutterBottom>
                            A enviar para {phone}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" paragraph>
                            Verifique o seu telemóvel e confirme o pagamento
                        </Typography>

                        <Paper sx={{ p: 2, bgcolor: 'warning.light', color: 'white' }}>
                            <Typography variant="body2">
                                <strong>Próximos passos:</strong><br />
                                1. Abra a notificação MB WAY<br />
                                2. Confirme €{Number(state.amount || 0).toFixed(2)}<br />
                                3. Aguarde confirmação
                            </Typography>
                        </Paper>
                    </Box>
                </Fade>
            )}

            {localStep === 2 && (
                <Fade in timeout={300}>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />

                        <Typography variant="h5" gutterBottom color="success.main">
                            Pagamento Enviado
                        </Typography>

                        <Typography variant="body1" color="text.secondary">
                            Confirme no telemóvel {phone}
                        </Typography>

                        {/* Botão verificação manual */}
                        <Button
                            variant="outlined"
                            onClick={() => checkStatus()}
                            disabled={state.loading}
                            startIcon={state.loading ? <CircularProgress size={16} /> : null}
                            sx={{ mt: 2 }}
                        >
                            {state.loading ? 'A verificar...' : 'Verificar Status'}
                        </Button>

                        <Alert severity="success" sx={{ mt: 2 }}>
                            Verificação automática a cada 30s
                        </Alert>
                    </Box>
                </Fade>
            )}
        </Box>
    );
};

export default MBWayPayment;