import React, { useState, useContext } from 'react';
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

const MultibancoPayment = ({ onSuccess, transactionId }) => {
    const { state, payWithMultibanco } = useContext(PaymentContext);
    const [referenceData, setReferenceData] = useState(null);
    const [copied, setCopied] = useState({ entity: false, ref: false });
    const [step, setStep] = useState('generate');

    const handleGenerate = async () => {
        if (!transactionId) {
            console.error('Transaction ID não encontrado');
            return;
        }

        try {
            const result = await payWithMultibanco();
            setReferenceData(result);
            setStep('reference');
            // NÃO chamar onSuccess - só mostrar referência
        } catch (err) {
            console.error(err);
        }
    };

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopied({ ...copied, [field]: true });
        setTimeout(() => setCopied({ ...copied, [field]: false }), 2000);
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

                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid item xs={4}>
                        <Card sx={{ bgcolor: 'info.light', color: 'white', textAlign: 'center' }}>
                            <CardContent sx={{ p: 2 }}>
                                <Schedule sx={{ mb: 1 }} />
                                <Typography variant="caption" display="block">
                                    Válido 48h
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={4}>
                        <Card sx={{ bgcolor: 'success.light', color: 'white', textAlign: 'center' }}>
                            <CardContent sx={{ p: 2 }}>
                                <BankIcon sx={{ mb: 1 }} />
                                <Typography variant="caption" display="block">
                                    Todos os bancos
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={4}>
                        <Card sx={{ bgcolor: 'warning.light', color: 'white', textAlign: 'center' }}>
                            <CardContent sx={{ p: 2 }}>
                                <Security sx={{ mb: 1 }} />
                                <Typography variant="caption" display="block">
                                    100% seguro
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

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
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #e081ff 0%, #ff4081 100%)'
                        }
                    }}
                >
                    {state.loading ? 'A gerar...' : 'Gerar Referência'}
                </Button>

                <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
                    <Typography variant="body2">
                        <strong>Como funciona:</strong><br />
                        1. Clique em "Gerar Referência"<br />
                        2. Use os dados no Multibanco ou homebanking<br />
                        3. O pagamento é confirmado automaticamente
                    </Typography>
                </Alert>
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
                    <Typography variant="body2" color="text.secondary">
                        Use estes dados para pagar no Multibanco
                    </Typography>
                </Box>

                <Paper
                    elevation={8}
                    sx={{
                        p: 4,
                        mb: 3,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        borderRadius: 4,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 200,
                            height: 200,
                            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                            transform: 'translate(50%, -50%)'
                        }}
                    />

                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={4}>
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
                                    {referenceData?.entity || '11249'}
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

                        <Grid item xs={12} sm={8}>
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
                            €{Number(state.amount || 0).toFixed(2)}
                        </Typography>
                        {referenceData?.expire_date && (
                            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
                                Válida até: {new Date(referenceData.expire_date).toLocaleDateString('pt-PT')}
                            </Typography>
                        )}
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

                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <QrCode sx={{ fontSize: 40, color: 'grey.600', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                        Código QR disponível na versão mobile
                    </Typography>
                </Paper>
            </Box>
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