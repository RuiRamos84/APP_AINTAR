import React, { useContext, useEffect, useState } from 'react';
import {
    Box, Paper, Stepper, Step, StepLabel, Button,
    Fade, Slide, Typography, LinearProgress, Alert
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
    const { user } = useAuth();
    const payment = useContext(PaymentContext);
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState('forward');
    const [checkoutReady, setCheckoutReady] = useState(false);

    const availableMethods = getAvailableMethodsForProfile(user?.profil);

    // Configurar pedido + checkout preventivo
    useEffect(() => {
        const initPayment = async () => {
            try {
                payment.setOrderDetails(documentId, amount, availableMethods, documentNumber);

                // Checkout preventivo só para SIBS
                if (availableMethods.includes('MBWAY') || availableMethods.includes('MULTIBANCO')) {
                    await payment.createPreventiveCheckout(documentId, amount);
                }

                setCheckoutReady(true);
            } catch (error) {
                console.error('Erro no checkout:', error);
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

    // Auto-avançar quando pagamento concluído
    useEffect(() => {
        if (payment.state.transactionId && step === 1) {
            setDirection('forward');
            setStep(2);
        }
    }, [payment.state.transactionId, step]);

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
            onSuccess: () => { }, // Auto-avança via useEffect
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

    const renderStepContent = () => {
        if (!checkoutReady && step === 0) {
            return (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="h6" gutterBottom>
                        A preparar checkout...
                    </Typography>
                    <LinearProgress sx={{ mt: 2 }} />
                </Box>
            );
        }

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
                checkoutLoading={payment.state.loading && !payment.state.transactionId}
            />,
            renderPaymentMethod(),
            <PaymentStatus
                key="status"
                transactionId={payment.state.transactionId}
                onComplete={onComplete}
            />
        ];

        return (
            <Slide
                key={step}
                direction={direction === 'forward' ? 'left' : 'right'}
                in={true}
                timeout={300}
            >
                <Box sx={{ minHeight: 400 }}>
                    {contents[step]}
                </Box>
            </Slide>
        );
    };

    return (
        <Paper
            elevation={3}
            sx={{
                overflow: 'hidden',
                background: 'linear-gradient(145deg, #f5f7fa 0%, #c3cfe2 100%)',
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

            {/* Header */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    p: 3,
                    textAlign: 'center'
                }}
            >
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    Pagamento de Documento
                </Typography>

                {/* Custom Stepper */}
                <Box sx={{ mt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {steps.map((stepItem, index) => (
                            <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        backgroundColor: index <= step ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                                        color: index <= step ? 'primary.main' : 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 600,
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
                                        fontWeight: index === step ? 600 : 400
                                    }}
                                >
                                    {stepItem.label}
                                </Typography>
                                {index < steps.length - 1 && (
                                    <Box
                                        sx={{
                                            width: 80,
                                            height: 2,
                                            backgroundColor: index < step ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                                            mx: 2,
                                            transition: 'all 0.3s ease'
                                        }}
                                    />
                                )}
                            </Box>
                        ))}
                    </Box>
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
                            p: 3,
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
                                sx={{ minWidth: 120 }}
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
                                    minWidth: 120,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                }}
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