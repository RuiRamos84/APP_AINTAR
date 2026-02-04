import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Button, Typography, Alert, CircularProgress, Paper, Grid,
    Chip, IconButton, Avatar, Fade
} from '@mui/material';
import {
    ContentCopy as CopyIcon,
    AccountBalance as BankIcon,
    Schedule, CheckCircle, Refresh
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import paymentService from '../services/paymentService';
import { getSocket } from '../../../services/socketService';

const MultibancoPayment = ({ onSuccess, transactionId, onComplete, amount, onRetry }) => {
    const [referenceData, setReferenceData] = useState(null);
    const [copied, setCopied] = useState({ entity: false, ref: false });
    const [step, setStep] = useState('generate');
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);

    const socketListenerRef = useRef(null);
    const expiryCheckTimeoutRef = useRef(null);

    const { mutate: generateReference, isLoading } = useMutation({
        mutationFn: () => paymentService.processMultibanco(transactionId),
        onSuccess: (data) => {
            const refData = { ...data, amount };
            setReferenceData(refData);
            setStep('reference');
            // Iniciar listener de webhook após gerar referência
            startWebhookListener();
            // Agendar GetStatus para a data de expiração
            scheduleExpiryCheck(data.expire_date);
        },
        onError: (err) => {
            console.error('Erro Multibanco:', err);
        }
    });

    const { mutate: checkStatus, isLoading: isCheckingStatus } = useMutation({
        mutationFn: () => paymentService.checkStatus(transactionId),
        onSuccess: (data) => {
            console.log('GetStatus Multibanco (expiração):', data.payment_status);
            handlePaymentStatusUpdate(data.payment_status);
        },
        onError: (err) => {
            console.error('Erro GetStatus Multibanco:', err);
        }
    });

    // Processar atualização de status
    const handlePaymentStatusUpdate = useCallback((status) => {
        if (status === 'SUCCESS') {
            setPaymentConfirmed(true);
            setStep('success');
            cleanupListeners();
            onSuccess?.({ payment_status: status, transactionId });
        } else if (status === 'EXPIRED') {
            setStep('expired');
            cleanupListeners();
        } else if (status === 'DECLINED') {
            setStep('expired');
            cleanupListeners();
        }
    }, [onSuccess, transactionId]);

    // Listener SocketIO para notificações de webhook
    const startWebhookListener = useCallback(() => {
        if (socketListenerRef.current || !transactionId) return;

        const socket = getSocket();
        if (!socket) {
            console.warn('Socket não disponível para Multibanco webhook');
            return;
        }

        console.log('Multibanco: A escutar webhook via SocketIO para:', transactionId);

        const handleWebhookEvent = (data) => {
            if (data.transaction_id === transactionId) {
                console.log('Multibanco webhook recebido:', data.payment_status);
                handlePaymentStatusUpdate(data.payment_status);
            }
        };

        socket.on('payment_status_update', handleWebhookEvent);
        socketListenerRef.current = handleWebhookEvent;
    }, [transactionId, handlePaymentStatusUpdate]);

    // Agendar GetStatus para a data de expiração da referência
    const scheduleExpiryCheck = useCallback((expiryDate) => {
        if (!expiryDate) return;

        const expiry = new Date(expiryDate);
        const now = new Date();
        const msUntilExpiry = expiry.getTime() - now.getTime();

        if (msUntilExpiry <= 0) {
            // Já expirou, verificar agora
            console.log('Referência Multibanco já expirou, a verificar status');
            checkStatus();
            return;
        }

        console.log(
            'GetStatus agendado para expiração:',
            expiry.toLocaleString('pt-PT'),
            `(${Math.round(msUntilExpiry / 3600000)}h)`
        );

        // Agendar verificação para quando a referência expirar
        // Nota: setTimeout tem limite de ~24.8 dias (2^31 ms)
        // Para referências de 7 dias, funciona normalmente
        const maxTimeout = 2147483647; // ~24.8 dias em ms
        const timeout = Math.min(msUntilExpiry, maxTimeout);

        expiryCheckTimeoutRef.current = setTimeout(() => {
            console.log('Referência Multibanco atingiu data de expiração, a verificar status');
            checkStatus();
        }, timeout);
    }, [checkStatus]);

    // Limpar listeners e timers
    const cleanupListeners = useCallback(() => {
        if (socketListenerRef.current) {
            const socket = getSocket();
            if (socket) {
                socket.off('payment_status_update', socketListenerRef.current);
            }
            socketListenerRef.current = null;
        }

        if (expiryCheckTimeoutRef.current) {
            clearTimeout(expiryCheckTimeoutRef.current);
            expiryCheckTimeoutRef.current = null;
        }
    }, []);

    // Limpar ao desmontar
    useEffect(() => {
        return () => cleanupListeners();
    }, [cleanupListeners]);

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopied({ ...copied, [field]: true });
        setTimeout(() => setCopied({ ...copied, [field]: false }), 2000);
    };

    const isExpired = () => {
        if (!referenceData?.expire_date) return false;
        return new Date() > new Date(referenceData.expire_date);
    };

    const getExpiryDisplay = () => {
        if (!referenceData?.expire_date) return null;
        const expiry = new Date(referenceData.expire_date);
        return expiry.toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleGenerateNew = () => {
        console.log('[Multibanco] Gerar nova referência solicitado');
        cleanupListeners();
        setReferenceData(null);
        setStep('generate');
        setPaymentConfirmed(false);

        // Notificar o parent para criar novo checkout
        onRetry?.();
    };

    // Verificação manual - apenas se expirou
    const handleManualCheck = () => {
        checkStatus();
    };

    const renderGenerate = () => (
        <Fade in={true}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Avatar
                    sx={{
                        width: 100,
                        height: 100,
                        mx: 'auto',
                        mb: 3,
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                    }}
                >
                    <BankIcon sx={{ fontSize: 50 }} />
                </Avatar>

                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    Referência Multibanco
                </Typography>

                <Typography variant="body1" color="text.secondary" paragraph>
                    Gere a sua referência para pagar no ATM ou homebanking
                </Typography>

                <Paper
                    sx={{
                        p: 3,
                        mb: 4,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        borderRadius: 3
                    }}
                >
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        &euro;{Number(amount || 0).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Valor a pagar
                    </Typography>
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
                        fontSize: '1.1rem',
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
                    <Avatar
                        sx={{
                            width: 80,
                            height: 80,
                            mx: 'auto',
                            mb: 2,
                            bgcolor: 'success.main'
                        }}
                    >
                        <BankIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                        Referência Gerada!
                    </Typography>
                </Box>

                <Paper
                    elevation={8}
                    sx={{
                        p: 4,
                        mb: 3,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        borderRadius: 4
                    }}
                >
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8, mb: 1 }}>
                                Entidade
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontFamily: 'monospace',
                                        fontWeight: 'bold',
                                        letterSpacing: 2
                                    }}
                                >
                                    {referenceData?.entity || 'A carregar...'}
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
                                <Chip
                                    label="Copiado!"
                                    size="small"
                                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', mt: 1 }}
                                />
                            )}
                        </Grid>

                        <Grid size={{ xs: 12, sm: 8 }}>
                            <Typography variant="subtitle2" sx={{ opacity: 0.8, mb: 1 }}>
                                Referência
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontFamily: 'monospace',
                                        fontWeight: 'bold',
                                        letterSpacing: 2
                                    }}
                                >
                                    {referenceData?.reference || 'A carregar...'}
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
                                <Chip
                                    label="Copiado!"
                                    size="small"
                                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', mt: 1 }}
                                />
                            )}
                        </Grid>
                    </Grid>

                    <Box sx={{ textAlign: 'center', mt: 3, pt: 3, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                        <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                            Valor
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 600 }}>
                            &euro;{Number(amount || 0).toFixed(2)}
                        </Typography>
                    </Box>
                </Paper>

                <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                        <strong>Instruções:</strong><br />
                        &bull; No Multibanco: Pagamentos &rarr; Outros Pagamentos &rarr; Entidade + Referência<br />
                        &bull; No Homebanking: Use os dados acima na secção de pagamentos<br />
                        &bull; O pagamento é confirmado automaticamente via webhook
                    </Typography>
                </Alert>

                <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                        <strong>Validade da Referência:</strong><br />
                        &bull; Válida até: <strong>{getExpiryDisplay() || '7 dias'}</strong><br />
                        &bull; Pode pagar a qualquer momento dentro deste período<br />
                        &bull; Receberá notificação automática quando o pagamento for confirmado
                    </Typography>
                </Alert>

                <Alert severity="info" sx={{ mb: 3 }} icon={<Schedule />}>
                    <Typography variant="body2">
                        A verificação de status será feita automaticamente na data de expiração.
                        Se pagar antes, receberá uma notificação automática via webhook.
                    </Typography>
                </Alert>

                {isExpired() && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                            A referência expirou.
                        </Typography>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={handleManualCheck}
                            disabled={isCheckingStatus}
                            startIcon={isCheckingStatus ? <CircularProgress size={14} /> : null}
                            sx={{ mt: 1 }}
                        >
                            {isCheckingStatus ? 'A verificar...' : 'Verificar Estado Final'}
                        </Button>
                    </Alert>
                )}

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

                <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={handleGenerateNew}
                    >
                        {isExpired() ? 'Gerar Nova Referência' : 'Alterar Método'}
                    </Button>
                </Box>

                {/* Debug em desenvolvimento */}
                {process.env.NODE_ENV === 'development' && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="caption">
                            Transaction: {transactionId}<br />
                            Socket: {getSocket()?.connected ? 'Conectado' : 'Desconectado'}<br />
                            Listener: {socketListenerRef.current ? 'Ativo' : 'Inativo'}<br />
                            Expira: {referenceData?.expire_date}
                        </Typography>
                    </Alert>
                )}
            </Box>
        </Fade>
    );

    const renderSuccess = () => (
        <Fade in={true}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircle sx={{ fontSize: 100, color: 'success.main', mb: 2 }} />

                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'success.main' }}>
                    Pagamento Confirmado!
                </Typography>

                <Typography variant="h6" color="text.secondary" paragraph>
                    O pagamento Multibanco foi processado com sucesso
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
                </Paper>

                <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
                    <Typography variant="body2">
                        <strong>Pagamento concluído:</strong><br />
                        &bull; Pagamento recebido e confirmado pela SIBS<br />
                        &bull; O documento será processado automaticamente<br />
                        &bull; ID: {transactionId}
                    </Typography>
                </Alert>

                <Button
                    variant="outlined"
                    onClick={handleGenerateNew}
                    startIcon={<Refresh />}
                >
                    Novo Pagamento
                </Button>
            </Box>
        </Fade>
    );

    const renderExpired = () => (
        <Fade in={true}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Schedule sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />

                <Typography variant="h5" gutterBottom color="warning.main">
                    Referência Expirada
                </Typography>

                <Typography variant="body1" color="text.secondary" paragraph>
                    A referência Multibanco expirou sem registo de pagamento.
                </Typography>

                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleGenerateNew}
                    startIcon={<Refresh />}
                    sx={{ px: 4 }}
                >
                    Gerar Nova Referência
                </Button>
            </Box>
        </Fade>
    );

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
            {step === 'generate' && renderGenerate()}
            {step === 'reference' && renderReference()}
            {step === 'success' && renderSuccess()}
            {step === 'expired' && renderExpired()}
        </Box>
    );
};

export default MultibancoPayment;
