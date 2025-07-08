import React, { useContext, useEffect, useState } from 'react';
import {
    Box, Button, Fade, Slide, Typography, Alert,
    useTheme, useMediaQuery, AlertTitle
} from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { PaymentContext } from '../context/PaymentContext';
import { getAvailableMethodsForUser, debugUserPermissions } from '../services/paymentTypes';
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
    onComplete,
    paymentStatus
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuth();
    const payment = useContext(PaymentContext);
    const [direction, setDirection] = useState('forward');
    const [initialized, setInitialized] = useState(false);

    // Usar gestão centralizada de permissões
    const availableMethods = getAvailableMethodsForUser(user?.profil, user?.user_id);

    // Debug permissões em desenvolvimento
    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && user) {
            debugUserPermissions(user.profil, user.user_id);
        }
    }, [user]);

    // Determinar se precisa checkout SIBS
    const hasSibsMethods = availableMethods.some(method =>
        ['MBWAY', 'MULTIBANCO'].includes(method)
    );

    // Sync loading state
    useEffect(() => {
        onLoadingChange?.(payment.state.loading);
    }, [payment.state.loading, onLoadingChange]);

    // Inicialização inteligente
    useEffect(() => {
        if (!initialized && user) {
            console.log('🚀 Inicializando pagamento:', {
                documentId,
                amount,
                availableMethods,
                hasSibsMethods,
                userProfile: user.profil,
                userId: user.user_id
            });

            payment.setOrderDetails(documentId, amount, availableMethods, documentNumber);
            setInitialized(true);
        }
    }, [documentId, amount, documentNumber, initialized, availableMethods, hasSibsMethods, user]);

    // Auto-avançar quando método selecionado
    useEffect(() => {
        if (payment.state.selectedMethod && step === 0) {
            const selectedMethod = payment.state.selectedMethod;

            if (isMethodReady(selectedMethod)) {
                console.log('✅ Avançando para pagamento:', {
                    method: selectedMethod,
                    sibsReady: payment.getSibsReady?.(),
                    internalReady: payment.getInternalReady?.(),
                    transactionId: payment.state.transactionId
                });

                setDirection('forward');
                onStepChange?.(1);
            }
        }
    }, [payment.state.selectedMethod, payment.state.sibsTransactionId, payment.state.internalTransactionId, step, onStepChange]);

    // Auto-avançar para confirmação
    useEffect(() => {
        if (payment.state.status === 'SUCCESS' ||
            payment.state.status === 'PENDING_VALIDATION') {
            setDirection('forward');
            onStepChange?.(2);
        }
    }, [payment.state.status, onStepChange]);

    const handleMethodSelect = (method) => {
        console.log('🎯 Método selecionado:', method);
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

    const isMethodReady = (method) => {
        return payment.isMethodReady ? payment.isMethodReady(method) : false;
    };

    const renderStepContent = () => {
        // Verificar se utilizador tem métodos disponíveis
        if (availableMethods.length === 0) {
            return (
                <Box sx={{ p: 3 }}>
                    <Alert severity="warning">
                        <AlertTitle>Sem métodos de pagamento disponíveis</AlertTitle>
                        O seu perfil não tem permissão para utilizar nenhum método de pagamento.
                        Contacte a administração para mais informações.
                    </Alert>
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
                user={user}
                sibsReady={payment.getSibsReady?.() || false}
                internalReady={payment.getInternalReady?.() || false}
                loading={payment.state.loading}
            />,
            renderPaymentMethod(),
            payment.state.selectedMethod === 'MULTIBANCO' && payment.state.status === 'REFERENCE_GENERATED'
                ? renderPaymentMethod()
                : <PaymentStatus
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
                <Box sx={{ minHeight: isMobile ? 300 : 400, p: { xs: 2, md: 3 } }}>
                    {contents[step]}
                </Box>
            </Slide>
        );
    };

    // Debug info
    if (process.env.NODE_ENV === 'development') {
        console.log('🔍 PaymentModule State:', {
            step,
            selectedMethod: payment.state.selectedMethod,
            availableMethods,
            userProfile: user?.profil,
            userId: user?.user_id,
            sibsReady: payment.getSibsReady?.(),
            internalReady: payment.getInternalReady?.(),
            sibsTransactionId: payment.state.sibsTransactionId,
            internalTransactionId: payment.state.internalTransactionId,
            transactionId: payment.state.transactionId,
            status: payment.state.status,
            loading: payment.state.loading,
            error: payment.state.error
        });
    }

    if (paymentStatus === 'success') {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Alert severity="success">
                    <AlertTitle>Pagamento Concluído</AlertTitle>
                    Este documento já foi pago.
                </Alert>
            </Box>
        );
    }

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