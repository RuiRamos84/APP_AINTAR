import React, { useState } from 'react';
import {
    Dialog, DialogContent, IconButton,
    Box, Typography, useTheme, useMediaQuery, alpha,
} from '@mui/material';
import { Close as CloseIcon, Payment as PaymentIcon } from '@mui/icons-material';
import PaymentModule from '../PaymentModule';

const PaymentDialog = ({ open, onClose, documentId, amount, regnumber }) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const [step, setStep] = useState(0);

    const handleComplete = (result) => {
        if (onClose) onClose(result);
    };

    return (
        <Dialog
            open={open}
            onClose={() => onClose && onClose(null)}
            fullScreen={fullScreen}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: fullScreen ? 0 : 3,
                    minHeight: '50vh',
                    overflow: 'hidden',
                }
            }}
        >
            {/* Header com gradiente subtil */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 3,
                    py: 1.75,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.dark, 0.9)} 100%)`,
                    color: 'white',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 36, height: 36, borderRadius: 2,
                            bgcolor: alpha('#fff', 0.15),
                        }}
                    >
                        <PaymentIcon sx={{ fontSize: 20, color: 'white' }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700} color="white" lineHeight={1.2}>
                            Pagamento
                        </Typography>
                        {regnumber && (
                            <Typography variant="caption" sx={{ color: alpha('#fff', 0.75) }}>
                                Processo {regnumber}
                            </Typography>
                        )}
                    </Box>
                </Box>
                <IconButton
                    onClick={() => onClose && onClose(null)}
                    size="small"
                    sx={{ color: 'white', '&:hover': { bgcolor: alpha('#fff', 0.15) } }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            <DialogContent sx={{ p: 0 }}>
                <PaymentModule
                    documentId={documentId}
                    amount={amount}
                    regnumber={regnumber}
                    step={step}
                    onStepChange={setStep}
                    onComplete={handleComplete}
                />
            </DialogContent>
        </Dialog>
    );
};

export default PaymentDialog;
