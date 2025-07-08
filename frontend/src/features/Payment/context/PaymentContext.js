import React, { createContext, useReducer, useCallback } from 'react';
import paymentService from '../services/paymentService';

const initialState = {
    documentId: null,
    amount: 0,
    regnumber: null,
    selectedMethod: null,
    transactionId: null,
    sibsTransactionId: null,
    internalTransactionId: null,
    checkoutData: null,
    loading: false,
    error: null,
    status: 'PENDING',
    pollingActive: false, // NOVO: controlar polling
    checkoutInitialized: false // NOVO: evitar re-inicializações
};

const paymentReducer = (state, action) => {
    switch (action.type) {
        case 'SET_ORDER':
            return {
                ...state,
                documentId: action.documentId,
                amount: action.amount,
                regnumber: action.regnumber,
                initialized: true,
                checkoutInitialized: false // Reset para permitir novo checkout se necessário
            };
        case 'SET_SIBS_CHECKOUT':
            return {
                ...state,
                checkoutData: action.checkoutData,
                sibsTransactionId: action.checkoutData?.transaction_id,
                transactionId: action.checkoutData?.transaction_id,
                loading: false,
                error: null,
                checkoutInitialized: true
            };
        case 'SET_INTERNAL_CHECKOUT':
            return {
                ...state,
                internalTransactionId: action.transactionId,
                transactionId: state.sibsTransactionId || action.transactionId,
                loading: false,
                error: null
            };
        case 'SET_METHOD':
            return { ...state, selectedMethod: action.method, error: null };
        case 'SET_LOADING':
            return { ...state, loading: action.loading };
        case 'SET_ERROR':
            return { ...state, error: action.error, loading: false };
        case 'SET_SUCCESS':
            return {
                ...state,
                transactionId: action.transactionId || state.transactionId,
                status: action.status || 'SUCCESS',
                loading: false,
                pollingActive: false // Parar polling ao ter sucesso
            };
        case 'SET_STATUS':
            return {
                ...state,
                status: action.status,
                loading: false,
                error: null
            };
        case 'START_POLLING':
            return { ...state, pollingActive: true };
        case 'STOP_POLLING':
            return { ...state, pollingActive: false };
        case 'RESET':
            return initialState;
        default:
            return state;
    }
};

export const PaymentContext = createContext();

export const PaymentProvider = ({ children }) => {
    const [state, dispatch] = useReducer(paymentReducer, initialState);

    // Determinar métodos que precisam SIBS
    const needsSibsCheckout = (methods) => {
        return Array.isArray(methods) && methods.some(method => ['MBWAY', 'MULTIBANCO'].includes(method));
    };

    // Checkout SIBS (apenas para MBWay e Multibanco)
    const createSibsCheckout = useCallback(async (documentId, amount) => {
        // Evitar múltiplos checkouts
        if (state.checkoutInitialized && state.sibsTransactionId) {
            console.log('🔄 Checkout SIBS já inicializado:', state.sibsTransactionId);
            return state.checkoutData;
        }

        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            console.log('🚀 Criando checkout SIBS para documento:', documentId);
            const checkoutData = await paymentService.createPreventiveCheckout(documentId, amount);
            dispatch({ type: 'SET_SIBS_CHECKOUT', checkoutData });
            return checkoutData;
        } catch (error) {
            console.error('❌ Erro checkout SIBS:', error);
            dispatch({ type: 'SET_ERROR', error: error.message });
            throw error;
        }
    }, [state.checkoutInitialized, state.sibsTransactionId, state.checkoutData]);

    // Checkout interno (para métodos manuais)
    const createInternalCheckout = useCallback((documentId, amount) => {
        const internalTransactionId = `INTERNAL-${documentId}-${Date.now()}`;
        dispatch({
            type: 'SET_INTERNAL_CHECKOUT',
            transactionId: internalTransactionId
        });
        return internalTransactionId;
    }, []);

    const setOrderDetails = useCallback((documentId, amount, availableMethods, regnumber) => {
        // Evitar re-inicialização desnecessária
        if (state.initialized && state.documentId === documentId && state.amount === amount) {
            console.log('🔄 Ordem já inicializada, ignorando:', { documentId, amount });
            return;
        }

        console.log('🚀 Inicializando nova ordem:', { documentId, amount, availableMethods });

        dispatch({
            type: 'SET_ORDER',
            documentId,
            amount: Number(amount || 0),
            regnumber
        });

        const hasSibs = needsSibsCheckout(availableMethods);

        // Interno sempre primeiro
        createInternalCheckout(documentId, amount);

        // SIBS só se necessário
        if (hasSibs) {
            createSibsCheckout(documentId, amount).catch(console.error);
        }
    }, [state.initialized, state.documentId, state.amount, createSibsCheckout, createInternalCheckout]);

    // MBWay - requer checkout SIBS
    const payWithMBWay = useCallback(async (phoneNumber) => {
        if (!state.sibsTransactionId) {
            throw new Error('Checkout SIBS não disponível para MBWay');
        }

        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            const result = await paymentService.processMBWay(state.sibsTransactionId, phoneNumber);
            dispatch({
                type: 'SET_SUCCESS',
                status: result.payment_status || 'PENDING'
            });
            return result;
        } catch (error) {
            dispatch({ type: 'SET_ERROR', error: error.message });
            throw error;
        }
    }, [state.sibsTransactionId]);

    // Multibanco - requer checkout SIBS
    const payWithMultibanco = useCallback(async () => {
        if (!state.sibsTransactionId) {
            throw new Error('Checkout SIBS não disponível para Multibanco');
        }

        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            const result = await paymentService.processMultibanco(state.sibsTransactionId);
            dispatch({
                type: 'SET_SUCCESS',
                status: 'REFERENCE_GENERATED'
            });
            return result;
        } catch (error) {
            dispatch({ type: 'SET_ERROR', error: error.message });
            throw error;
        }
    }, [state.sibsTransactionId]);

    // Métodos manuais - usam checkout interno
    const payManual = useCallback(async (paymentType, details) => {
        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            const result = await paymentService.processManual(
                state.documentId,
                state.amount,
                paymentType,
                details
            );

            dispatch({
                type: 'SET_SUCCESS',
                transactionId: result.transaction_id,
                status: 'PENDING_VALIDATION'
            });
            return result;
        } catch (error) {
            dispatch({ type: 'SET_ERROR', error: error.message });
            throw error;
        }
    }, [state.documentId, state.amount]);

    // Verificação de status COM CONTROLO DE POLLING
    const checkStatus = useCallback(async () => {
        if (!state.transactionId || state.loading) {
            return;
        }

        try {
            dispatch({ type: 'SET_LOADING', loading: true });
            const result = await paymentService.checkStatus(state.transactionId);
            dispatch({
                type: 'SET_STATUS',
                status: result.payment_status
            });

            // Parar polling se status final
            if (['SUCCESS', 'DECLINED', 'EXPIRED'].includes(result.payment_status)) {
                dispatch({ type: 'STOP_POLLING' });
            }

            return result;
        } catch (error) {
            console.error('❌ Erro verificação status:', error);
            dispatch({ type: 'SET_ERROR', error: error.message });
        }
    }, [state.transactionId, state.loading]);

    // Iniciar polling controlado
    const startPolling = useCallback(() => {
        if (!state.pollingActive && state.transactionId) {
            dispatch({ type: 'START_POLLING' });
            console.log('🔄 Iniciando polling para:', state.transactionId);
        }
    }, [state.pollingActive, state.transactionId]);

    // Parar polling
    const stopPolling = useCallback(() => {
        dispatch({ type: 'STOP_POLLING' });
        console.log('⏹️ Polling parado');
    }, []);

    const resetPayment = () => {
        dispatch({ type: 'RESET' });
    };

    const value = {
        state,
        setOrderDetails,
        setMethod: (method) => dispatch({ type: 'SET_METHOD', method }),
        payWithMBWay,
        payWithMultibanco,
        payManual,
        checkStatus,
        startPolling,
        stopPolling,
        resetPayment,
        reset: resetPayment,
        // Expor utilitários
        isMethodReady: (method) => {
            if (!method) return false;
            const needsSibs = ['MBWAY', 'MULTIBANCO'].includes(method);
            return needsSibs ? !!state.sibsTransactionId : !!state.internalTransactionId;
        },
        getSibsReady: () => !!state.sibsTransactionId,
        getInternalReady: () => !!state.internalTransactionId
    };

    return (
        <PaymentContext.Provider value={value}>
            {children}
        </PaymentContext.Provider>
    );
};