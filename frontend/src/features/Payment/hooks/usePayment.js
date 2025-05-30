// frontend/src/features/Payment/hooks/usePayment.js

import { useContext, useCallback, useEffect, useState } from 'react';
import { PaymentContext } from '../context/PaymentContext';
import { PAYMENT_STATUS } from '../services/paymentTypes';
import { getAvailableMethodsForProfile } from '../services/paymentTypes';

/**
 * Hook customizado para gestão de pagamentos
 */
export const usePayment = (userInfo) => {
    const context = useContext(PaymentContext);
    const [availableMethods, setAvailableMethods] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);

    if (!context) {
        throw new Error('usePayment must be used within PaymentProvider');
    }

    const {
        state,
        setOrderDetails,
        selectPaymentMethod,
        updatePaymentData,
        generateMultibancoReference,
        processMBWayPayment,
        registerManualPayment,
        checkStatus,
        resetPayment
    } = context;

    // Determinar métodos disponíveis com base no perfil
    useEffect(() => {
        if (userInfo?.profil !== undefined) {
            const methods = getAvailableMethodsForProfile(userInfo.profil);
            setAvailableMethods(methods);
            setIsInitialized(true);
        }
    }, [userInfo?.profil]);

    // Verificar se o pagamento está completo
    const isPaymentComplete = useCallback(() => {
        return state.status === PAYMENT_STATUS.PAID ||
            state.status === PAYMENT_STATUS.PENDING_VALIDATION;
    }, [state.status]);

    // Verificar se pode prosseguir para o próximo passo
    const canProceed = useCallback(() => {
        if (!state.selectedMethod) return false;

        switch (state.status) {
            case PAYMENT_STATUS.PENDING:
                return true;
            case PAYMENT_STATUS.PENDING_PAYMENT:
                return state.referenceInfo || state.transactionId;
            case PAYMENT_STATUS.PAID:
            case PAYMENT_STATUS.PENDING_VALIDATION:
                return true;
            default:
                return false;
        }
    }, [state.selectedMethod, state.status, state.referenceInfo, state.transactionId]);

    // Obter mensagem de status
    const getStatusMessage = useCallback(() => {
        switch (state.status) {
            case PAYMENT_STATUS.PENDING:
                return 'Aguardando seleção do método de pagamento';
            case PAYMENT_STATUS.PENDING_PAYMENT:
                return 'Aguardando confirmação do pagamento';
            case PAYMENT_STATUS.PAID:
                return 'Pagamento confirmado com sucesso';
            case PAYMENT_STATUS.PENDING_VALIDATION:
                return 'Pagamento registado, aguardando validação';
            case PAYMENT_STATUS.FAILED:
                return 'Pagamento falhado';
            case PAYMENT_STATUS.CANCELLED:
                return 'Pagamento cancelado';
            default:
                return 'Estado desconhecido';
        }
    }, [state.status]);

    // Validar montante
    const validateAmount = useCallback((amount) => {
        const numAmount = parseFloat(amount);
        return !isNaN(numAmount) && numAmount > 0 && numAmount <= 10000;
    }, []);

    // Retry payment
    const retryPayment = useCallback(() => {
        resetPayment();
    }, [resetPayment]);

    // Auto-check status for pending payments
    useEffect(() => {
        let interval;

        if (state.status === PAYMENT_STATUS.PENDING_PAYMENT && state.transactionId) {
            interval = setInterval(() => {
                checkStatus();
            }, 5000); // Check every 5 seconds
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [state.status, state.transactionId, checkStatus]);

    return {
        // State
        paymentState: state,
        availableMethods,
        isInitialized,

        // Status helpers
        isPaymentComplete,
        canProceed,
        getStatusMessage,

        // Actions
        initializePayment: setOrderDetails,
        selectMethod: selectPaymentMethod,
        updateData: updatePaymentData,
        generateReference: generateMultibancoReference,
        processMBWay: processMBWayPayment,
        registerManual: registerManualPayment,
        checkPaymentStatus: checkStatus,
        retry: retryPayment,
        reset: resetPayment,

        // Validators
        validateAmount
    };
};

// Hook para monitorizar performance
export const usePaymentPerformance = () => {
    const [metrics, setMetrics] = useState({
        loadTime: 0,
        transactionTime: 0,
        errorCount: 0
    });

    const startTimer = useCallback(() => {
        const startTime = performance.now();
        return () => performance.now() - startTime;
    }, []);

    const trackError = useCallback(() => {
        setMetrics(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
    }, []);

    const trackTransaction = useCallback((time) => {
        setMetrics(prev => ({ ...prev, transactionTime: time }));
    }, []);

    return {
        metrics,
        startTimer,
        trackError,
        trackTransaction
    };
};