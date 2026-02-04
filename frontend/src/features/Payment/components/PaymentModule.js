import React, { useEffect, useState, useMemo } from 'react';
import {
    Box, Button, Fade, Slide, Typography, Alert, CircularProgress,
    useTheme, useMediaQuery, AlertTitle
} from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useMutation } from '@tanstack/react-query';
import paymentService from '../services/paymentService';

// Componentes
import PaymentMethodSelector from './PaymentMethodSelector';
import MBWayPayment from './MBWayPayment';
import MultibancoPayment from './MultibancoPayment';
import CashPayment from './CashPayment';
import BankTransferPayment from './BankTransferPayment';
import MunicipalityPayment from './MunicipalityPayment';
import PaymentStatus from './PaymentStatus';
import { usePaymentPermissions, PAYMENT_METHODS } from '../services/paymentTypes';
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

    // Estado local para gerir o fluxo
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [transactionId, setTransactionId] = useState(null);
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);

    const [direction, setDirection] = useState('forward');
 
    // ✅ Usar hook para carregar permissões de forma assíncrona
    const { availableMethods, loading: permissionsLoading } = usePaymentPermissions();

    // Determinar se precisa checkout SIBS
    const hasSibsMethods = useMemo(() => availableMethods.some(method =>
        [PAYMENT_METHODS.MBWAY, PAYMENT_METHODS.MULTIBANCO].includes(method)
    ), [availableMethods]);

    // Mutação para criar o checkout SIBS preventivo
    const { mutate: createSibsCheckout, isLoading: isCreatingCheckout } = useMutation({
        mutationFn: () => paymentService.createPreventiveCheckout(documentId, amount),
        onSuccess: (data) => {
            if (data.success) {
                setTransactionId(data.transaction_id);
                setError(null);
            } else {
                setError(data.error || 'Falha ao preparar pagamento SIBS.');
            }
        },
        onError: (err) => setError(err.message || 'Erro crítico ao preparar pagamento SIBS.'),
    });

    // Sync loading state
    useEffect(() => {
        onLoadingChange?.(isCreatingCheckout);
    }, [isCreatingCheckout, onLoadingChange]);

    // Inicialização inteligente
    useEffect(() => {
        // Se houver métodos SIBS, cria o checkout preventivamente
        if (hasSibsMethods && !transactionId && !isCreatingCheckout) {
            createSibsCheckout();
        }
    }, [hasSibsMethods, transactionId, isCreatingCheckout, createSibsCheckout]);

    // Auto-avançar quando método selecionado
    useEffect(() => {
        if (selectedMethod && step === 0) {
            setDirection('forward');
            onStepChange?.(1);
        }
    }, [selectedMethod, step, onStepChange]);

    // Auto-avançar para confirmação
    useEffect(() => {
        if (status === 'SUCCESS' || status === 'PENDING_VALIDATION') {
            setDirection('forward');
            onStepChange?.(2);
        }
    }, [status, onStepChange]);

    const handleMethodSelect = (method) => {
        console.log('🎯 Método selecionado:', method);
        setSelectedMethod(method);
    };

    // Handler para retry - limpa o transactionId para forçar criação de novo checkout
    const handlePaymentRetry = () => {
        console.log('[PaymentModule] Retry solicitado - criando novo checkout');
        setTransactionId(null);
        setStatus(null);
        setError(null);
        // O useEffect vai detectar que transactionId é null e criar novo checkout
    };

    const handleBack = () => {
        setDirection('backward');
        if (step === 1) {
            setSelectedMethod(null);
        }
        onStepChange?.(Math.max(0, step - 1));
    };

    const renderPaymentMethod = () => {
        const props = {
            documentId: documentId,
            amount: amount,
            onComplete,
            userInfo: user,
            transactionId: transactionId,
            onSuccess: (result) => setStatus(result.payment_status || 'SUCCESS'),
            onRetry: handlePaymentRetry,
        };

        const components = {
            'MBWAY': MBWayPayment,
            'MULTIBANCO': MultibancoPayment,
            'CASH': CashPayment,
            'BANK_TRANSFER': BankTransferPayment,
            'MUNICIPALITY': MunicipalityPayment
        };

        const Component = components[selectedMethod];
        return Component ? <Component {...props} /> : null;
    };

    const renderStepContent = () => {
        // Mostrar loading enquanto as permissões são verificadas
        if (permissionsLoading) {
            return (
                <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>A verificar permissões...</Typography>
                </Box>
            );
        }
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

        if (error) {
            return (
                <Box sx={{ p: 3 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
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
                selectedMethod={selectedMethod}
                onSelect={handleMethodSelect}
                amount={amount}
                user={user}
                sibsReady={!!transactionId}
                internalReady={true} // Métodos manuais estão sempre prontos
                loading={isCreatingCheckout}
            />,
            renderPaymentMethod(),
            selectedMethod === 'MULTIBANCO' && status === 'REFERENCE_GENERATED'
                ? renderPaymentMethod()
                : <PaymentStatus
                    transactionId={transactionId}
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
            selectedMethod: selectedMethod,
            availableMethods,
            userProfile: user?.profil,
            userId: user?.user_id,
            sibsReady: !!transactionId,
            transactionId: transactionId,
            status: status,
            loading: isCreatingCheckout,
            error: error
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
                                disabled={isCreatingCheckout}
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
                                onClick={() => onComplete?.({ status, transactionId })}
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