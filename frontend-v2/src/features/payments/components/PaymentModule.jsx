import React, { useEffect, useState, useMemo } from 'react';
import {
    Box, Button, Alert, CircularProgress,
    useTheme, useMediaQuery,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useAuth } from '@/core/contexts/AuthContext';
import { useMutation } from '@tanstack/react-query';
import paymentService from '../services/paymentService';
import { usePaymentPermissions, PAYMENT_METHODS, canUsePaymentMethod } from '../services/paymentTypes';

import PaymentMethodSelector from './PaymentMethodSelector';
import MBWayPayment from './MBWayPayment';
import MultibancoPayment from './MultibancoPayment';
import CashPayment from './CashPayment';
import BankTransferPayment from './BankTransferPayment';
import MunicipalityPayment from './MunicipalityPayment';
import IsencaoPayment from './IsencaoPayment';
import PaymentStatus from './PaymentStatus';

const PaymentModule = ({
    documentId,
    amount,
    regnumber,
    step: externalStep,
    onStepChange,
    onLoadingChange,
    onComplete,
    paymentStatus
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuth();

    const [selectedMethod, setSelectedMethod] = useState(null);
    const [transactionId, setTransactionId] = useState(null);
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);

    const { availableMethods, loading: permissionsLoading } = usePaymentPermissions();

    // Se o valor é 0, o único método válido é Isenção
    const isZeroAmount = !(parseFloat(amount) > 0);

    const effectiveMethods = useMemo(() => {
        if (isZeroAmount) {
            return availableMethods.includes(PAYMENT_METHODS.ISENCAO)
                ? [PAYMENT_METHODS.ISENCAO]
                : [];
        }
        return availableMethods;
    }, [isZeroAmount, availableMethods]);

    const hasSibsMethods = useMemo(() => effectiveMethods.some(method =>
        [PAYMENT_METHODS.MBWAY, PAYMENT_METHODS.MULTIBANCO].includes(method)
    ), [effectiveMethods]);

    // Auto-seleciona Isenção quando amount = 0 e permissão existe
    useEffect(() => {
        if (isZeroAmount && effectiveMethods.includes(PAYMENT_METHODS.ISENCAO) && !selectedMethod) {
            setSelectedMethod(PAYMENT_METHODS.ISENCAO);
        }
    }, [isZeroAmount, effectiveMethods, selectedMethod]);

    const {
        mutate: createSibsCheckout,
        isLoading: isCreatingCheckout,
        isError: checkoutFailed,
    } = useMutation({
        mutationFn: () => paymentService.createPreventiveCheckout(documentId, amount),
        onSuccess: (data) => {
            const txId = data.transaction_id || data.data?.transaction_id;
            if (txId || data.success) {
                setTransactionId(txId);
                setError(null);
            } else {
                setError(data.error || 'Falha ao preparar pagamento SIBS.');
            }
        },
        onError: (err) => setError(err.response?.data?.error || err.message || 'Erro ao preparar pagamento SIBS.'),
    });

    useEffect(() => {
        onLoadingChange?.(isCreatingCheckout);
    }, [isCreatingCheckout, onLoadingChange]);

    // Só cria checkout SIBS quando há valor > 0 e método SIBS disponível
    useEffect(() => {
        if (
            hasSibsMethods &&
            !transactionId &&
            !isCreatingCheckout &&
            !checkoutFailed &&
            !isZeroAmount &&
            documentId
        ) {
            createSibsCheckout();
        }
    }, [hasSibsMethods, transactionId, isCreatingCheckout, checkoutFailed, isZeroAmount, createSibsCheckout, documentId]);

    const step = externalStep || 0;

    useEffect(() => {
        if (selectedMethod && step === 0) {
            onStepChange?.(1);
        }
    }, [selectedMethod, step, onStepChange]);

    useEffect(() => {
        if (status === 'SUCCESS' || status === 'PENDING_VALIDATION') {
            onStepChange?.(2);
        }
    }, [status, onStepChange]);

    const handleBack = () => {
        if (step === 1) {
            // Se foi auto-selecionado (amount=0), não permite voltar atrás do método
            if (!isZeroAmount) setSelectedMethod(null);
        }
        onStepChange?.(Math.max(0, step - 1));
    };

    const handlePaymentRetry = () => {
        setTransactionId(null);
        setStatus(null);
        setError(null);
    };

    const renderPaymentMethod = () => {
        const props = {
            documentId,
            amount,
            regnumber,
            onComplete,
            userInfo: user,
            transactionId,
            onSuccess: (result) => setStatus(result.payment_status || 'SUCCESS'),
            onRetry: handlePaymentRetry,
        };
        switch (selectedMethod) {
            case 'MBWAY':         return <MBWayPayment {...props} />;
            case 'MULTIBANCO':    return <MultibancoPayment {...props} />;
            case 'CASH':          return <CashPayment {...props} />;
            case 'BANK_TRANSFER': return <BankTransferPayment {...props} />;
            case 'MUNICIPALITY':  return <MunicipalityPayment {...props} />;
            case 'ISENCAO':       return <IsencaoPayment {...props} />;
            default:              return null;
        }
    };

    const renderStepContent = () => {
        if (permissionsLoading) return <CircularProgress />;

        // Valor 0 mas sem permissão de isenção
        if (isZeroAmount && !effectiveMethods.length) {
            return (
                <Box sx={{ p: 3 }}>
                    <Alert severity="info">
                        O valor desta fatura é 0,00 €. Contacte a tesouraria para registar a isenção.
                    </Alert>
                </Box>
            );
        }

        if (!effectiveMethods.length) {
            return <Alert severity="warning">Sem métodos de pagamento disponíveis no seu perfil.</Alert>;
        }

        if (error) {
            return (
                <Box sx={{ p: 3 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                    <Button onClick={() => { setError(null); handlePaymentRetry(); }}>Tentar novamente</Button>
                </Box>
            );
        }

        const contents = [
            // Step 0: seletor de método (omitido se auto-selecionado por amount=0)
            <PaymentMethodSelector
                key="selector"
                availableMethods={effectiveMethods}
                selectedMethod={selectedMethod}
                onSelect={setSelectedMethod}
                amount={amount}
                user={user}
                sibsReady={true}
                internalReady={true}
                loading={isCreatingCheckout}
            />,
            // Step 1: componente do método
            renderPaymentMethod(),
            // Step 2: estado final
            (selectedMethod === 'MULTIBANCO' && status === 'REFERENCE_GENERATED')
                ? renderPaymentMethod()
                : <PaymentStatus transactionId={transactionId || 'TEMP-ID'} status={status} onComplete={onComplete} />,
        ];

        return contents[Math.min(step, contents.length - 1)];
    };

    if (paymentStatus === 'success') {
        return <Alert severity="success">Pagamento Concluído.</Alert>;
    }

    return (
        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
            {renderStepContent()}

            {step === 1 && !isZeroAmount && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Button startIcon={<ArrowBack />} onClick={handleBack} disabled={isCreatingCheckout}>
                        Voltar
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default PaymentModule;
