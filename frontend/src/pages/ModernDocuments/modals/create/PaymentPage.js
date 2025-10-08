import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Container,
    Divider,
    Paper,
    Typography
} from '@mui/material';
import React, { useState } from 'react';

// Importar seu módulo de pagamento existente
import { notifyError, notifySuccess } from '../../../../components/common/Toaster/ThemedToaster';
import PaymentModule from '../../../../features/Payment/components/PaymentModule';
import { PaymentProvider } from '../../../../features/Payment/context/PaymentContext';
import { updateDocumentPayment } from '../../../../services/documentService';
import { useAuth } from '../../../../contexts/AuthContext';

const PaymentPage = ({ regnumber, documentData, onBack, onComplete }) => {
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();



    // Callback quando o pagamento é completado
    const handlePaymentComplete = async (paymentResult) => {
        setLoading(true);
        try {
            // Atualizar o documento com as informações de pagamento
            const paymentData = {
                regnumber: regnumber,
                payment_method: paymentResult.method,
                payment_amount: documentData.amount || 50,
                payment_reference: paymentResult.transactionId || '',
                payment_date: new Date().toISOString().split('T')[0],
                payment_status: 'PAID'
            };

            const response = await updateDocumentPayment(paymentData);

            if (response && response.success) {
                notifySuccess("Pagamento processado com sucesso!");

                // Chamar callback de conclusão
                if (onComplete) {
                    onComplete(paymentData);
                }
            }
        } catch (error) {
            notifyError("Erro ao registrar pagamento: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Callback quando o pagamento é cancelado
    const handlePaymentCancel = () => {
        if (onBack) onBack();
    };

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 3, mt: 3, mb: 3 }}>
                <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h5">
                        Pagamento do Pedido #{regnumber}
                    </Typography>
                </Box>

                <Divider sx={{ mb: 3 }} />

                <Box mb={3}>
                    <Alert severity="info">
                        Pedido <strong>#{regnumber}</strong> criado com sucesso.
                        Finalize o processo realizando o pagamento.
                    </Alert>
                </Box>

                {/* Usar seu módulo de pagamento existente */}
                <PaymentProvider>
                    <PaymentModule
                        orderId={regnumber}
                        amount={documentData.amount || 50}
                        onComplete={handlePaymentComplete}
                        onCancel={handlePaymentCancel}
                        userInfo={user ? { ...user } : null}
                    />
                </PaymentProvider>

                <Box display="flex" justifyContent="flex-start" mt={3}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={onBack}
                        disabled={loading}
                    >
                        Voltar
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default PaymentPage;