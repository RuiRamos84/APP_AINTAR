import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { getSocket } from '../../../services/socketService';

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

    const countdownIntervalRef = useRef(null);
    const startTimeRef = useRef(null);
    const fallbackTimeoutRef = useRef(null);
    const socketListenerRef = useRef(false);

    const { mutate: payWithMBWay, isLoading: isSubmitting } = useMutation({
        mutationFn: (phoneNumber) => paymentService.processMBWay(transactionId, phoneNumber),
        onSuccess: (data) => {
            setLocalStep(2);
            startWebhookListener();
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
            console.log('Status recebido (fallback GetStatus):', data.payment_status);
            handlePaymentStatusUpdate(data.payment_status);
        },
        onError: (err) => {
            console.error('Erro ao verificar status (fallback):', err);
        }
    });

    // Limpar todos os listeners e timers (definido primeiro para ser usado por outros callbacks)
    const cleanupListeners = useCallback(() => {
        // Limpar listener SocketIO
        if (socketListenerRef.current && typeof socketListenerRef.current === 'function') {
            const socket = getSocket();
            if (socket) {
                socket.off('payment_status_update', socketListenerRef.current);
            }
        }
        socketListenerRef.current = false;

        // Limpar timer de fallback
        if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
        }

        // Limpar countdown
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    }, []);

    // Processar atualização de status (usado tanto pelo SocketIO como pelo fallback)
    const handlePaymentStatusUpdate = useCallback((status) => {
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

    // Timer de fallback: GetStatus após 5 minutos sem webhook
    const startFallbackTimer = useCallback(() => {
        if (fallbackTimeoutRef.current) return;

        console.log('[MBWay] Timer de fallback iniciado (5 min)');
        fallbackTimeoutRef.current = setTimeout(() => {
            if (!webhookReceived) {
                console.log('[MBWay] Sem webhook em 5 min - executando GetStatus fallback');
                checkStatus();
            }
        }, 300000); // 5 minutos = 300000ms
    }, [webhookReceived, checkStatus]);

    // Iniciar listener SocketIO para notificações de webhook
    const startWebhookListener = useCallback(() => {
        if (!transactionId) {
            console.warn('[MBWay] Sem transactionId, não pode iniciar listener');
            return;
        }

        const socket = getSocket();
        if (!socket) {
            console.warn('[MBWay] Socket não disponível, usando fallback GetStatus');
            startFallbackTimer();
            return;
        }

        // Se já temos listener, limpar primeiro
        if (socketListenerRef.current && typeof socketListenerRef.current === 'function') {
            console.log('[MBWay] Limpando listener anterior');
            socket.off('payment_status_update', socketListenerRef.current);
        }

        console.log('[MBWay] Registando listener para:', transactionId, '| Socket connected:', socket.connected);

        const handleWebhookEvent = (data) => {
            console.log('[MBWay] Evento payment_status_update recebido:', data);

            // Filtrar pelo transactionId desta transação
            if (data.transaction_id === transactionId) {
                console.log('[MBWay] Match! Status:', data.payment_status);
                setWebhookReceived(true);
                handlePaymentStatusUpdate(data.payment_status);
            } else {
                console.log('[MBWay] Ignorado - transaction_id diferente:', data.transaction_id, '!==', transactionId);
            }
        };

        socket.on('payment_status_update', handleWebhookEvent);
        socketListenerRef.current = handleWebhookEvent;

        // Iniciar timer de fallback: se não receber webhook em 5 min, fazer GetStatus
        startFallbackTimer();

    }, [transactionId, handlePaymentStatusUpdate, startFallbackTimer]);

    // Limpar ao desmontar componente
    useEffect(() => {
        return () => cleanupListeners();
    }, [cleanupListeners]);

    // Countdown de 5 minutos
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
                    clearInterval(countdownIntervalRef.current);
                }
            }, 1000);

            return () => {
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                }
            };
        }
    }, [localStep, isExpired, cleanupListeners]);

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
        console.log('[MBWay] Retry solicitado');
        setIsExpired(false);
        setError('');
        setPhoneError('');
        setLocalStep(0);
        setTimeRemaining(300);
        setPaymentSuccess(false);
        setPaymentDeclined(false);
        setWebhookReceived(false);
        cleanupListeners();

        // Notificar o parent para criar novo checkout
        onRetry?.();
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

    // Verificação manual (fallback)
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
                    Pagamento de &euro;{Number(amount || 0).toFixed(2)}
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
                            error={!!phoneError}
                            helperText={phoneError || 'Exemplo: 912 345 678'}
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
                                2. Confirme &euro;{Number(amount || 0).toFixed(2)}<br />
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
                        {paymentDeclined ? (
                            <>
                                <Cancel sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />

                                <Typography variant="h5" gutterBottom color="error.main">
                                    Pagamento Recusado
                                </Typography>

                                <Typography variant="body1" color="text.secondary" paragraph>
                                    O pagamento foi recusado pelo seu banco ou aplicação MB WAY.
                                </Typography>

                                <Alert severity="error" sx={{ mb: 3 }}>
                                    <Typography variant="body2">
                                        <strong>Possíveis motivos:</strong><br />
                                        &bull; Saldo insuficiente<br />
                                        &bull; Limite diário atingido<br />
                                        &bull; Operação cancelada no telemóvel<br />
                                        &bull; Problema com a aplicação MB WAY
                                    </Typography>
                                </Alert>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    onClick={handleRetry}
                                    startIcon={<Refresh />}
                                    sx={{ px: 4 }}
                                >
                                    Tentar Novamente
                                </Button>
                            </>
                        ) : !isExpired ? (
                            <>
                                <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />

                                <Typography variant="h5" gutterBottom color="success.main">
                                    Pagamento Enviado
                                </Typography>

                                <Typography variant="body1" color="text.secondary">
                                    Confirme no telemóvel {phone}
                                </Typography>

                                {/* Countdown Timer */}
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

                                {/* Botão verificação manual */}
                                <Button
                                    variant="outlined"
                                    onClick={handleManualCheck}
                                    disabled={isCheckingStatus}
                                    startIcon={isCheckingStatus ? <CircularProgress size={16} /> : null}
                                    sx={{ mb: 2 }}
                                >
                                    {isCheckingStatus ? 'A verificar...' : 'Verificar Status'}
                                </Button>

                                <Alert severity={timeRemaining < 60 ? "warning" : "success"}>
                                    <Typography variant="body2">
                                        <strong>Status:</strong> A aguardar confirmação...<br />
                                        {webhookReceived
                                            ? 'Notificação recebida via webhook'
                                            : 'A aguardar notificação automática (webhook)'}
                                    </Typography>
                                    {timeRemaining < 60 && (
                                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                            Menos de 1 minuto restante!
                                        </Typography>
                                    )}
                                </Alert>

                                {/* Debug em desenvolvimento */}
                                {process.env.NODE_ENV === 'development' && (
                                    <Alert severity="info" sx={{ mt: 1 }}>
                                        <Typography variant="caption">
                                            Transaction: {transactionId}<br />
                                            Webhook: {webhookReceived ? 'Recebido' : 'A aguardar'}<br />
                                            Socket: {getSocket()?.connected ? 'Conectado' : 'Desconectado'}<br />
                                            Time: {timeRemaining}s
                                        </Typography>
                                    </Alert>
                                )}
                            </>
                        ) : (
                            <>
                                <Timer sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />

                                <Typography variant="h5" gutterBottom color="error.main">
                                    Tempo Expirado
                                </Typography>

                                <Typography variant="body1" color="text.secondary" paragraph>
                                    O tempo para confirmar o pagamento (5 minutos) expirou.
                                </Typography>

                                <Alert severity="error" sx={{ mb: 3 }}>
                                    <Typography variant="body2">
                                        <strong>O que aconteceu?</strong><br />
                                        &bull; O pagamento MB WAY não foi confirmado a tempo<br />
                                        &bull; A transação foi cancelada automaticamente<br />
                                        &bull; Nenhum valor foi debitado
                                    </Typography>
                                </Alert>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    onClick={handleRetry}
                                    startIcon={<Refresh />}
                                    sx={{ px: 4 }}
                                >
                                    Tentar Novamente
                                </Button>
                            </>
                        )}
                    </Box>
                </Fade>
            )}

            {/* Step 3: Success */}
            {localStep === 3 && paymentSuccess && (
                <Fade in timeout={300}>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <EmojiEvents sx={{ fontSize: 100, color: 'success.main', mb: 2 }} />

                        <Typography variant="h4" gutterBottom sx={{
                            fontWeight: 700,
                            color: 'success.main'
                        }}>
                            Pagamento Confirmado!
                        </Typography>

                        <Typography variant="h6" color="text.secondary" paragraph>
                            O seu pagamento MB WAY foi processado com sucesso
                        </Typography>

                        <Paper sx={{
                            p: 3,
                            mb: 3,
                            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                            color: 'white',
                            borderRadius: 3
                        }}>
                            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                                Valor pago
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                &euro;{Number(amount || 0).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                                Telemóvel: {phone}
                            </Typography>
                        </Paper>

                        <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
                            <Typography variant="body2">
                                <strong>Pagamento concluído:</strong><br />
                                &bull; Transação autorizada e processada<br />
                                &bull; Receberá confirmação por email<br />
                                &bull; O documento será processado automaticamente<br />
                                &bull; ID: {transactionId}
                            </Typography>
                        </Alert>

                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                            <Button
                                variant="outlined"
                                onClick={handleRetry}
                                startIcon={<PhoneAndroid />}
                            >
                                Novo Pagamento
                            </Button>
                        </Box>
                    </Box>
                </Fade>
            )}
        </Box>
    );
};

export default MBWayPayment;
