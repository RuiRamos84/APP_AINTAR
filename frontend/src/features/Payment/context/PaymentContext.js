import React, { createContext, useReducer, useCallback } from 'react';
import paymentService from '../services/paymentService';

const initialState = {
    documentId: null,
    amount: 0,
    regnumber: null,
    selectedMethod: null,
    transactionId: null,
    sibsTransactionId: null,  // NOVO: ID da SIBS
    internalTransactionId: null,  // NOVO: ID interno
    checkoutData: null,
    loading: false,
    error: null,
    status: 'PENDING'
};

const paymentReducer = (state, action) => {
    switch (action.type) {
        case 'SET_ORDER':
            return {
                ...state,
                documentId: action.documentId,
                amount: action.amount,
                regnumber: action.regnumber,
                initialized: true  // Marcar como inicializado
            };
        case 'SET_SIBS_CHECKOUT':
            return {
                ...state,
                checkoutData: action.checkoutData,
                sibsTransactionId: action.checkoutData?.transaction_id,
                transactionId: action.checkoutData?.transaction_id, // compatibilidade
                loading: false,
                error: null
            };
        case 'SET_INTERNAL_CHECKOUT':
            return {
                ...state,
                internalTransactionId: action.transactionId,
                // Só definir transactionId se não houver SIBS
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
                loading: false
            };
        case 'SET_STATUS':
            return {
                ...state,
                status: action.status,
                loading: false,
                error: null
            };
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
        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            const checkoutData = await paymentService.createPreventiveCheckout(documentId, amount);
            dispatch({ type: 'SET_SIBS_CHECKOUT', checkoutData });
            return checkoutData;
        } catch (error) {
            dispatch({ type: 'SET_ERROR', error: error.message });
            throw error;
        }
    }, []);

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
        // Evitar re-inicialização
        if (state.initialized && state.documentId === documentId) {
            return;
        }

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
    }, [state.initialized, state.documentId, createSibsCheckout, createInternalCheckout]);

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

            // Atualizar com transaction_id retornado pelo backend
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

    const checkStatus = useCallback(async () => {
        if (!state.transactionId) return;

        try {
            dispatch({ type: 'SET_LOADING', loading: true });
            const result = await paymentService.checkStatus(state.transactionId);
            dispatch({
                type: 'SET_STATUS',
                status: result.payment_status
            });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', error: error.message });
        }
    }, [state.transactionId]);

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