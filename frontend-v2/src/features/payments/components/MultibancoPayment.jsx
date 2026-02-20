import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Button, Typography, Alert, CircularProgress, Paper, Grid,
    IconButton, Avatar, Fade
} from '@mui/material';
import {
    ContentCopy as CopyIcon,
    AccountBalance as BankIcon,
    CheckCircle,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import paymentService from '../services/paymentService';
import { getSocket, SOCKET_EVENTS, isSocketConnected } from '@/services/websocket/socketService';

const MultibancoPayment = ({ onSuccess, transactionId, onComplete, amount, onRetry }) => {
    const [referenceData, setReferenceData] = useState(null);
    const [copied, setCopied] = useState({ entity: false, ref: false });
    const [step, setStep] = useState('generate');
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);

    // Ref para o listener do webhook
    const socketListenerRef = useRef(null);

    // Limpar listener de socket
    const cleanupListener = useCallback(() => {
        if (socketListenerRef.current) {
            const socket = getSocket();
            if (socket) {
                socket.off(SOCKET_EVENTS.PAYMENT_STATUS_UPDATE, socketListenerRef.current);
            }
            socketListenerRef.current = null;
        }
    }, []);

    // Iniciar listener de webhook via SocketIO
    const startWebhookListener = useCallback(() => {
        if (!transactionId) {
            console.warn('[Multibanco] Sem transactionId, não pode iniciar listener');
            return;
        }

        const socket = getSocket();
        const connected = isSocketConnected();
        console.log('[Multibanco] Registando listener para:', transactionId, '| Socket connected:', connected);

        if (!socket || !connected) {
            console.warn('[Multibanco] Socket não disponível');
            return;
        }

        // Limpar listener anterior se existir
        if (socketListenerRef.current) {
            socket.off(SOCKET_EVENTS.PAYMENT_STATUS_UPDATE, socketListenerRef.current);
        }

        // Handler do evento
        const handleWebhookEvent = (data) => {
            console.log('[Multibanco] Evento payment_status_update recebido:', data);

            if (data.transaction_id === transactionId) {
                console.log('[Multibanco] Match! Status:', data.payment_status);

                if (data.payment_status === 'SUCCESS') {
                    setPaymentConfirmed(true);
                    setStep('confirmed');
                    cleanupListener();
                    onSuccess?.({ payment_status: data.payment_status });
                }
            }
        };

        // Registar listener
        socket.on(SOCKET_EVENTS.PAYMENT_STATUS_UPDATE, handleWebhookEvent);
        socketListenerRef.current = handleWebhookEvent;
    }, [transactionId, cleanupListener, onSuccess]);

    // Cleanup no unmount
    useEffect(() => {
        return () => {
            cleanupListener();
        };
    }, [cleanupListener]);

    // Iniciar listener quando a referência é gerada
    useEffect(() => {
        if (step === 'reference' && transactionId) {
            startWebhookListener();
        }
    }, [step, transactionId, startWebhookListener]);

    const { mutate: generateReference, isLoading } = useMutation({
        mutationFn: () => paymentService.processMultibanco(transactionId),
        onSuccess: (data) => {
            setReferenceData({
                ...data,
                amount: amount
            });
            setStep('reference');
        },
        onError: (err) => {
            console.error('[Multibanco] Erro:', err);
        }
    });

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopied({ ...copied, [field]: true });
        setTimeout(() => setCopied({ ...copied, [field]: false }), 2000);
    };

    const isExpired = () => {
        if (!referenceData?.expire_date) return false;
        return new Date() > new Date(referenceData.expire_date);
    };

    const handleGenerateNew = async () => {
        console.log('[Multibanco] Gerar nova referência solicitado');
        setReferenceData(null);
        setStep('generate');
        setPaymentConfirmed(false);
        cleanupListener();

        // Notificar o parent para criar novo checkout (se a referência expirou)
        onRetry?.();
    };

    const renderGenerate = () => (
        <Fade in={true}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Avatar sx={{
                    width: 100,
                    height: 100,
                    mx: 'auto',
                    mb: 3,
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                }}>
                    <BankIcon sx={{ fontSize: 50 }} />
                </Avatar>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    Referência Multibanco
                </Typography>
                <Paper sx={{
                    p: 3,
                    mb: 4,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: 3
                }}>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        €{Number(amount || 0).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Valor a pagar</Typography>
                </Paper>
                <Button
                    variant="contained"
                    size="large"
                    onClick={() => generateReference()}
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <BankIcon />}
                    sx={{
                        px: 4,
                        py: 1.5,
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                    }}
                >
                    {isLoading ? 'A gerar...' : 'Gerar Referência'}
                </Button>
            </Box>
        </Fade>
    );

    const renderReference = () => (
        <Fade in={true}>
            <Box sx={{ py: 3 }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'success.main' }}>
                        <BankIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                        Referência Gerada!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Pague no Multibanco ou Homebanking
                    </Typography>
                </Box>
                <Paper elevation={8} sx={{
                    p: 4,
                    mb: 3,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: 4
                }}>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8, mb: 1 }}>Entidade</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h4" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                    {referenceData?.entity || '...'}
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => copyToClipboard(referenceData?.entity, 'entity')}
                                    sx={{ color: 'white' }}
                                >
                                    <CopyIcon fontSize="small" />
                                </IconButton>
                            </Box>
                            {copied.entity && (
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                    Copiado!
                                </Typography>
                            )}
                        </Grid>
                        <Grid size={{ xs: 12, sm: 8 }}>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8, mb: 1 }}>Referência</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h4" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                    {referenceData?.reference || '...'}
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => copyToClipboard(referenceData?.reference, 'ref')}
                                    sx={{ color: 'white' }}
                                >
                                    <CopyIcon fontSize="small" />
                                </IconButton>
                            </Box>
                            {copied.ref && (
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                    Copiado!
                                </Typography>
                            )}
                        </Grid>
                    </Grid>
                    <Box sx={{
                        textAlign: 'center',
                        mt: 3,
                        pt: 3,
                        borderTop: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Valor</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 600 }}>
                            €{Number(amount || 0).toFixed(2)}
                        </Typography>
                        {referenceData?.expire_date && (
                            <Typography variant="body2" sx={{ opacity: 0.8, mt: 1.5 }}>
                                Válido até: {new Date(referenceData.expire_date).toLocaleDateString('pt-PT', {
                                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </Typography>
                        )}
                    </Box>
                </Paper>
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => onComplete?.({ status: 'REFERENCE_GENERATED', transactionId })}
                        sx={{
                            px: 4,
                            py: 1.5,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        }}
                    >
                        Continuar
                    </Button>
                </Box>
                {isExpired() && (
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Button variant="outlined" onClick={handleGenerateNew}>
                            Gerar Nova Referência
                        </Button>
                    </Box>
                )}
            </Box>
        </Fade>
    );

    const renderConfirmed = () => (
        <Fade in={true}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircle sx={{ fontSize: 100, color: 'success.main', mb: 2 }} />
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'success.main' }}>
                    Pagamento Confirmado!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    O seu pagamento Multibanco foi processado com sucesso.
                </Typography>
                <Button
                    variant="outlined"
                    onClick={handleGenerateNew}
                    startIcon={<BankIcon />}
                >
                    Novo Pagamento
                </Button>
            </Box>
        </Fade>
    );

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
            {step === 'generate' && renderGenerate()}
            {step === 'reference' && renderReference()}
            {step === 'confirmed' && renderConfirmed()}
        </Box>
    );
};

export default MultibancoPayment;
