import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Box,
    Typography,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import PaymentModule from '../PaymentModule'; // Adjust path if needed. PaymentModule is in ../components relative to modals? 
// Actually PaymentDialog is in components/modals. PaymentModule is in components.
// So path is '../PaymentModule' if PaymentDialog is in 'components/modals'.
// Let's verify directory structure: 
// c:\Users\rui.ramos\Desktop\APP\frontend-v2\src\features\payments\components\PaymentModule.jsx
// c:\Users\rui.ramos\Desktop\APP\frontend-v2\src\features\payments\components\modals\PaymentDialog.jsx
// Path should be '../PaymentModule'.

const PaymentDialog = ({ 
    open, 
    onClose, 
    documentId, 
    amount, 
    regnumber 
}) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const [step, setStep] = useState(0);

    const handleComplete = (result) => {
        // Result might contain status, transactionId etc.
        if (onClose) onClose(result);
    };

    return (
        <Dialog
            open={open}
            onClose={() => onClose && onClose(null)} // Click outside or esc
            fullScreen={fullScreen}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { borderRadius: fullScreen ? 0 : 2, minHeight: '50vh' }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box>
                    <Typography variant="h6" fontWeight="bold">Pagamento</Typography>
                    {regnumber && (
                        <Typography variant="body2" color="text.secondary">
                            Processo: {regnumber}
                        </Typography>
                    )}
                </Box>
                <IconButton onClick={() => onClose && onClose(null)} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            
            <DialogContent dividers={false} sx={{ p: 0 }}>
                 <Box sx={{ p: 0 }}>
                    <PaymentModule
                        documentId={documentId}
                        amount={amount}
                        step={step}
                        onStepChange={setStep}
                        onComplete={handleComplete}
                    />
                 </Box>
            </DialogContent>
        </Dialog>
    );
};

export default PaymentDialog;
