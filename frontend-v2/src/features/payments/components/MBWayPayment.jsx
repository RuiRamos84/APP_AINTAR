import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Button, TextField, Alert, CircularProgress, Typography,
    InputAdornment, Avatar, Fade, Stepper, Step, StepLabel
} from '@mui/material';
import {
    PhoneAndroid, CheckCircle, Send, Timer, EmojiEvents
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import paymentService from '../services/paymentService';
import { getSocket, SOCKET_EVENTS, isSocketConnected } from '@/services/websocket/socketService';

const steps = ['Telemóvel', 'Confirmação', 'Pagamento'];

const MBWayPayment = ({ onSuccess, transactionId, amount, onRetry }) => {
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [localStep, setLocalStep] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(300);
    const [isExpired, setIsExpired] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paymentDeclined, setPaymentDeclined] = useState(false);
    const [webhookReceived, setWebhookReceived] = useState(false);

    // Refs para controlo
    const pollingIntervalRef = useRef(null);
    const isPollingRef = useRef(false);
    const countdownIntervalRef = useRef(null);
    const startTimeRef = useRef(null);
    const socketListenerRef = useRef(null);
    const webhookReceivedRef = useRef(false);

    // 1. Limpar todos os listeners e timers (definido primeiro)
    const cleanupListeners = useCallback(() => {
        console.log('[MBWay] Limpando listeners e timers');

        // Limpar listener de socket
        if (socketListenerRef.current) {
            const socket = getSocket();
            if (socket) {
                socket.off(SOCKET_EVENTS.PAYMENT_STATUS_UPDATE, socketListenerRef.current);
            }
            socketListenerRef.current = null;
        }

        // Limpar polling
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        isPollingRef.current = false;

        // Limpar countdown
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    }, []);

    // 2. Handler para atualização de status (usa cleanupListeners)
    const handlePaymentStatusUpdate = useCallback((status) => {
        console.log('[MBWay] handlePaymentStatusUpdate:', status);

        if (['SUCCESS', 'DECLINED', 'EXPIRED'].includes(status)) {
            cleanupListeners();

            if (status === 'SUCCESS') {
                setPaymentSuccess(true);
                setLocalStep(3);
                onSuccess?.({ payment_status: status });
            } else if (status === 'DECLINED') {
                setPaymentDeclined(true);
                setError('Pagamento recusado. Por favor, verifique com o seu banco.');
            } else if (status === 'EXPIRED') {
                setIsExpired(true);
                setError('Tempo de pagamento expirado. Por favor, tente novamente.');
            }
        }
    }, [onSuccess, cleanupListeners]);

    // 3. Iniciar listener de webhook via SocketIO (usa handlePaymentStatusUpdate)
    const startWebhookListener = useCallback(() => {
        if (!transactionId) {
            console.warn('[MBWay] Sem transactionId, não pode iniciar listener');
            return;
        }

        const socket = getSocket();
        const connected = isSocketConnected();
        console.log('[MBWay] Registando listener para:', transactionId, '| Socket connected:', connected);

        if (!socket || !connected) {
            console.warn('[MBWay] Socket não disponível, usando apenas polling');
            return;
        }

        // Limpar listener anterior se existir
        if (socketListenerRef.current) {
            socket.off(SOCKET_EVENTS.PAYMENT_STATUS_UPDATE, socketListenerRef.current);
        }

        // Handler do evento
        const handleWebhookEvent = (data) => {
            console.log('[MBWay] Evento payment_status_update recebido:', data);

            if (data.transaction_id === transactionId) {
                console.log('[MBWay] Match! Status:', data.payment_status);
                setWebhookReceived(true);
                webhookReceivedRef.current = true;
                handlePaymentStatusUpdate(data.payment_status);
            } else {
                console.log('[MBWay] Ignorado - transaction_id diferente:', data.transaction_id, '!==', transactionId);
            }
        };

        // Registar listener
        socket.on(SOCKET_EVENTS.PAYMENT_STATUS_UPDATE, handleWebhookEvent);
        socketListenerRef.current = handleWebhookEvent;
    }, [transactionId, handlePaymentStatusUpdate]);

    // Mutation para verificar status
    const { mutate: checkStatus } = useMutation({
        mutationFn: () => paymentService.checkStatus(transactionId),
        onSuccess: (data) => {
            console.log('[MBWay] Status recebido via polling:', data.payment_status);

            if (['SUCCESS', 'DECLINED', 'EXPIRED'].includes(data.payment_status)) {
                cleanupListeners();

                if (data.payment_status === 'SUCCESS') {
                    setPaymentSuccess(true);
                    setLocalStep(3);
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
            console.error('[MBWay] Erro ao verificar status:', err);
        }
    });

    // 4. Iniciar listener de webhook (polling apenas como fallback se socket indisponível)
    const startPaymentListener = useCallback(() => {
        if (isPollingRef.current || !transactionId) {
            return;
        }

        isPollingRef.current = true;
        webhookReceivedRef.current = false;

        // Tentar iniciar listener de webhook via SocketIO
        startWebhookListener();

        const socket = getSocket();
        const connected = isSocketConnected();

        if (!socket || !connected) {
            // Socket indisponível - usar polling como fallback
            console.log('[MBWay] Socket indisponível, usando polling como fallback');
            checkStatus();
            pollingIntervalRef.current = setInterval(() => {
                console.log('[MBWay] Verificando status via polling (fallback)...');
                checkStatus();
            }, 15000);
        } else {
            console.log('[MBWay] Webhook ativo, aguardando notificação via SocketIO');
        }
    }, [transactionId, startWebhookListener, checkStatus]);

    // Mutation para processar MB WAY
    const { mutate: payWithMBWay, isLoading: isSubmitting } = useMutation({
        mutationFn: (phoneNumber) => paymentService.processMBWay(transactionId, phoneNumber),
        onSuccess: (data) => {
            setLocalStep(2);
            startPaymentListener();
            onSuccess?.(data);
        },
        onError: (err) => {
            setError(err.message || 'Erro ao processar MB WAY');
            setLocalStep(0);
        }
    });

    // Cleanup no unmount
    useEffect(() => {
        return () => {
            cleanupListeners();
        };
    }, [cleanupListeners]);

    // Countdown timer
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
                    cleanupListeners();
                }
            }, 1000);

            return () => {
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                }
            };
        }
    }, [localStep, isExpired, cleanupListeners]);

    // Formatação e validação
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

    const validatePhone = (phone) => /^9\d{8}$/.test(phone.replace(/\s/g, ''));

    const handlePhoneChange = (e) => {
        const formatted = formatPhone(e.target.value);
        if (formatted.replace(/\s/g, '').length <= 9) {
            setPhone(formatted);
            setPhoneError('');
        }
    };

    const handleSubmit = () => {
        const cleanPhone = phone.replace(/\s/g, '');

        if (!validatePhone(cleanPhone)) {
            setPhoneError('Número inválido (9 dígitos)');
            return;
        }

        if (!transactionId) {
            setError('Checkout não criado');
            return;
        }

        setError('');
        setPhoneError('');
        setLocalStep(1);
        payWithMBWay(cleanPhone);
    };

    const handleRetry = () => {
        console.log('[MBWay] Retry solicitado');
        setIsExpired(false);
        setError('');
        setPhoneError('');
        setLocalStep(0);
        setTimeRemaining(300);
        setPaymentSuccess(false);
        setPaymentDeclined(false);
        setWebhookReceived(false);
        webhookReceivedRef.current = false;
        cleanupListeners();

        // Notificar o parent para criar novo checkout
        onRetry?.();
    };

    return (
        <Box sx={{ maxWidth: 500, mx: 'auto', p: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                    <PhoneAndroid sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h5" gutterBottom>MB WAY</Typography>
                <Typography variant="body2" color="text.secondary">
                    Pagamento de €{Number(amount || 0).toFixed(2)}
                </Typography>
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
                            error={!!phoneError}
                            helperText={phoneError || 'Exemplo: 912 345 678'}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Typography variant="body2" color="text.secondary">+351</Typography>
                                    </InputAdornment>
                                )
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
                        {paymentDeclined ? (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h5" color="error" gutterBottom>
                                    Pagamento Recusado
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Verifique com o seu banco ou tente outro método de pagamento.
                                </Typography>
                                <Button variant="contained" onClick={handleRetry} sx={{ mt: 2 }}>
                                    Tentar Novamente
                                </Button>
                            </Box>
                        ) : !isExpired ? (
                            <>
                                <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                                <Typography variant="h5" gutterBottom color="success.main">
                                    Pagamento Enviado
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    Confirme no telemóvel {phone}
                                </Typography>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 1,
                                    my: 3,
                                    p: 2,
                                    bgcolor: timeRemaining < 60 ? 'error.light' : 'info.light',
                                    borderRadius: 2,
                                    color: 'white'
                                }}>
                                    <Timer />
                                    <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                                        Tempo restante: {formatTime(timeRemaining)}
                                    </Typography>
                                </Box>
                            </>
                        ) : (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h5" color="error">Expirado</Typography>
                                <Button variant="contained" onClick={handleRetry} sx={{ mt: 2 }}>
                                    Tentar Novamente
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Fade>
            )}

            {localStep === 3 && paymentSuccess && (
                <Fade in timeout={300}>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <EmojiEvents sx={{ fontSize: 100, color: 'success.main', mb: 2 }} />
                        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'success.main' }}>
                            Pagamento Confirmado!
                        </Typography>
                        <Button variant="outlined" onClick={handleRetry} startIcon={<PhoneAndroid />}>
                            Novo Pagamento
                        </Button>
                    </Box>
                </Fade>
            )}
        </Box>
    );
};

export default MBWayPayment;
