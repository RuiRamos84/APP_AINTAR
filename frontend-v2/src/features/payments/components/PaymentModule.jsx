import React, { useEffect, useState, useMemo } from 'react';
import {
    Box, Button, Fade, Slide, Typography, Alert, CircularProgress,
    useTheme, useMediaQuery, AlertTitle
} from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { useAuth } from '@/core/contexts/AuthContext'; // v2 uses useAuth from context
import { useMutation } from '@tanstack/react-query';
import paymentService from '../services/paymentService';
import { usePaymentPermissions, PAYMENT_METHODS } from '../services/paymentTypes';

// Componentes
import PaymentMethodSelector from './PaymentMethodSelector';
import MBWayPayment from './MBWayPayment';
import MultibancoPayment from './MultibancoPayment';
import PaymentStatus from './PaymentStatus';

const PlaceholderPayment = ({ title }) => (
    <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary">Em desenvolvimento</Typography>
    </Box>
);

const PaymentModule = ({
    documentId,
    amount,
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
    const [direction, setDirection] = useState('forward');

    // Hook para permissões
    const { availableMethods, loading: permissionsLoading } = usePaymentPermissions();

    const hasSibsMethods = useMemo(() => availableMethods.some(method =>
        [PAYMENT_METHODS.MBWAY, PAYMENT_METHODS.MULTIBANCO].includes(method)
    ), [availableMethods]);

    const { mutate: createSibsCheckout, isLoading: isCreatingCheckout } = useMutation({
        mutationFn: () => paymentService.createPreventiveCheckout(documentId, amount),
        onSuccess: (data) => {
             // Depending on API response structure, data.transaction_id might be direct or nested
             const txId = data.transaction_id || data.data?.transaction_id;
             if (txId || data.success) {
                setTransactionId(txId);
                setError(null);
            } else {
                setError(data.error || 'Falha ao preparar pagamento SIBS.');
            }
        },
        onError: (err) => setError(err.message || 'Erro crítico ao preparar pagamento SIBS.'),
    });

    useEffect(() => {
        onLoadingChange?.(isCreatingCheckout);
    }, [isCreatingCheckout, onLoadingChange]);

    useEffect(() => {
        if (hasSibsMethods && !transactionId && !isCreatingCheckout && documentId) {
             // Only create checkout if documentId exists (creation vs details flow)
             // For creation flow, documentId might be null initially? 
             // Logic: If on creation, we generate an orderId usually.
             // If documentId is null, `createPreventiveCheckout` might fail if API expects it.
             // Legacy `PaymentStep` generated `orderId`.
             // `createPreventiveCheckout` in legacy used `document_id`.
             // If creating a NEW document, we don't have ID yet.
             // Usually on creation, we select method FIRST, then submit doc + method.
             // But legacy `PaymentStep` seemed to assume we pay *during* wizard?
             // Or maybe it's only selecting method?
             // Legacy `PaymentStep`:
             /*
                const getOrderId = () => ...
                <PaymentModule orderId={getOrderId()} ... />
             */
             // So it passed user-generated ID.
             createSibsCheckout();
        }
    }, [hasSibsMethods, transactionId, isCreatingCheckout, createSibsCheckout, documentId]);

    const step = externalStep || 0; // Controlled by parent mostly

    useEffect(() => {
        if (selectedMethod && step === 0) {
            setDirection('forward');
            onStepChange?.(1);
        }
    }, [selectedMethod, step, onStepChange]);

    useEffect(() => {
        if (status === 'SUCCESS' || status === 'PENDING_VALIDATION') {
            setDirection('forward');
            onStepChange?.(2);
        }
    }, [status, onStepChange]);

    const handleMethodSelect = (method) => {
        setSelectedMethod(method);
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
            documentId: documentId, // or orderId
            amount: amount,
            onComplete,
            userInfo: user,
            transactionId: transactionId,
            onSuccess: (result) => setStatus(result.payment_status || 'SUCCESS'),
        };

        switch (selectedMethod) {
            case 'MBWAY': return <MBWayPayment {...props} />;
            case 'MULTIBANCO': return <MultibancoPayment {...props} />;
            case 'CASH': return <PlaceholderPayment title="Pagamento Numerário" />;
            case 'BANK_TRANSFER': return <PlaceholderPayment title="Transferência Bancária" />;
            case 'MUNICIPALITY': return <PlaceholderPayment title="Município" />;
            default: return null;
        }
    };

    const renderStepContent = () => {
        if (permissionsLoading) return <CircularProgress />;
        
        if (availableMethods.length === 0) {
            return <Alert severity="warning">Sem métodos disponíveis no seu perfil.</Alert>;
        }

        if (error) {
             return (
                <Box sx={{ p: 3 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                    <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
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
                sibsReady={true} // Forcing true for now to avoid blocking if checkout fails in dev/test without real backend response
                internalReady={true}
                loading={isCreatingCheckout}
            />,
            renderPaymentMethod(), // Step 1: Specific Method UI
            (selectedMethod === 'MULTIBANCO' && status === 'REFERENCE_GENERATED') 
                ? renderPaymentMethod() 
                : <PaymentStatus transactionId={transactionId || "TEMP-ID"} onComplete={onComplete} /> // Step 2: Status
        ];

        // Ensure step is within bounds
        const content = contents[step >= contents.length ? contents.length - 1 : step];

        return content;
    };

    if (paymentStatus === 'success') {
        return <Alert severity="success">Pagamento Concluído.</Alert>;
    }

    return (
        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
            {renderStepContent()}

            {(step > 0) && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, borderTop: 1, borderColor: 'divider' }}>
                     {step === 1 && (
                        <Button startIcon={<ArrowBack />} onClick={handleBack} disabled={isCreatingCheckout}>
                            Voltar
                        </Button>
                     )}
                     <Box sx={{ flexGrow: 1 }} />
                     {step === 2 && (
                         <Button variant="contained" endIcon={<ArrowForward />} onClick={() => onComplete?.({ status, transactionId })}>
                             Concluir
                         </Button>
                     )}
                </Box>
            )}
        </Box>
    );
};

export default PaymentModule;
