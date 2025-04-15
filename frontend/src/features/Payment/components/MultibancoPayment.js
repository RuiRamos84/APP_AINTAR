import { AccountBalance as BankIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Typography,
    useTheme
} from '@mui/material';
import React, { useEffect, useState, useContext } from 'react';
import { PaymentContext } from '../context/PaymentContext';

/**
 * Componente para pagamento via Multibanco
 * @param {Object} props - Propriedades do componente
 * @param {Function} props.onGenerate - Função chamada após geração bem-sucedida
 * @param {boolean} props.loading - Indica se está processando o pagamento
 * @param {string} props.error - Mensagem de erro, se houver
 */
const MultibancoPayment = ({ onGenerate, loading: externalLoading, error: externalError }) => {
    const theme = useTheme();
    const payment = useContext(PaymentContext);

    // Estados locais
    const [generated, setGenerated] = useState(false);
    const [expiryDays, setExpiryDays] = useState(2); // Padrão: 2 dias
    const [referenceDetails, setReferenceDetails] = useState(null);
    const [copied, setCopied] = useState({ entity: false, reference: false });
    const [localError, setLocalError] = useState('');

    const loading = externalLoading || payment.loading;
    const error = externalError || payment.error || localError;

    // Obter detalhes da referência dos resultados de pagamento
    useEffect(() => {
        const details = payment.getMultibancoDetails();
        if (details && details.entity && details.reference) {
            setReferenceDetails(details);
            setGenerated(true);
        }
    }, [payment]);

    // Lidar com a alteração da data de expiração
    const handleExpiryChange = (event) => {
        setExpiryDays(Number(event.target.value));
        // Atualizar dados de pagamento
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + Number(event.target.value));
        payment.updatePaymentData({ expiryDate: expiryDate.toISOString() });
    };

    // Gerar referência Multibanco
    const handleGenerate = async () => {
        try {
            setLocalError('');
            const result = await payment.payWithMultibanco(expiryDays);

            if (result.success) {
                setGenerated(true);
                // Chamar callback de sucesso
                if (onGenerate) onGenerate();
            } else {
                setLocalError(result.error || 'Erro ao gerar referência Multibanco');
            }
        } catch (err) {
            console.error('Erro ao gerar referência:', err);
            setLocalError(err.message || 'Erro ao gerar referência Multibanco');
        }
    };

    // Copiar para a área de transferência
    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text).then(
            () => {
                setCopied({ ...copied, [field]: true });
                setTimeout(() => setCopied({ ...copied, [field]: false }), 2000);
            },
            (err) => console.error('Não foi possível copiar: ', err)
        );
    };

    // Formatar prazo de validade
    const formatExpiryDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return 'N/A';
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Pagamento por Referência Multibanco
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {!generated ? (
                <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                    <Typography variant="body2" paragraph>
                        Gere uma referência Multibanco para efetuar o pagamento através do Multibanco ou Homebanking.
                    </Typography>

                    <Box sx={{ mb: 3 }}>
                        <FormControl fullWidth>
                            <InputLabel id="expiry-label">Prazo de pagamento</InputLabel>
                            <Select
                                labelId="expiry-label"
                                value={expiryDays.toString()}
                                label="Prazo de pagamento"
                                onChange={handleExpiryChange}
                                disabled={loading}
                            >
                                <MenuItem value="1">1 dia</MenuItem>
                                <MenuItem value="2">2 dias</MenuItem>
                                <MenuItem value="3">3 dias</MenuItem>
                                <MenuItem value="5">5 dias</MenuItem>
                                <MenuItem value="7">7 dias</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={handleGenerate}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} /> : <BankIcon />}
                            sx={{ minWidth: 220 }}
                        >
                            {loading ? 'A gerar...' : 'Gerar Referência'}
                        </Button>
                    </Box>
                </Paper>
            ) : (
                <Paper
                    variant="outlined"
                    sx={{
                        p: 3,
                        mb: 3,
                        border: `1px solid ${theme.palette.primary.main}`,
                        borderRadius: 2,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Watermark */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%) rotate(-45deg)',
                            opacity: 0.05,
                            pointerEvents: 'none'
                        }}
                    >
                        <BankIcon sx={{ fontSize: 200 }} />
                    </Box>

                    <Box sx={{ position: 'relative' }}>
                        <Typography variant="h5" align="center" gutterBottom color="primary">
                            Referência Multibanco
                        </Typography>

                        <Typography variant="body2" align="center" paragraph>
                            Utilize os seguintes dados para efetuar o pagamento
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={3} sx={{ my: 2 }}>
                            <Grid item xs={12} sm={4}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Entidade
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 1,
                                        bgcolor: theme.palette.grey[100],
                                        p: 1.5,
                                        borderRadius: 1
                                    }}
                                >
                                    <Typography variant="h6" fontFamily="monospace" fontWeight="bold">
                                        {referenceDetails?.entity || '-----'}
                                    </Typography>
                                    <Button
                                        size="small"
                                        onClick={() => copyToClipboard(referenceDetails?.entity || '', 'entity')}
                                        startIcon={<CopyIcon />}
                                        color={copied.entity ? 'success' : 'primary'}
                                    >
                                        {copied.entity ? 'Copiado' : 'Copiar'}
                                    </Button>
                                </Box>
                            </Grid>

                            <Grid item xs={12} sm={8}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Referência
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 1,
                                        bgcolor: theme.palette.grey[100],
                                        p: 1.5,
                                        borderRadius: 1
                                    }}
                                >
                                    <Typography variant="h6" fontFamily="monospace" fontWeight="bold" letterSpacing={1}>
                                        {referenceDetails?.reference || '--- --- ---'}
                                    </Typography>
                                    <Button
                                        size="small"
                                        onClick={() => copyToClipboard(referenceDetails?.reference || '', 'reference')}
                                        startIcon={<CopyIcon />}
                                        color={copied.reference ? 'success' : 'primary'}
                                    >
                                        {copied.reference ? 'Copiado' : 'Copiar'}
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Montante
                                </Typography>
                                <Typography variant="h6" color="primary.main" fontWeight="bold">
                                    {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(referenceDetails?.amount || payment.amount)}
                                </Typography>
                            </Grid>

                            <Grid item xs={6}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Válido até
                                </Typography>
                                <Typography variant="h6">
                                    {formatExpiryDate(referenceDetails?.expiryDate)}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>
            )}

            <Box sx={{ mt: 4, p: 2, bgcolor: theme.palette.info.light + '20', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom color="info.main">
                    Como efetuar o pagamento:
                </Typography>
                <Typography variant="body2">
                    1. Aceda ao seu homebanking ou a uma caixa multibanco<br />
                    2. Selecione a opção "Pagamento de Serviços"<br />
                    3. Introduza a Entidade, Referência e Montante exatamente como indicado<br />
                    4. Confirme o pagamento<br />
                    5. Guarde o comprovativo de pagamento
                </Typography>
            </Box>
        </Box>
    );
};

export default MultibancoPayment;