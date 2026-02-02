import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Button, TextField, Alert, CircularProgress, Typography,
    InputAdornment, Card, CardContent, Avatar, Fade, Stepper,
    Step, StepLabel, Paper
} from '@mui/material';
import {
    PhoneAndroid, Security, Speed, CheckCircle, Send, Timer, Refresh,
    Cancel, EmojiEvents
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import paymentService from '../services/paymentService';

const steps = ['Telemóvel', 'Confirmação', 'Pagamento'];

const MBWayPayment = ({ onSuccess, transactionId, amount }) => {
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [localStep, setLocalStep] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutos em segundos
    const [isExpired, setIsExpired] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paymentDeclined, setPaymentDeclined] = useState(false);

    // Controlar polling com useRef
    const pollingIntervalRef = useRef(null);
    const isPollingRef = useRef(false);
    const countdownIntervalRef = useRef(null);
    const startTimeRef = useRef(null);

    const { mutate: payWithMBWay, isLoading: isSubmitting } = useMutation({
        mutationFn: (phoneNumber) => paymentService.processMBWay(transactionId, phoneNumber),
        onSuccess: (data) => {
            setLocalStep(2); // Avança para o passo de espera
            startControlledPolling();
            onSuccess?.(data);
        },
        onError: (err) => {
            setError(err.message || 'Erro ao processar MB WAY');
            setLocalStep(0);
        }
    });

    const { mutate: checkStatus, isLoading: isCheckingStatus } = useMutation({
        mutationFn: () => paymentService.checkStatus(transactionId),
        onSuccess: (data) => {
            console.log('📊 Status recebido:', data.payment_status);

            if (['SUCCESS', 'DECLINED', 'EXPIRED'].includes(data.payment_status)) {
                stopControlledPolling();

                if (data.payment_status === 'SUCCESS') {
                    setPaymentSuccess(true);
                    setLocalStep(3); // Novo step de sucesso
                    onSuccess?.(data);
                } else if (data.payment_status === 'DECLINED') {
                    setPaymentDeclined(true);
                    setError('Pagamento recusado. Por favor, verifique com o seu banco.');
                } else if (data.payment_status === 'EXPIRED') {
                    setIsExpired(true);
                    setError('Tempo de pagamento expirado. Por favor, tente novamente.');
                }
            }
        },
        onError: (err) => {
            console.error('❌ Erro ao verificar status:', err);
        }
    });

    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
            isPollingRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (localStep === 2 && !isExpired) {
            startTimeRef.current = Date.now();
            setTimeRemaining(300);

            countdownIntervalRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                const remaining = Math.max(0, 300 - elapsed);

                setTimeRemaining(remaining);

                if (remaining === 0) {
                    setIsExpired(true);
                    setError('Tempo de pagamento expirado (5 minutos).');
                    stopControlledPolling();
                    clearInterval(countdownIntervalRef.current);
                }
            }, 1000);

            return () => {
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                }
            };
        }
    }, [localStep, isExpired]);

    const startControlledPolling = () => {
        if (isPollingRef.current || !transactionId) {
            return;
        }

        console.log('🔄 Iniciando polling controlado para:', transactionId);
        isPollingRef.current = true;

         // Verificação imediata
        checkStatus();

        pollingIntervalRef.current = setInterval(() => {
            console.log('🔍 Verificando status MB WAY...');
            checkStatus();
        }, 15000); // 15s interval
    };

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

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleRetry = () => {
        setIsExpired(false);
        setError('');
        setLocalStep(0);
        setTimeRemaining(300);
        stopControlledPolling();
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
        setLocalStep(1); 
        payWithMBWay(cleanPhone);
    };

    return (
        <Box sx={{ maxWidth: 500, mx: 'auto', p: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                    <PhoneAndroid sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h5" gutterBottom>MB WAY</Typography>
                <Typography variant="body2" color="text.secondary">Pagamento de €{Number(amount || 0).toFixed(2)}</Typography>
            </Box>

            <Stepper activeStep={localStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                    <Step key={label}><StepLabel>{label}</StepLabel></Step>
                ))}
            </Stepper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
                                startAdornment: <InputAdornment position="start"><Typography variant="body2" color="text.secondary">+351</Typography></InputAdornment>
                            }}
                            sx={{ mb: 3, '& input': { fontSize: '1.1rem', fontFamily: 'monospace' } }}
                        />
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
                    </Box>
                </Fade>
            )}

            {localStep === 1 && (
                <Fade in timeout={300}>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CircularProgress size={60} sx={{ mb: 3 }} />
                        <Typography variant="h6" gutterBottom>A enviar para {phone}</Typography>
                    </Box>
                </Fade>
            )}

            {localStep === 2 && (
                <Fade in timeout={300}>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        {!isExpired ? (
                            <>
                                <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                                <Typography variant="h5" gutterBottom color="success.main">Pagamento Enviado</Typography>
                                <Typography variant="body1" color="text.secondary">Confirme no telemóvel {phone}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, my: 3, p: 2, bgcolor: timeRemaining < 60 ? 'error.light' : 'info.light', borderRadius: 2, color: 'white' }}>
                                    <Timer />
                                    <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>Tempo restante: {formatTime(timeRemaining)}</Typography>
                                </Box>
                            </>
                        ) : (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h5" color="error">Expirado</Typography>
                                <Button variant="contained" onClick={handleRetry} sx={{ mt: 2 }}>Tentar Novamente</Button>
                            </Box>
                        )}
                    </Box>
                </Fade>
            )}

            {localStep === 3 && paymentSuccess && (
                <Fade in timeout={300}>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <EmojiEvents sx={{ fontSize: 100, color: 'success.main', mb: 2 }} />
                        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'success.main' }}>Pagamento Confirmado!</Typography>
                        <Button variant="outlined" onClick={handleRetry} startIcon={<PhoneAndroid />}>Novo Pagamento</Button>
                    </Box>
                </Fade>
            )}
        </Box>
    );
};

export default MBWayPayment;
