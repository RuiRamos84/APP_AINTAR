import {
    Payment as PaymentIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Grid,
    Paper,
    Typography,
    useTheme
} from '@mui/material';
import React, { useState } from 'react';

// Importar componentes do módulo de pagamento
import PaymentModule from '../../../../../features/Payment/components/PaymentModule';
import { PaymentProvider } from '../../../../../features/Payment/context/PaymentContext';
import { useAuth } from '../../../../../contexts/AuthContext';

/**
 * Componente PaymentStep ajustado para usar o novo módulo de pagamentos
 */
const PaymentStep = ({
    formData,
    handleChange,
    paymentMethod,
    setPaymentMethod,
    paymentInfo,
    setPaymentInfo,
    handlePaymentMethodChange,
    handlePaymentChange,
    handlePaymentProofUpload,
    errors,
    loading,
    lastDocument
}) => {
    const theme = useTheme();
    const { user } = useAuth();
    const [paymentComplete, setPaymentComplete] = useState(false);
    const [paymentError, setPaymentError] = useState(null);

    // Calcula o valor do pagamento com base nos parâmetros do documento
    const calculatePaymentAmount = () => {
        // Podemos recuperar o valor de algum campo específico do formData
        // ou usar um valor fixo dependendo da lógica de negócio
        return paymentInfo?.amount || 50; // Valor padrão de 50€ se não estiver definido
    };

    // Gerar um ID de pedido consistente e seguro
    const getOrderId = () => {
        // Usar nipc como parte do ID se disponível
        const prefix = formData?.nipc ? `DOC-${formData.nipc}` : 'DOC';
        // Adicionar timestamp para garantir unicidade
        return `${prefix}-${Date.now().toString().slice(-6)}`;
    };

    // Callback quando o pagamento é completado
    const handlePaymentComplete = (paymentResult) => {
        setPaymentComplete(true);

        // Atualizar o formData com as informações de pagamento
        const updatedPaymentInfo = {
            method: paymentResult.method,
            amount: paymentResult.amount || calculatePaymentAmount(),
            reference: paymentResult.transactionId || '',
            date: new Date().toISOString().split('T')[0],
            status: 'PAID'
        };

        // Atualizar o estado do formulário
        setPaymentInfo(updatedPaymentInfo);
        setPaymentMethod(paymentResult.method);

        // Criar evento sintético para notificar a mudança
        handlePaymentMethodChange({
            target: { value: paymentResult.method }
        });
    };

    // Callback quando o pagamento é cancelado
    const handlePaymentCancel = () => {
        setPaymentError("Pagamento cancelado pelo usuário");
    };

    // Verificar se já temos informações de pagamento preenchidas
    const hasPaymentInfo = paymentInfo && paymentInfo.reference && paymentInfo.amount;

    return (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
                <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                    }}
                >
                    <Box display="flex" alignItems="center" mb={2}>
                        <PaymentIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">
                            Informação de Pagamento
                        </Typography>
                    </Box>

                    {paymentComplete && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            Pagamento processado com sucesso!
                        </Alert>
                    )}

                    {paymentError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {paymentError}
                        </Alert>
                    )}

                    {hasPaymentInfo ? (
                        // Exibir resumo do pagamento já realizado
                        <Box sx={{ p: 2, border: `1px solid ${theme.palette.success.light}`, borderRadius: 1 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Pagamento registrado
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Método:
                                    </Typography>
                                    <Typography variant="body1">
                                        {paymentMethod === 'mbway' ? 'MB WAY' :
                                            paymentMethod === 'multibanco' ? 'Multibanco' :
                                                paymentMethod === 'transferencia' ? 'Transferência Bancária' :
                                                    paymentMethod === 'cheque' ? 'Cheque' :
                                                        paymentMethod === 'gratuito' ? 'Gratuito' : paymentMethod}
                                    </Typography>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Valor:
                                    </Typography>
                                    <Typography variant="body1" fontWeight="bold">
                                        {paymentInfo.amount}€
                                    </Typography>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Referência:
                                    </Typography>
                                    <Typography variant="body1">
                                        {paymentInfo.reference}
                                    </Typography>
                                </Grid>

                                {paymentInfo.date && (
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Data:
                                        </Typography>
                                        <Typography variant="body1">
                                            {new Date(paymentInfo.date).toLocaleDateString('pt-PT')}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    ) : (
                        // Exibir o módulo de pagamento se não houver pagamento registrado
                        <PaymentProvider>
                            <PaymentModule
                                orderId={getOrderId()}
                                amount={calculatePaymentAmount()}
                                onComplete={handlePaymentComplete}
                                onCancel={handlePaymentCancel}
                                userInfo={user}
                            />
                        </PaymentProvider>
                    )}
                </Paper>
            </Grid>
        </Grid>
    );
};

export default PaymentStep;
