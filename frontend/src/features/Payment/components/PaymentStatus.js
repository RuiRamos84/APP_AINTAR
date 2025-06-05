import React, { useContext, useEffect, useState } from 'react';
import {
    Box, Paper, Button, Fade, Slide, Typography, LinearProgress, Alert,
    useTheme, useMediaQuery
} from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { PaymentContext } from '../context/PaymentContext';
import { getAvailableMethodsForProfile } from '../services/paymentTypes';
import { useAuth } from '../../../contexts/AuthContext';

// Componentes
import PaymentMethodSelector from './PaymentMethodSelector';
import MBWayPayment from './MBWayPayment';
import MultibancoPayment from './MultibancoPayment';
import CashPayment from './CashPayment';
import BankTransferPayment from './BankTransferPayment';
import MunicipalityPayment from './MunicipalityPayment';
import PaymentStatus from './PaymentStatus';

const steps = [
    { label: 'Método', icon: 'payment' },
    { label: 'Pagamento', icon: 'process' },
    { label: 'Confirmação', icon: 'check' }
];

const PaymentModule = ({ documentId, amount, onComplete, documentNumber }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuth();
    const payment = useContext(PaymentContext);
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState('forward');
    const [checkoutReady, setCheckoutReady] = useState(false);

    const availableMethods = getAvailableMethodsForProfile(user?.profil);

    useEffect(() => {
        const initPayment = async () => {
            payment.setOrderDetails(documentId, amount, availableMethods, documentNumber);

            const needsSibsCheckout = availableMethods.includes('MBWAY') ||
                availableMethods.includes('MULTIBANCO');

            if (needsSibsCheckout) {
                try {
                    await payment.createPreventiveCheckout(documentId, amount);
                    setCheckoutReady(true);
                } catch (error) {
                    console.error('Erro checkout:', error);
                    setCheckoutReady(true);
                }
            } else {
                setCheckoutReady(true);
            }
        };

        initPayment();
    }, [documentId, amount, documentNumber]);

    // Auto-avançar quando método selecionado
    useEffect(() => {
        if (payment.state.selectedMethod && step === 0 && checkoutReady) {
            setDirection('forward');
            setStep(1);
        }
    }, [payment.state.selectedMethod, step, checkoutReady]);

    useEffect(() => {
        if (payment.state.status === 'SUCCESS' ||
            payment.state.status === 'PENDING_VALIDATION' ||
            payment.state.status === 'REFERENCE_GENERATED') {
            setDirection('forward');
            setStep(2);
        }
    }, [payment.state.status, step]);

    const handleMethodSelect = (method) => {
        payment.setMethod(method);
    };

    const handleBack = () => {
        setDirection('backward');
        if (step === 1) {
            payment.setMethod(null);
        }
        setStep(Math.max(0, step - 1));
    };

    const renderPaymentMethod = () => {
        const props = {
            onSuccess: () => { },
            onComplete,
            userInfo: user,
            transactionId: payment.state.transactionId
        };

        const components = {
            'MBWAY': MBWayPayment,
            'MULTIBANCO': MultibancoPayment,
            'CASH': CashPayment,
            'BANK_TRANSFER': BankTransferPayment,
            'MUNICIPALITY': MunicipalityPayment
        };

        const Component = components[payment.state.selectedMethod];
        return Component ? <Component {...props} /> : null;
    };

    const needsSibsCheckout = availableMethods.includes('MBWAY') ||
        availableMethods.includes('MULTIBANCO');

    const renderStepContent = () => {
        if (payment.state.error) {
            return (
                <Box sx={{ p: 3 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {payment.state.error}
                    </Alert>
                    <Button onClick={() => window.location.reload()}>
                        Tentar novamente
                    </Button>
                </Box>
            );
        }

        const contents = [
            <PaymentMethodSelector
                key="selector"
                availableMethods={availableMethods}
                selectedMethod={payment.state.selectedMethod}
                onSelect={handleMethodSelect}
                amount={amount}
                transactionId={payment.state.transactionId}
                checkoutLoading={
                    payment.state.loading ||
                    (needsSibsCheckout && !payment.state.transactionId)
                }
            />,
            renderPaymentMethod(),
            payment.state.selectedMethod === 'MULTIBANCO' && payment.state.status === 'REFERENCE_GENERATED'
                ? renderPaymentMethod()
                : <PaymentStatus key="status" transactionId={payment.state.transactionId} onComplete={onComplete} />
        ];

        return (
            <Slide
                key={step}
                direction={direction === 'forward' ? 'left' : 'right'}
                in={true}
                timeout={300}
            >
                <Box sx={{ minHeight: isMobile ? 300 : 400 }}>
                    {contents[step]}
                </Box>
            </Slide>
        );
    };

    return (
        <Paper
            elevation={0}
            sx={{
                overflow: 'hidden',
                background: 'transparent',
                position: 'relative'
            }}
        >
            {/* Progress Bar */}
            {payment.state.loading && (
                <LinearProgress
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1
                    }}
                />
            )}

            {/* Stepper */}
            <Box
                sx={{
                    background: 'rgba(255,255,255,0.9)',
                    p: { xs: 2, md: 3 },
                    borderBottom: 1,
                    borderColor: 'divider'
                }}
            >
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? 2 : 0
                }}>
                    {steps.map((stepItem, index) => (
                        <Box key={index} sx={{
                            display: 'flex',
                            alignItems: 'center',
                            flex: isMobile ? 'none' : 1,
                            justifyContent: isMobile ? 'center' : 'flex-start'
                        }}>
                            <Box
                                sx={{
                                    width: { xs: 32, md: 40 },
                                    height: { xs: 32, md: 40 },
                                    borderRadius: '50%',
                                    backgroundColor: index <= step ? 'primary.main' : 'grey.300',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 600,
                                    fontSize: { xs: 14, md: 16 },
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {index + 1}
                            </Box>
                            <Typography
                                variant="caption"
                                sx={{
                                    ml: 1,
                                    opacity: index <= step ? 1 : 0.7,
                                    fontWeight: index === step ? 600 : 400,
                                    color: 'text.primary',
                                    fontSize: { xs: 12, md: 14 }
                                }}
                            >
                                {stepItem.label}
                            </Typography>
                            {!isMobile && index < steps.length - 1 && (
                                <Box
                                    sx={{
                                        width: 60,
                                        height: 2,
                                        backgroundColor: index < step ? 'primary.main' : 'grey.300',
                                        mx: 2,
                                        transition: 'all 0.3s ease'
                                    }}
                                />
                            )}
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                {renderStepContent()}
            </Box>

            {/* Navigation */}
            {(step > 0 || step === 2) && (
                <Fade in={true}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            p: { xs: 2, md: 3 },
                            backgroundColor: 'background.paper',
                            borderTop: 1,
                            borderColor: 'divider'
                        }}
                    >
                        {step > 0 && step < 2 && (
                            <Button
                                startIcon={<ArrowBack />}
                                onClick={handleBack}
                                disabled={payment.state.loading}
                                sx={{ minWidth: { xs: 100, md: 120 } }}
                                size={isMobile ? "small" : "medium"}
                            >
                                Voltar
                            </Button>
                        )}

                        <Box sx={{ flexGrow: 1 }} />

                        {step === 2 && (
                            <Button
                                variant="contained"
                                endIcon={<ArrowForward />}
                                onClick={() => onComplete?.(payment.state)}
                                sx={{
                                    minWidth: { xs: 100, md: 120 },
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                }}
                                size={isMobile ? "small" : "medium"}
                            >
                                Concluir
                            </Button>
                        )}
                    </Box>
                </Fade>
            )}
        </Paper>
    );
};

export default PaymentModule;