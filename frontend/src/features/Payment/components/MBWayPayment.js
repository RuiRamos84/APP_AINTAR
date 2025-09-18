import React, { useState, useContext, useEffect, useRef } from 'react';
import {
    Box, Button, TextField, Alert, CircularProgress, Typography,
    InputAdornment, Card, CardContent, Avatar, Fade, Stepper,
    Step, StepLabel, Paper
} from '@mui/material';
import {
    PhoneAndroid, Security, Speed, CheckCircle, Send
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import paymentService from '../services/paymentService';

const steps = ['Telemóvel', 'Confirmação', 'Pagamento'];

const MBWayPayment = ({ onSuccess, transactionId, amount }) => {
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [localStep, setLocalStep] = useState(0);

    // Controlar polling com useRef para evitar múltiplos intervalos
    const pollingIntervalRef = useRef(null);
    const isPollingRef = useRef(false);

    const { mutate: payWithMBWay, isLoading: isSubmitting } = useMutation({
        mutationFn: (phoneNumber) => paymentService.processMBWay(transactionId, phoneNumber),
        onSuccess: (data) => {
            setLocalStep(2); // Avança para o passo de espera
            startControlledPolling();
            onSuccess?.(data);
        },
        onError: (err) => {
            setError(err.message || 'Erro ao processar MB WAY');
            setLocalStep(0); // Volta ao passo inicial em caso de erro
        }
    });

    const { mutate: checkStatus, isLoading: isCheckingStatus } = useMutation({
        mutationFn: () => paymentService.checkStatus(transactionId),
        onSuccess: (data) => {
            if (['SUCCESS', 'DECLINED', 'EXPIRED'].includes(data.payment_status)) {
                stopControlledPolling();
            }
        }
    });

    // Limpar polling ao desmontar componente
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            isPollingRef.current = false;
        };
    }, []);

    // Iniciar polling APENAS quando necessário
    const startControlledPolling = () => {
        if (isPollingRef.current || !transactionId) {
            return; // Já está a fazer polling ou não tem transactionId
        }

        console.log('🔄 Iniciando polling controlado para:', transactionId);
        isPollingRef.current = true;

        pollingIntervalRef.current = setInterval(() => {
            console.log('🔍 Verificando status MB WAY...');
            checkStatus();
        }, 15000); // 15 segundos em vez de 30
    };

    // Parar polling
    const stopControlledPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        isPollingRef.current = false;
        console.log('⏹️ Polling MB WAY parado');
    };

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

    const handleSubmit = () => {
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
        payWithMBWay(cleanPhone);
    };

    // Verificação manual (para debug)
    const handleManualCheck = () => {
        checkStatus();
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
                    Pagamento de €{Number(amount || 0).toFixed(2)}
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
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
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
                            disabled={!validatePhone(phone.replace(/\s/g, '')) || isSubmitting}
                            startIcon={isSubmitting ? <CircularProgress size={20} /> : <Send />}
                            sx={{ py: 1.5 }}
                        >
                            {isSubmitting ? 'A enviar...' : 'Enviar Pagamento'}
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
                                2. Confirme €{Number(amount || 0).toFixed(2)}<br />
                                3. Aguarde confirmação
                            </Typography>
                        </Paper>
                    </Box>
                </Fade>
            )}

            {/* Step 2: Waiting */}
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
                            onClick={handleManualCheck}
                            disabled={isCheckingStatus}
                            startIcon={isCheckingStatus ? <CircularProgress size={16} /> : null}
                            sx={{ mt: 2 }}
                        >
                            {isCheckingStatus ? 'A verificar...' : 'Verificar Status'}
                        </Button>

                        <Alert severity="success" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                                <strong>Status:</strong> A aguardar...<br />
                                Verificação automática a cada 15s
                                {isPollingRef.current && ' (Activo)'}
                            </Typography>
                        </Alert>

                        {/* Debug em desenvolvimento */}
                        {process.env.NODE_ENV === 'development' && (
                            <Alert severity="info" sx={{ mt: 1 }}>
                                <Typography variant="caption">
                                    Transaction: {transactionId}<br />
                                    Polling: {isPollingRef.current ? 'Ativo' : 'Inativo'}<br />
                                </Typography>
                            </Alert>
                        )}
                    </Box>
                </Fade>
            )}
        </Box>
    );
};

export default MBWayPayment;