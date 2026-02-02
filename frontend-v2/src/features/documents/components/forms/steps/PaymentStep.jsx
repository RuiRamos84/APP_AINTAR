import React, { useState } from 'react';
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
import PaymentModule from '../../../../payments/components/PaymentModule';
import { useAuth } from '../../../../auth/context/AuthContext'; // Verify path
import { PaymentProvider } from '../../../../payments/context/PaymentContext';

const PaymentStep = ({
    formData,
    paymentInfo,
    setPaymentInfo,
    handlePaymentChange
}) => {
    const theme = useTheme();
    // const { user } = useAuth(); // If needed for PaymentModule, but PaymentModule uses it internally
    const [step, setStep] = useState(0);

    const calculatePaymentAmount = () => {
        // Defaults to 50 for now as in legacy
        return paymentInfo?.amount || 50; 
    };

    const getOrderId = () => {
        // Generate temporary ID for creation flow
         const prefix = formData?.nipc ? `DOC-${formData.nipc}` : 'DOC';
         return `${prefix}-${Date.now().toString().slice(-6)}`;
    };

    const handlePaymentComplete = (paymentResult) => {
        const updatedPaymentInfo = {
            method: paymentResult.method || 'UNKNOWN',
            amount: paymentResult.amount || calculatePaymentAmount(),
            reference: paymentResult.transactionId || '',
            date: new Date().toISOString().split('T')[0],
            status: 'PAID'
        };

        setPaymentInfo(updatedPaymentInfo);
        // Also update parent if needed via handlePaymentChange wrapper
        // handlePaymentChange(updatedPaymentInfo);
    };

    const hasPaymentInfo = paymentInfo && paymentInfo.status === 'PAID';

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
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
                        <Typography variant="h6">Informação de Pagamento</Typography>
                    </Box>

                    {hasPaymentInfo ? (
                         <Box sx={{ p: 2, border: `1px solid ${theme.palette.success.light}`, borderRadius: 1 }}>
                            <Typography variant="subtitle1" gutterBottom color="success.main">Pagamento Confirmado</Typography>
                            <Typography>Valor: {paymentInfo.amount}€</Typography>
                            <Typography>Ref: {paymentInfo.reference}</Typography>
                         </Box>
                    ) : (
                        <PaymentProvider>
                            <PaymentModule
                                documentId={getOrderId()} // Passing generated Order ID as documentId
                                amount={calculatePaymentAmount()}
                                step={step}
                                onStepChange={setStep}
                                onComplete={handlePaymentComplete}
                                paymentStatus={hasPaymentInfo ? 'success' : null}
                            />
                        </PaymentProvider>
                    )}
                </Paper>
            </Grid>
        </Grid>
    );
};

export default PaymentStep;
