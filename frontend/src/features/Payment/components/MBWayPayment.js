import { PhoneAndroid as PhoneIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    InputAdornment,
    Paper,
    TextField,
    Typography,
    useTheme
} from '@mui/material';
import React, { useContext, useState, useEffect } from 'react';
import { PaymentContext } from '../context/PaymentContext';
import { PAYMENT_METHODS } from '../services/paymentTypes';

/**
 * Componente para pagamento via MB WAY
 * @param {Object} props - Propriedades do componente
 * @param {Function} props.onSubmit - Função chamada após submissão bem-sucedida
 * @param {boolean} props.loading - Indica se está processando o pagamento
 * @param {string} props.error - Mensagem de erro, se houver
 */
const MBWayPayment = ({ onSubmit, loading: externalLoading, error: externalError }) => {
    const theme = useTheme();
    const payment = useContext(PaymentContext);

    // Estado local para o número de telefone
    const [phoneNumber, setPhoneNumber] = useState('');
    const [localError, setLocalError] = useState('');
    const [success, setSuccess] = useState(false);
    const loading = externalLoading || payment.state.loading;
    const error = externalError || payment.state.error || localError;

    // Garantir que o método de pagamento está definido como MBWAY
    useEffect(() => {
        // Verificar se o método já está selecionado
        if (payment.state.selectedMethod !== PAYMENT_METHODS.MBWAY) {
            console.log("Selecionando método de pagamento MBWAY");
            payment.selectPaymentMethod(PAYMENT_METHODS.MBWAY);
        }
    }, []);

    // Verificar se temos os dados do pedido
    useEffect(() => {
        if (payment.state.orderId && payment.state.amount) {
            console.log("Detalhes do pedido confirmados:", payment.state.orderId, payment.state.amount);
        }
    }, [payment.state.orderId, payment.state.amount]);

    // Validar número de telefone
    const validatePhone = (phone) => {
        if (!phone) {
            return 'Número de telefone é obrigatório';
        }

        // Verificar se começa com 9 e tem 9 dígitos
        const phonePattern = /^9\d{8}$/;
        if (!phonePattern.test(phone)) {
            return 'Formato inválido. O número deve começar com 9 e ter 9 dígitos (ex: 912345678)';
        }

        return '';
    };

    // Formatar para padrão MBWAY (351# + número)
    const formatPhoneForMBWay = (phone) => {
        if (!phone) return '';
        return `351#${phone}`;
    };

    // Submeter pagamento MB WAY
    const handlePay = async () => {
        console.log("Iniciando pagamento MB WAY");

        // Validar número de telefone
        const phoneError = validatePhone(phoneNumber);
        if (phoneError) {
            setLocalError(phoneError);
            return;
        }

        setLocalError('');

        try {
            // Formatar número para padrão MBWAY
            const formattedNumber = formatPhoneForMBWay(phoneNumber);
            console.log("Número formatado:", formattedNumber);

            // Atualizar dados de pagamento
            payment.updatePaymentData({
                phoneNumber: formattedNumber
            });

            console.log("Iniciando pagamento com número:", formattedNumber);

            // Processar pagamento
            const result = await payment.processMBWayPayment(
                payment.state.orderId,
                payment.state.amount,
                formattedNumber
            );

            console.log("Resultado do pagamento:", result);

            if (result && result.success) {
                // Tentar encontrar o ID da transação
                let transactionId = null;

                if (result.data) {
                    if (result.data.transaction_id) {
                        transactionId = result.data.transaction_id;
                    } else if (result.data.mbway_response && result.data.mbway_response.transactionID) {
                        transactionId = result.data.mbway_response.transactionID;
                        console.log("Transaction ID encontrado em mbway_response:", transactionId);
                    }
                }

                if (transactionId) {
                    // Garantir que o ID esteja no state para verificação posterior
                    payment.updatePaymentData({ transactionId });
                }

                console.log("Pagamento MB WAY iniciado com sucesso");
                setSuccess(true);

                if (onSubmit) onSubmit();
            } else {
                const errorMsg = (result && result.error) || 'Erro ao processar pagamento MB WAY';
                console.error("Erro no pagamento MB WAY:", errorMsg);
                setLocalError(errorMsg);
            }
        } catch (err) {
            console.error('Erro ao processar o pagamento:', err);
            setLocalError('Erro ao processar o pagamento: ' + (err.message || 'Erro desconhecido'));
        }
    };

    // Lidar com a alteração do número de telefone
    const handlePhoneChange = (e) => {
        const value = e.target.value;
        // Permitir apenas dígitos
        if (/^\d*$/.test(value)) {
            setPhoneNumber(value);

            // Limpar erro se o campo não estiver vazio
            if (value && localError) {
                setLocalError('');
            }
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Pagamento por MB WAY
            </Typography>

            <Typography variant="body2" paragraph>
                Introduza o número de telemóvel associado à sua conta MB WAY
            </Typography>

            {(error || localError) && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error || localError}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    Pedido de pagamento enviado para a sua aplicação MB WAY. Por favor, confirme na aplicação.
                </Alert>
            )}

            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Box display="flex" flexDirection="column" gap={2}>
                    <TextField
                        fullWidth
                        label="Número de Telemóvel"
                        variant="outlined"
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        disabled={loading || success}
                        error={!!localError}
                        helperText={localError || "Ex: 912345678"}
                        inputProps={{ maxLength: 9 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <PhoneIcon color="primary" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={handlePay}
                            disabled={loading || success || !phoneNumber}
                            startIcon={loading ? <CircularProgress size={20} /> : null}
                            sx={{ minWidth: 200 }}
                        >
                            {loading ? 'A processar...' : 'Pagar com MB WAY'}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            <Box sx={{ mt: 4, p: 2, bgcolor: theme.palette.info.light + '20', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom color="info.main">
                    Como funciona:
                </Typography>
                <Typography variant="body2">
                    1. Introduza o número do telemóvel associado à sua conta MB WAY<br />
                    2. Clique em "Pagar com MB WAY"<br />
                    3. Confirme o pagamento na sua aplicação MB WAY<br />
                    4. O pagamento será processado imediatamente
                </Typography>
            </Box>
        </Box>
    );
};

export default MBWayPayment;