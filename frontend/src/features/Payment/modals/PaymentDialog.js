import React from 'react';
import {
    Dialog, DialogContent, IconButton, Box, Typography,
    Slide, Paper, useTheme, useMediaQuery
} from '@mui/material';
import { Close, Receipt } from '@mui/icons-material';
import { PaymentProvider } from '../context/PaymentContext';
import PaymentModule from '../components/PaymentModule';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const PaymentDialog = ({ open, onClose, documentId, amount, documentNumber }) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

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
            {/* Header */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    p: 3,
                    position: 'relative'
                }}
            >
                {/* Close Button */}
                <IconButton
                    onClick={handleClose}
                    sx={{
                        position: 'absolute',
                        right: 16,
                        top: 16,
                        color: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                    }}
                >
                    <Close />
                </IconButton>

                {/* Header Content */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pr: 6 }}>
                    <Paper
                        sx={{
                            p: 2,
                            bgcolor: 'rgba(255,255,255,0.15)',
                            borderRadius: 2
                        }}
                    >
                        <Receipt sx={{ fontSize: 32, color: 'white' }} />
                    </Paper>

                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                            Pagamento de Documento
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body1" sx={{ opacity: 0.9 }}>
                                {documentNumber && `Doc: ${documentNumber}`}
                            </Typography>
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
                    </Box>
                </Box>

                {/* Background Decorations */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: 200,
                        height: 200,
                        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                        transform: 'translate(50%, -50%)'
                    }}
                />
            </Box>

            {/* Content */}
            <DialogContent sx={{ p: 0, bgcolor: 'transparent' }}>
                <PaymentProvider>
                    <PaymentModule
                        documentId={documentId}
                        amount={Number(amount || 0)}
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