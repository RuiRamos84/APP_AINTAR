import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Alert, Button, CircularProgress, Chip,
    Card, CardContent, Avatar, Fade, Zoom
} from '@mui/material';
import {
    CheckCircle, Error, Schedule, Refresh, HourglassEmpty,
    Cancel, AccessTime
} from '@mui/icons-material';
import paymentService from '../services/paymentService';

const statusConfig = {
    'SUCCESS': {
        icon: CheckCircle,
        color: 'success',
        label: 'Pagamento Confirmado',
        bgGradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        description: 'O seu pagamento foi processado com sucesso'
    },
    'PENDING': {
        icon: Schedule,
        color: 'warning',
        label: 'A Processar',
        bgGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        description: 'O pagamento está a ser processado'
    },
    'PENDING_VALIDATION': {
        icon: HourglassEmpty,
        color: 'info',
        label: 'Aguarda Validação',
        bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        description: 'O pagamento necessita de validação manual'
    },
    'DECLINED': {
        icon: Error,
        color: 'error',
        label: 'Pagamento Rejeitado',
        bgGradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        description: 'O pagamento não foi aceite'
    },
    'EXPIRED': {
        icon: Cancel,
        color: 'error',
        label: 'Pagamento Expirado',
        bgGradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        description: 'O prazo para pagamento expirou'
    }
};

const PaymentStatus = ({ transactionId, onComplete }) => {
    const [status, setStatus] = useState('PENDING');
    const [loading, setLoading] = useState(false);
    const [polling, setPolling] = useState(false);
    const [progress, setProgress] = useState(0);

    const checkStatus = async () => {
        if (!transactionId) return;

        setLoading(true);
        try {
            const result = await paymentService.checkStatus(transactionId);
            setStatus(result.payment_status || 'PENDING');
        } catch (error) {
            console.error('Erro verificação:', error);
        } finally {
            setLoading(false);
        }
    };

    // Polling + progress simulation
    useEffect(() => {
        if (status === 'PENDING' && !polling) {
            setPolling(true);

            // Progress animation
            const progressInterval = setInterval(() => {
                setProgress(prev => prev >= 90 ? 90 : prev + 10);
            }, 1000);

            // Status checking
            const statusInterval = setInterval(checkStatus, 5000);

            return () => {
                clearInterval(progressInterval);
                clearInterval(statusInterval);
            };
        }
    }, [status, transactionId]);

    const config = statusConfig[status] || statusConfig['PENDING'];
    const StatusIcon = config.icon;

    const isComplete = ['SUCCESS', 'PENDING_VALIDATION'].includes(status);
    const isFailed = ['DECLINED', 'EXPIRED'].includes(status);

    return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
            {/* Status Animation */}
            <Zoom in={true} timeout={500}>
                <Card
                    sx={{
                        background: config.bgGradient,
                        color: 'white',
                        mb: 3,
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                >
                    <CardContent sx={{ p: 4 }}>
                        {/* Animated Icon */}
                        <Avatar
                            sx={{
                                width: 80,
                                height: 80,
                                bgcolor: 'rgba(255,255,255,0.2)',
                                mx: 'auto',
                                mb: 2,
                                animation: status === 'PENDING' ? 'pulse 2s infinite' : 'none',
                                '@keyframes pulse': {
                                    '0%': { transform: 'scale(1)' },
                                    '50%': { transform: 'scale(1.1)' },
                                    '100%': { transform: 'scale(1)' }
                                }
                            }}
                        >
                            <StatusIcon sx={{ fontSize: 40 }} />
                        </Avatar>

                        {/* Status Title */}
                        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                            {config.label}
                        </Typography>

                        {/* Description */}
                        <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
                            {config.description}
                        </Typography>

                        {/* Transaction ID */}
                        {transactionId && (
                            <Chip
                                label={`ID: ${transactionId.slice(-8)}`}
                                sx={{
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    fontFamily: 'monospace'
                                }}
                            />
                        )}
                    </CardContent>

                    {/* Progress Bar for Pending */}
                    {status === 'PENDING' && (
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                width: `${progress}%`,
                                height: 4,
                                bgcolor: 'rgba(255,255,255,0.5)',
                                transition: 'width 1s ease'
                            }}
                        />
                    )}
                </Card>
            </Zoom>

            {/* Status Messages */}
            <Fade in={true} timeout={800}>
                <Box sx={{ mb: 3 }}>
                    {status === 'PENDING' && (
                        <Alert
                            severity="info"
                            icon={<AccessTime />}
                            sx={{ mb: 2, textAlign: 'left' }}
                        >
                            <Typography variant="body2">
                                A verificar o estado do pagamento...
                                <br />
                                <small>Este processo pode demorar alguns minutos</small>
                            </Typography>
                        </Alert>
                    )}

                    {status === 'PENDING_VALIDATION' && (
                        <Alert
                            severity="info"
                            sx={{ mb: 2, textAlign: 'left' }}
                        >
                            <Typography variant="body2">
                                Pagamento registado com sucesso.
                                <br />
                                <small>Aguarda validação manual pela nossa equipa</small>
                            </Typography>
                        </Alert>
                    )}

                    {status === 'SUCCESS' && (
                        <Alert
                            severity="success"
                            sx={{ mb: 2, textAlign: 'left' }}
                        >
                            <Typography variant="body2">
                                Pagamento confirmado!
                                <br />
                                <small>Receberá um email de confirmação em breve</small>
                            </Typography>
                        </Alert>
                    )}

                    {isFailed && (
                        <Alert
                            severity="error"
                            sx={{ mb: 2, textAlign: 'left' }}
                        >
                            <Typography variant="body2">
                                {status === 'EXPIRED'
                                    ? 'O prazo para pagamento expirou. Pode tentar novamente.'
                                    : 'O pagamento não foi aceite. Verifique os dados e tente novamente.'
                                }
                            </Typography>
                        </Alert>
                    )}
                </Box>
            </Fade>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                {!isComplete && !isFailed && (
                    <Button
                        variant="outlined"
                        onClick={checkStatus}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
                    >
                        {loading ? 'A verificar...' : 'Actualizar'}
                    </Button>
                )}

                {isComplete && (
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => onComplete?.({ status, transactionId })}
                        sx={{
                            px: 4,
                            py: 1.5,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        }}
                    >
                        Continuar
                    </Button>
                )}

                {isFailed && (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => window.location.reload()}
                        sx={{ px: 4, py: 1.5 }}
                    >
                        Tentar Novamente
                    </Button>
                )}
            </Box>

            {/* Additional Info */}
            {status === 'PENDING' && (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 2 }}
                >
                    Não feche esta janela durante o processamento
                </Typography>
            )}
        </Box>
    );
};

export default PaymentStatus;