import React, { useState, useContext, useEffect } from 'react';
import {
    Box, Button, Typography, Alert, CircularProgress, Paper, Grid,
    Chip, IconButton, Avatar, Fade, Card, CardContent
} from '@mui/material';
import {
    ContentCopy as CopyIcon,
    AccountBalance as BankIcon,
    QrCode,
    Schedule,
    Security
} from '@mui/icons-material';
import { PaymentContext } from '../context/PaymentContext';

const MultibancoPayment = ({ onSuccess, transactionId, onComplete }) => {
    const { state, payWithMultibanco, resetPayment } = useContext(PaymentContext);
    const [referenceData, setReferenceData] = useState(null);
    const [copied, setCopied] = useState({ entity: false, ref: false });
    const [step, setStep] = useState('generate');
    

    // Auto-detectar se já tem referência no state
    useEffect(() => {
        if (state.reference && state.entity) {
            setReferenceData({
                reference: state.reference,
                entity: state.entity,
                amount: state.amount
            });
            setStep('reference');
        }
    }, [state.reference, state.entity, state.amount]);

    const handleGenerate = async () => {
        if (!transactionId) {
            console.error('Transaction ID não encontrado');
            return;
        }

        try {
            const result = await payWithMultibanco();

            // Fallback: se result não tem dados, usar do state
            const refData = result || {
                reference: state.reference,
                entity: state.entity || '11249',
                amount: state.amount
            };

            console.log('🏦 Dados Multibanco:', refData);
            setReferenceData(refData);
            setStep('reference');
        } catch (err) {
            console.error('❌ Erro Multibanco:', err);
        }
    };

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
        setReferenceData(null);
        setStep('generate');
        resetPayment();
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
                        €{Number(state.amount || 0).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Valor a pagar
                    </Typography>
                </Paper>

                <Button
                    variant="contained"
                    size="large"
                    onClick={handleGenerate}
                    disabled={state.loading}
                    startIcon={state.loading ? <CircularProgress size={20} color="inherit" /> : <BankIcon />}
                    sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1.1rem',
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                    }}
                >
                    {state.loading ? 'A gerar...' : 'Gerar Referência'}
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
                                    {referenceData?.entity || state.entity || '11249'}
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => copyToClipboard(referenceData?.entity || state.entity, 'entity')}
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
                                    {referenceData?.reference || state.reference || 'A carregar...'}
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => copyToClipboard(referenceData?.reference || state.reference, 'ref')}
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
                            €{Number(state.amount || 0).toFixed(2)}
                        </Typography>
                    </Box>
                </Paper>

                <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                        <strong>Instruções:</strong><br />
                        • No Multibanco: Pagamentos → Outros Pagamentos → Entidade + Referência<br />
                        • No Homebanking: Use os dados acima na secção de pagamentos<br />
                        • O pagamento é confirmado automaticamente
                    </Typography>
                </Alert>

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
            </Box>
                {isExpired() && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Referência expirada. Gere uma nova.
                    </Alert>
                )}

                <Button
                    variant="outlined"
                    onClick={handleGenerateNew}
                    sx={{ mt: 2 }}
                >
                    {isExpired() ? 'Gerar Nova Referência' : 'Alterar Método'}
                </Button>
        </Fade>
    );

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
            {step === 'generate' && renderGenerate()}
            {step === 'reference' && renderReference()}
        </Box>
    );
};

export default MultibancoPayment;