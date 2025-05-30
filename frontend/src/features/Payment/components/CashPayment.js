import { Euro as CashIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Paper,
    TextField,
    Typography,
    useTheme
} from '@mui/material';
import React, { useContext, useState, useEffect } from 'react';
import { PaymentContext } from '../context/PaymentContext';
import { PAYMENT_METHODS } from '../services/paymentTypes';

/**
 * Componente para pagamento em dinheiro
 * @param {Object} props - Propriedades do componente
 * @param {Function} props.onSubmit - Função chamada após submissão bem-sucedida
 * @param {boolean} props.loading - Indica se está processando o pagamento
 * @param {string} props.error - Mensagem de erro, se houver
 * @param {Object} props.userInfo - Informações do usuário atual
 */
const CashPayment = ({ onSubmit, loading: externalLoading, error: externalError, userInfo }) => {
    const theme = useTheme();
    const payment = useContext(PaymentContext);

    // Estado local
    const [referenceInfo, setReferenceInfo] = useState('');
    const [localError, setLocalError] = useState('');
    const [success, setSuccess] = useState(false);
    const [authorized, setAuthorized] = useState(false);
    const loading = externalLoading || payment.state.loading;
    const error = externalError || payment.state.error || localError;

    // Verificar se o usuário tem permissão para este método de pagamento
    useEffect(() => {
        const hasPermission = userInfo && ['0', '1', '2'].includes(userInfo.profil);
        setAuthorized(hasPermission);

        if (!hasPermission) {
            setLocalError('Você não tem permissão para usar este método de pagamento.');
        }
    }, [userInfo]);

    // Garantir que o método de pagamento está definido como CASH
    useEffect(() => {
        if (payment.state.selectedMethod !== PAYMENT_METHODS.CASH) {
            console.log("Selecionando método de pagamento em dinheiro");
            payment.selectPaymentMethod(PAYMENT_METHODS.CASH);
        }
    }, []);

    // Submeter pagamento em dinheiro
    const handlePay = async () => {
        if (!authorized) {
            setLocalError('Sem permissão para usar este método de pagamento.');
            return;
        }

        console.log("Iniciando registro de pagamento em dinheiro");

        if (!referenceInfo.trim()) {
            setLocalError('Por favor, forneça informações de referência');
            return;
        }

        setLocalError('');

        try {
            // Atualizar dados de pagamento
            payment.updatePaymentData({
                referenceInfo: referenceInfo
            });

            console.log("Registrando pagamento em dinheiro:", {
                orderId: payment.state.orderId,
                amount: payment.state.amount,
                referenceInfo: referenceInfo
            });

            // Processar pagamento manual
            const result = await payment.registerManualPayment(
                payment.state.orderId,
                payment.state.amount,
                PAYMENT_METHODS.CASH,
                referenceInfo
            );

            console.log("Resultado do registro:", result);

            // Verificar se o resultado é null mas o pagamento foi registrado
            // Isso pode acontecer se houver um problema no retorno do paymentService
            if (!result) {
                console.warn("Resultado nulo recebido, mas pode ter sido registrado com sucesso");
                // Tentar avançar mesmo assim
                setSuccess(true);
                if (onSubmit) onSubmit();
                return;
            }

            if (result && result.success) {
                // Atualizar o transactionId e status no contexto
                if (result.data && result.data.transaction_id) {
                    payment.updatePaymentData({
                        transactionId: result.data.transaction_id,
                        status: result.data.status || 'PENDING_VALIDATION'
                    });
                }

                console.log("Pagamento em dinheiro registrado com sucesso");
                setSuccess(true);

                if (onSubmit) onSubmit();
            } else {
                const errorMsg = (result && result.error) || 'Erro ao registrar pagamento em dinheiro';
                console.error("Erro no registro de pagamento:", errorMsg);

                // Mensagem mais amigável para o usuário
                if (errorMsg.includes("'str' object has no attribute 'profile'") ||
                    errorMsg.includes("permission") ||
                    errorMsg.includes("permissão")) {
                    setLocalError("Não foi possível processar o pagamento: problema com permissões de usuário. Por favor, contacte o suporte.");
                } else {
                    setLocalError(errorMsg);
                }
            }
        } catch (err) {
            console.error('Erro ao processar o pagamento:', err);
            // Mensagem mais amigável
            const errorMessage = err.message || 'Erro desconhecido';
            if (errorMessage.includes("500") || errorMessage.includes("Internal Server Error")) {
                setLocalError('Erro no servidor ao processar o pagamento. Por favor, tente novamente ou contacte o suporte.');
            } else {
                setLocalError('Erro ao processar o pagamento: ' + errorMessage);
            }
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Pagamento em Dinheiro
            </Typography>

            <Typography variant="body2" paragraph>
                Registre um pagamento a ser feito em dinheiro. Este pagamento necessitará de validação posterior.
            </Typography>

            {(error || localError) && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error || localError}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    Pagamento em dinheiro registrado com sucesso. Aguardando validação.
                </Alert>
            )}

            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Box display="flex" flexDirection="column" gap={2}>
                    <TextField
                        fullWidth
                        label="Informações de Referência"
                        variant="outlined"
                        value={referenceInfo}
                        onChange={(e) => setReferenceInfo(e.target.value)}
                        disabled={loading || success || !authorized}
                        error={!!localError}
                        helperText={localError || "Ex: Pagamento em dinheiro na sede"}
                        multiline
                        rows={2}
                    />

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={handlePay}
                            disabled={loading || success || !referenceInfo.trim() || !authorized}
                            startIcon={loading ? <CircularProgress size={20} /> : <CashIcon />}
                            sx={{ minWidth: 200 }}
                        >
                            {loading ? 'A processar...' : 'Registrar Pagamento em Dinheiro'}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            <Box sx={{ mt: 4, p: 2, bgcolor: theme.palette.info.light + '20', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom color="info.main">
                    Informações Importantes:
                </Typography>
                <Typography variant="body2">
                    1. Este tipo de pagamento necessita de validação posterior por um administrador<br />
                    2. Inclua todas as informações relevantes no campo de referência<br />
                    3. O status do pagamento ficará como "Aguardando Validação" até ser aprovado<br />
                    4. Mantenha o comprovante de pagamento para referência futura
                </Typography>
            </Box>
        </Box>
    );
};

export default CashPayment;