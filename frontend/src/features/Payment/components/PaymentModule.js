import React, { useContext, useEffect, useState } from 'react';
import {
    Box, Button, Fade, Slide, Typography, Alert,
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

const PaymentModule = ({
    documentId,
    amount,
    documentNumber,
    step,
    onStepChange,
    onLoadingChange,
    onComplete
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuth();
    const payment = useContext(PaymentContext);
    const [direction, setDirection] = useState('forward');
    const [checkoutReady, setCheckoutReady] = useState(false);

    const availableMethods = getAvailableMethodsForProfile(user?.profil);

    // Sync loading state
    useEffect(() => {
        onLoadingChange?.(payment.state.loading);
    }, [payment.state.loading, onLoadingChange]);

    useEffect(() => {
        const initPayment = async () => {
            onLoadingChange?.(true);
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
            onLoadingChange?.(false);
        };

        initPayment();
    }, [documentId, amount, documentNumber]);

    // Auto-avançar quando método selecionado
    useEffect(() => {
        if (payment.state.selectedMethod && step === 0 && checkoutReady) {
            setDirection('forward');
            onStepChange?.(1);
        }
    }, [payment.state.selectedMethod, step, checkoutReady, onStepChange]);

    // Auto-avançar para confirmação
    useEffect(() => {
        if (payment.state.status === 'SUCCESS' ||
            payment.state.status === 'PENDING_VALIDATION' ||
            payment.state.status === 'REFERENCE_GENERATED') {
            setDirection('forward');
            onStepChange?.(2);
        }
    }, [payment.state.status, onStepChange]);

    const handleMethodSelect = (method) => {
        payment.setMethod(method);
    };

    const handleBack = () => {
        setDirection('backward');
        if (step === 1) {
            payment.setMethod(null);
        }
        onStepChange?.(Math.max(0, step - 1));
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
                <Box sx={{ minHeight: isMobile ? 300 : 400, p: { xs: 2, md: 3 } }}>
                    {contents[step]}
                </Box>
            </Slide>
        );
    };

    return (
        <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: 'transparent' }}>
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
        </Box>
    );
};

export default PaymentModule;