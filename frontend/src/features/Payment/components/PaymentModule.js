import { Box, Button, Paper, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useEffect, useContext } from 'react';
import { PaymentContext } from '../context/PaymentContext';
import { PAYMENT_METHODS, PAYMENT_STATUS } from '../services/paymentTypes';
import MBWayPayment from './MBWayPayment';
import MultibancoPayment from './MultibancoPayment';
import PaymentMethodSelector from './PaymentMethodSelector';
import PaymentStatus from './PaymentStatus';

const steps = [
    { label: 'Método de Pagamento', description: 'Escolha como deseja pagar' },
    { label: 'Detalhes do Pagamento', description: 'Preencha os dados necessários' },
    { label: 'Confirmação', description: 'Verifique o status do pagamento' }
];

/**
 * Componente principal do módulo de pagamento
 * @param {Object} props - Propriedades do componente
 * @param {string} props.orderId - ID do pedido
 * @param {number} props.amount - Valor a pagar
 * @param {Function} props.onComplete - Função chamada quando o pagamento for concluído
 * @param {Function} props.onCancel - Função chamada quando o usuário cancelar o pagamento
 */
const PaymentModule = ({ orderId, amount, onComplete, onCancel }) => {
    const theme = useTheme();
    const payment = useContext(PaymentContext);

    // Estados locais
    const [activeStep, setActiveStep] = React.useState(0);

    // Configurar dados do pedido ao montar o componente
    useEffect(() => {
        if (orderId && amount) {
            console.log(`[PaymentModule] Configurando pedido: ${orderId}, valor: ${amount}€`);
            payment.setOrderDetails(orderId, amount);
        } else {
            console.warn('[PaymentModule] Dados de pedido inválidos:', { orderId, amount });
        }
    }, []);

    // Observar status do pagamento
    useEffect(() => {
        if (payment.state.status === PAYMENT_STATUS.PAID && onComplete) {
            onComplete({
                orderId: payment.state.orderId,
                transactionId: payment.state.transactionId,
                method: payment.state.selectedMethod,
                status: payment.state.status
            });
        }
    }, [payment.state.status]);

    // Avançar para a próxima etapa
    const handleNext = () => {
        setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    };

    // Voltar para a etapa anterior
    const handleBack = () => {
        setActiveStep(prev => Math.max(prev - 1, 0));
    };

    // Cancelar o pagamento
    const handleCancel = () => {
        payment.resetPayment();
        if (onCancel) onCancel();
    };

    // Reiniciar o pagamento
    const handleRestart = () => {
        // Voltar para a etapa de seleção de método
        setActiveStep(0);
        // Resetar o pagamento preservando os detalhes do pedido
        payment.resetPayment();
    };

    // Selecionar método de pagamento
    const handleSelectMethod = (method) => {
        payment.selectPaymentMethod(method);
        handleNext();
    };

    // Renderizar o conteúdo baseado na etapa atual
    const renderStepContent = () => {
        switch (activeStep) {
            case 0: // Seleção de método de pagamento
                return (
                    <PaymentMethodSelector
                        onSelect={handleSelectMethod}
                        selectedMethod={payment.state.selectedMethod}
                    />
                );

            case 1: // Detalhes específicos do método
                if (payment.state.selectedMethod === PAYMENT_METHODS.MBWAY) {
                    return (
                        <MBWayPayment
                            onSubmit={handleNext}
                            loading={payment.state.loading}
                            error={payment.state.error}
                        />
                    );
                } else if (payment.state.selectedMethod === PAYMENT_METHODS.MULTIBANCO) {
                    return (
                        <MultibancoPayment
                            onGenerate={handleNext}
                            loading={payment.state.loading}
                            error={payment.state.error}
                        />
                    );
                }
                return (
                    <Box p={4} textAlign="center">
                        <Typography color="error">
                            Método de pagamento não implementado
                        </Typography>
                    </Box>
                );

            case 2: // Status/confirmação
                return (
                    <PaymentStatus
                        method={payment.state.selectedMethod}
                        status={payment.state.status}
                        onCheckStatus={() => payment.checkStatus()}
                        onRestart={handleRestart}  // Adicionar esta prop
                        loading={payment.state.loading}
                        error={payment.state.error}
                    />
                );

            default:
                return null;
        }
    };

    // Definir texto e estado dos botões baseado na etapa
    const getButtonState = () => {
        const isLastStep = activeStep === steps.length - 1;
        const isMethodSelected = !!payment.state.selectedMethod;

        return {
            back: {
                disabled: activeStep === 0 || payment.state.loading,
                visible: activeStep > 0 && activeStep < steps.length - 1
            },
            next: {
                disabled: activeStep === 0 && !isMethodSelected || payment.state.loading,
                visible: activeStep < steps.length - 1
            },
            finish: {
                disabled: payment.state.loading,
                visible: isLastStep
            }
        };
    };

    const buttonState = getButtonState();

    return (
        <Paper
            elevation={3}
            sx={{
                p: 3,
                mb: 3,
                borderRadius: 2,
                boxShadow: theme.shadows[3]
            }}
        >
            {/* <Typography variant="h5" gutterBottom>
                Pagamento
            </Typography>

            <Box mb={4}>
                <Typography variant="h6" color="primary" fontWeight="bold">
                    {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(amount)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Pedido: {orderId}
                </Typography>
            </Box> */}

            <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
                {steps.map((step) => (
                    <Step key={step.label}>
                        <StepLabel>{step.label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            <Box sx={{ mb: 4, minHeight: '200px' }}>
                {renderStepContent()}
            </Box>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                <Button
                    onClick={handleCancel}
                    disabled={payment.state.loading}
                >
                    Cancelar
                </Button>

                <Box>
                    {buttonState.back.visible && (
                        <Button
                            onClick={handleBack}
                            disabled={buttonState.back.disabled}
                            sx={{ mr: 1 }}
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
                        >
                            Próximo
                        </Button>
                    )}

                    {buttonState.finish.visible && (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={onComplete}
                            disabled={buttonState.finish.disabled || payment.state.status !== PAYMENT_STATUS.PAID}
                        >
                            Finalizar
                        </Button>
                    )}
                </Box>
            </Box>
        </Paper>
    );
};

export default PaymentModule;