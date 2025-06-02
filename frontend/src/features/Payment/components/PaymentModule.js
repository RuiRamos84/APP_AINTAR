import React, { useContext, useEffect } from 'react';
import { Box, Paper, Stepper, Step, StepLabel, Button } from '@mui/material';
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

const steps = ['Método', 'Pagamento', 'Confirmação'];

const PaymentModule = ({ documentId, amount, onComplete }) => {
    const { user } = useAuth();
    const payment = useContext(PaymentContext);
    const [step, setStep] = React.useState(0);

    const availableMethods = getAvailableMethodsForProfile(user?.profil);

    useEffect(() => {
        // Configurar + preload
        payment.setOrderDetails(documentId, amount, availableMethods);
    }, [documentId, amount]);

    // Auto-avançar quando método seleccionado
    useEffect(() => {
        if (payment.state.selectedMethod && step === 0) {
            setStep(1);
        }
    }, [payment.state.selectedMethod, step]);

    // Auto-avançar quando pagamento concluído
    useEffect(() => {
        if (payment.state.transactionId && step === 1) {
            setStep(2);
        }
    }, [payment.state.transactionId, step]);

    const handleMethodSelect = (method) => {
        payment.setMethod(method);
    };

    const handlePaymentSuccess = () => {
        // Já avança automaticamente
    };

    const renderContent = () => {
        switch (step) {
            case 0:
                return (
                    <PaymentMethodSelector
                        availableMethods={availableMethods}
                        onSelect={handleMethodSelect}
                    />
                );
            case 1:
                return renderPaymentMethod();
            case 2:
                return (
                    <PaymentStatus
                        transactionId={payment.state.transactionId}
                        onComplete={onComplete}
                    />
                );
            default:
                return null;
        }
    };

    const renderPaymentMethod = () => {
        const props = {
            onSuccess: handlePaymentSuccess,
            userInfo: user
        };

        switch (payment.state.selectedMethod) {
            case 'MBWAY':
                return <MBWayPayment {...props} />;
            case 'MULTIBANCO':
                return <MultibancoPayment {...props} />;
            case 'CASH':
                return <CashPayment {...props} />;
            case 'BANK_TRANSFER':
                return <BankTransferPayment {...props} />;
            case 'MUNICIPALITY':
                return <MunicipalityPayment {...props} />;
            default:
                return null;
        }
    };

    return (
        <Paper sx={{ p: 3 }}>
            <Stepper activeStep={step} sx={{ mb: 3 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            <Box sx={{ minHeight: 300 }}>
                {renderContent()}
            </Box>

            {step > 0 && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Button onClick={() => setStep(step - 1)}>
                        Voltar
                    </Button>

                    {step === 2 && (
                        <Button
                            variant="contained"
                            onClick={() => onComplete?.(payment.state)}
                        >
                            Concluir
                        </Button>
                    )}
                </Box>
            )}
        </Paper>
    );
};

export default PaymentModule;