// frontend/src/features/Payment/components/PaymentModule.js

import React, { useEffect, useContext, useMemo } from 'react';
import {
    Box,
    Button,
    Paper,
    Step,
    StepLabel,
    Stepper,
    Typography,
    useMediaQuery,
    Container
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PaymentContext } from '../context/PaymentContext';
import { PAYMENT_STATUS } from '../services/paymentTypes';
import { getAvailableMethodsForProfile, PAYMENT_METHODS } from '../services/paymentTypes';
import { useAuth } from '../../../contexts/AuthContext';

// Componentes de pagamento
import MBWayPayment from './MBWayPayment';
import MultibancoPayment from './MultibancoPayment';
import CashPayment from './CashPayment';
import BankTransferPayment from './BankTransferPayment';
import MunicipalityPayment from './MunicipalityPayment';
import PaymentMethodSelector from './PaymentMethodSelector';
import PaymentStatus from './PaymentStatus';

const steps = [
    { label: 'Método', description: 'Escolha como pagar' },
    { label: 'Detalhes', description: 'Dados do pagamento' },
    { label: 'Confirmação', description: 'Estado do pagamento' }
];

const PaymentModule = ({ orderId, amount, onComplete, onCancel, documentId }) => {
    const theme = useTheme();
    const payment = useContext(PaymentContext);
    const { user } = useAuth(); // Obter user do AuthContext
    const [activeStep, setActiveStep] = React.useState(0);

    // Responsividade
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    // Métodos disponíveis para o perfil do utilizador
    const availableMethods = useMemo(() => {
        return getAvailableMethodsForProfile(user?.profil);
    }, [user?.profil]);

    // Configurar dados do pedido
    useEffect(() => {
        if (orderId && amount && amount > 0) {
            console.log(`[PaymentModule] Configurando pedido: ${orderId}, valor: ${amount}€`);
            payment.setOrderDetails(orderId, amount);
        } else {
            console.error('[PaymentModule] Dados de pedido inválidos:', { orderId, amount });
        }
    }, [orderId, amount]);

    // Observer para mudanças no estado do pagamento
    useEffect(() => {
        const isPaymentComplete =
            payment.state.status === PAYMENT_STATUS.PAID ||
            payment.state.status === PAYMENT_STATUS.PENDING_VALIDATION;

        if (isPaymentComplete && onComplete) {
            onComplete({
                orderId: payment.state.orderId,
                transactionId: payment.state.transactionId,
                method: payment.state.selectedMethod,
                status: payment.state.status
            });
        }
    }, [payment.state.status, onComplete]);

    // Navegação entre passos
    const handleNext = () => setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

    const handleCancel = () => {
        payment.resetPayment();
        if (onCancel) onCancel();
    };

    const handleRestart = () => {
        setActiveStep(0);
        payment.resetPayment();
    };

    const handleSelectMethod = (method) => {
        payment.selectPaymentMethod(method);
        handleNext();
    };

    // Callback para quando o pagamento é bem sucedido
    const handlePaymentSuccess = (transactionData) => {
        console.log('[PaymentModule] Pagamento bem sucedido:', transactionData);
        handleNext();
    };

    // Propriedades comuns para todos os métodos de pagamento
    const commonProps = {
        orderId,
        amount: typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0,
        onSuccess: handlePaymentSuccess
    };

    // Renderizar componente específico do método de pagamento
    const renderPaymentMethod = () => {
        const props = {
            ...commonProps, // Incluir orderId e amount
            onSubmit: handleNext,
            loading: payment.state.loading,
            error: payment.state.error,
            userInfo: user, // Passar user do AuthContext
            documentId: documentId // Passar documentId para upload do comprovativo
        };

        switch (payment.state.selectedMethod) {
            case PAYMENT_METHODS.MBWAY:
                return <MBWayPayment {...props} />;
            case PAYMENT_METHODS.MULTIBANCO:
                return <MultibancoPayment onGenerate={handleNext} {...props} />;
            case PAYMENT_METHODS.CASH:
                return <CashPayment {...props} />;
            case PAYMENT_METHODS.BANK_TRANSFER:
                return <BankTransferPayment {...props} />;
            case PAYMENT_METHODS.MUNICIPALITY:
                return <MunicipalityPayment {...props} />;
            default:
                return (
                    <Box p={4} textAlign="center">
                        <Typography color="error">
                            Método de pagamento não implementado
                        </Typography>
                    </Box>
                );
        }
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <PaymentMethodSelector
                        onSelect={handleSelectMethod}
                        selectedMethod={payment.state.selectedMethod}
                        availableMethods={availableMethods}
                    />
                );
            case 1:
                return renderPaymentMethod();
            case 2:
                return (
                    <PaymentStatus
                        method={payment.state.selectedMethod}
                        status={payment.state.status}
                        onCheckStatus={() => payment.checkStatus()}
                        onRestart={handleRestart}
                        loading={payment.state.loading}
                        error={payment.state.error}
                    />
                );
            default:
                return null;
        }
    };

    const getButtonState = () => {
        const isLastStep = activeStep === steps.length - 1;
        const isMethodSelected = !!payment.state.selectedMethod;
        const isPaymentComplete =
            payment.state.status === PAYMENT_STATUS.PAID ||
            payment.state.status === PAYMENT_STATUS.PENDING_VALIDATION;

        return {
            back: {
                disabled: activeStep === 0 || payment.state.loading,
                visible: activeStep > 0 && activeStep < steps.length - 1
            },
            next: {
                disabled: (activeStep === 0 && !isMethodSelected) || payment.state.loading,
                visible: activeStep < steps.length - 1
            },
            finish: {
                disabled: payment.state.loading || !isPaymentComplete,
                visible: isLastStep
            }
        };
    };

    const buttonState = getButtonState();

    return (
        <Container maxWidth="md" disableGutters={isMobile}>
            <Paper
                elevation={3}
                sx={{
                    p: { xs: 2, sm: 3, md: 4 },
                    mb: 3,
                    borderRadius: 2,
                    boxShadow: theme.shadows[3]
                }}
            >
                <Stepper
                    activeStep={activeStep}
                    sx={{ mb: 4 }}
                    alternativeLabel={!isMobile}
                    orientation={isMobile ? 'vertical' : 'horizontal'}
                >
                    {steps.map((step) => (
                        <Step key={step.label}>
                            <StepLabel>
                                {isMobile ? step.label : (
                                    <>
                                        <Box>{step.label}</Box>
                                        <Typography variant="caption" color="text.secondary">
                                            {step.description}
                                        </Typography>
                                    </>
                                )}
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Box sx={{
                    mb: 4,
                    minHeight: { xs: '300px', sm: '350px', md: '400px' },
                    overflowY: 'auto',
                    maxHeight: { xs: '60vh', md: 'none' }
                }}>
                    {renderStepContent()}
                </Box>

                <Box sx={{
                    mt: 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? 2 : 0
                }}>
                    <Button
                        onClick={handleCancel}
                        disabled={payment.state.loading}
                        fullWidth={isMobile}
                        size={isMobile ? 'large' : 'medium'}
                    >
                        Cancelar
                    </Button>

                    <Box sx={{
                        display: 'flex',
                        gap: 1,
                        flexDirection: isMobile ? 'column' : 'row',
                        width: isMobile ? '100%' : 'auto'
                    }}>
                        {buttonState.back.visible && (
                            <Button
                                onClick={handleBack}
                                disabled={buttonState.back.disabled}
                                fullWidth={isMobile}
                                size={isMobile ? 'large' : 'medium'}
                            >
                                Voltar
                            </Button>
                        )}

                        {buttonState.next.visible && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleNext}
                                disabled={buttonState.next.disabled}
                                fullWidth={isMobile}
                                size={isMobile ? 'large' : 'medium'}
                            >
                                Próximo
                            </Button>
                        )}

                        {buttonState.finish.visible && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={onComplete}
                                disabled={buttonState.finish.disabled}
                                fullWidth={isMobile}
                                size={isMobile ? 'large' : 'medium'}
                            >
                                Finalizar
                            </Button>
                        )}
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
};

export default PaymentModule;