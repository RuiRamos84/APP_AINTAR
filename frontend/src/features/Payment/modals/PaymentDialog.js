import React from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { PaymentProvider } from '../context/PaymentContext';
import PaymentModule from '../components/PaymentModule';

const PaymentDialog = ({ open, onClose, documentId, amount }) => {
    const handleComplete = (result) => {
        onClose(true, result);
    };

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="md" fullWidth>
            <DialogTitle>
                Pagamento - €{amount}
                <IconButton
                    onClick={() => onClose(false)}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <PaymentProvider>
                    <PaymentModule
                        documentId={documentId}
                        amount={amount}
                        onComplete={handleComplete}
                    />
                </PaymentProvider>
            </DialogContent>
        </Dialog>
    );
};

export default PaymentDialog;