import React, { useState } from 'react';
import {
    Dialog, DialogContent, IconButton, Box, Typography,
    Slide, useTheme, useMediaQuery, LinearProgress
} from '@mui/material';
import { Close, Receipt } from '@mui/icons-material';
import { PaymentProvider } from '../context/PaymentContext';
import PaymentModule from '../components/PaymentModule';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const steps = [
    { label: 'Método', icon: 'payment' },
    { label: 'Pagamento', icon: 'process' },
    { label: 'Confirmação', icon: 'check' }
];

const PaymentDialog = ({ open, onClose, documentId, amount, documentNumber }) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);

    const handleComplete = (result) => {
        onClose(true, result);
    };

    const handleClose = () => {
        onClose(false);
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="lg"
            fullWidth
            fullScreen={fullScreen}
            TransitionComponent={Transition}
            PaperProps={{
                sx: {
                    borderRadius: fullScreen ? 0 : 3,
                    overflow: 'hidden',
                    background: 'linear-gradient(145deg, #f5f7fa 0%, #c3cfe2 100%)'
                }
            }}
        >
            {/* Progress Bar */}
            {loading && (
                <LinearProgress
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 10000
                    }}
                />
            )}

            {/* Header */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    p: { xs: 1.5, md: 2 },
                    position: 'relative'
                }}
            >
                {/* Close Button */}
                <IconButton
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        zIndex: 9999,
                        size: 'small',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                    }}
                    onClick={handleClose}
                >
                    <Close fontSize="small" />
                </IconButton>

                {/* Compact Header */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pr: 5,
                    mb: 2
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Receipt sx={{ fontSize: 24, opacity: 0.9 }} />
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                Pagamento {documentNumber && `#${documentNumber}`}
                            </Typography>
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.2)',
                            px: 2,
                            py: 0.5,
                            borderRadius: 2
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            €{Number(amount || 0).toFixed(2)}
                        </Typography>
                    </Box>
                </Box>

                {/* Compact Stepper */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 3
                }}>
                    {steps.map((stepItem, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                                sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    backgroundColor: index <= step ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                                    color: index <= step ? 'primary.main' : 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 600,
                                    fontSize: 12,
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {index + 1}
                            </Box>
                            {!isMobile && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        opacity: index <= step ? 1 : 0.7,
                                        fontWeight: index === step ? 600 : 400,
                                        fontSize: 11
                                    }}
                                >
                                    {stepItem.label}
                                </Typography>
                            )}
                            {index < steps.length - 1 && (
                                <Box
                                    sx={{
                                        width: 30,
                                        height: 1,
                                        backgroundColor: index < step ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                                        mx: 1
                                    }}
                                />
                            )}
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* Content */}
            <DialogContent sx={{ p: 0, bgcolor: 'transparent' }}>
                <PaymentProvider>
                    <PaymentModule
                        documentId={documentId}
                        amount={Number(amount || 0)}
                        documentNumber={documentNumber}
                        step={step}
                        onStepChange={setStep}
                        onLoadingChange={setLoading}
                        onComplete={handleComplete}
                    />
                </PaymentProvider>
            </DialogContent>

            {/* Footer Info */}
            {!fullScreen && (
                <Box
                    sx={{
                        p: 2,
                        bgcolor: 'white',
                        borderTop: 1,
                        borderColor: 'divider',
                        textAlign: 'center'
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        Pagamento seguro • SSL encriptado • Dados protegidos
                    </Typography>
                </Box>
            )}
        </Dialog>
    );
};

export default PaymentDialog;