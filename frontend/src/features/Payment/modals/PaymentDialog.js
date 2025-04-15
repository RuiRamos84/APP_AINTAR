import { Close as CloseIcon } from '@mui/icons-material';
import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton, Typography
} from '@mui/material';
import React from 'react';
import PaymentModule from '../components/PaymentModule';
import { PaymentProvider } from '../context/PaymentContext';

const PaymentDialog = ({ open, onClose, paymentData }) => {
    const handleComplete = (result) => {
        console.log('Pagamento concluído:', result);
        onClose(true, result);
    };

    const handleCancel = () => {
        onClose(false);
    };

    if (!paymentData) return null;

    return (
        <Dialog
            open={open}
            onClose={handleCancel}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        Pagamento de Documento - {paymentData.orderId} ({paymentData.amount}€)
                    </Typography>
                    <IconButton edge="end" onClick={handleCancel}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                <PaymentProvider initialData={paymentData}>
                    <PaymentModule
                        orderId={paymentData.orderId}
                        amount={paymentData.amount}
                        onComplete={handleComplete}
                        onCancel={handleCancel}
                    />
                </PaymentProvider>
            </DialogContent>
        </Dialog>
    );
};

export default PaymentDialog;