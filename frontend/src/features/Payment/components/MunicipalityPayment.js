// frontend/src/features/Payment/components/MunicipalityPayment.js

import React, { useState, useEffect, useContext } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Autocomplete,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { LocationCity as MunicipalityIcon } from '@mui/icons-material';
import { PaymentContext } from '../context/PaymentContext';
import { PAYMENT_METHODS } from '../services/paymentTypes';

const MunicipalityPayment = ({ onSubmit, loading: externalLoading, error: externalError, userInfo }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const payment = useContext(PaymentContext);

    // Estados
    const [municipality, setMunicipality] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentDate, setPaymentDate] = useState('');
    const [localError, setLocalError] = useState('');
    const [success, setSuccess] = useState(false);
    const [authorized, setAuthorized] = useState(false);

    const loading = externalLoading || payment.state.loading;
    const error = externalError || payment.state.error || localError;

    // Lista de municípios (exemplo - deve vir do backend)
    const municipalities = [
        { id: 1, name: 'Lisboa' },
        { id: 2, name: 'Porto' },
        { id: 3, name: 'Setúbal' },
        { id: 4, name: 'Almada' },
        { id: 5, name: 'Seixal' },
        // Adicionar mais conforme necessário
    ];

    // Verificar autorização
    useEffect(() => {
        const hasPermission = userInfo && ['0', '2'].includes(userInfo.profil);
        setAuthorized(hasPermission);

        if (!hasPermission) {
            setLocalError('Não tem permissão para usar este método de pagamento.');
        }
    }, [userInfo]);

    // Definir método de pagamento
    useEffect(() => {
        if (payment.state.selectedMethod !== PAYMENT_METHODS.MUNICIPALITY) {
            payment.selectPaymentMethod(PAYMENT_METHODS.MUNICIPALITY);
        }
    }, []);

    const handlePay = async () => {
        if (!authorized) {
            setLocalError('Sem permissão para usar este método de pagamento.');
            return;
        }

        // Validações
        if (!municipality) {
            setLocalError('Por favor, selecione o município');
            return;
        }

        if (!paymentReference.trim()) {
            setLocalError('Por favor, forneça a referência do pagamento');
            return;
        }

        if (!paymentDate) {
            setLocalError('Por favor, forneça a data do pagamento');
            return;
        }

        setLocalError('');

        try {
            const referenceInfo = JSON.stringify({
                municipality: municipality,
                paymentReference: paymentReference,
                paymentDate: paymentDate,
                paymentLocation: `Município de ${municipality}`
            });

            payment.updatePaymentData({
                referenceInfo: referenceInfo,
                municipality: municipality,
                paymentReference: paymentReference,
                paymentDate: paymentDate
            });

            const result = await payment.registerManualPayment(
                payment.state.orderId,
                payment.state.amount,
                PAYMENT_METHODS.MUNICIPALITY,
                referenceInfo
            );

            if (result && result.success) {
                // Atualizar o transactionId e status no contexto
                if (result.data && result.data.transaction_id) {
                    payment.updatePaymentData({
                        transactionId: result.data.transaction_id,
                        status: result.data.status || 'PENDING_VALIDATION'
                    });
                }

                setSuccess(true);
                if (onSubmit) onSubmit();
            } else {
                const errorMsg = (result && result.error) || 'Erro ao registar pagamento';
                setLocalError(errorMsg);
            }
        } catch (err) {
            console.error('Erro ao processar pagamento:', err);
            setLocalError('Erro ao processar pagamento: ' + (err.message || 'Erro desconhecido'));
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Pagamento nos Municípios
            </Typography>

            <Typography variant="body2" paragraph>
                Registe um pagamento realizado nos balcões municipais.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    Pagamento registado com sucesso. Aguardando validação.
                </Alert>
            )}

            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
                <Box display="flex" flexDirection="column" gap={2}>
                    <Autocomplete
                        options={municipalities.map(m => m.name)}
                        value={municipality}
                        onChange={(_, newValue) => setMunicipality(newValue)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Município"
                                variant="outlined"
                                error={!!localError && !municipality}
                                helperText={(!municipality && localError) ? "Campo obrigatório" : ""}
                            />
                        )}
                        disabled={loading || success || !authorized}
                        fullWidth
                    />

                    <TextField
                        fullWidth
                        label="Referência do Pagamento"
                        variant="outlined"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        disabled={loading || success || !authorized}
                        error={!!localError && !paymentReference.trim()}
                        helperText={(!paymentReference.trim() && localError) ? "Campo obrigatório" : "Ex: Recibo nº 12345"}
                    />

                    <TextField
                        fullWidth
                        label="Data do Pagamento"
                        variant="outlined"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        disabled={loading || success || !authorized}
                        error={!!localError && !paymentDate}
                        helperText={(!paymentDate && localError) ? "Campo obrigatório" : ""}
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={handlePay}
                            disabled={loading || success || !municipality || !paymentReference.trim() || !paymentDate || !authorized}
                            startIcon={loading ? <CircularProgress size={20} /> : <MunicipalityIcon />}
                            sx={{
                                minWidth: { xs: '100%', sm: 200 },
                                py: isMobile ? 1.5 : 1
                            }}
                        >
                            {loading ? 'A processar...' : 'Registar Pagamento'}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            <Box sx={{
                mt: 4,
                p: 2,
                bgcolor: theme.palette.info.light + '20',
                borderRadius: 1,
                fontSize: isMobile ? '0.875rem' : '1rem'
            }}>
                <Typography variant="subtitle2" gutterBottom color="info.main">
                    Informações Importantes:
                </Typography>
                <Typography variant="body2">
                    1. Este pagamento está sujeito a validação posterior<br />
                    2. Guarde o recibo emitido pelo município<br />
                    3. A referência do pagamento deve corresponder ao recibo oficial<br />
                    4. O pagamento será confirmado após validação administrativa
                </Typography>
            </Box>
        </Box>
    );
};

export default MunicipalityPayment;