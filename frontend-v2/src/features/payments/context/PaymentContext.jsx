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
    pollingActive: false,
    checkoutInitialized: false
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
                checkoutInitialized: false
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
                pollingActive: false
            };
        case 'SET_STATUS':
            return {
                ...state,
                status: action.status,
                loading: false,
                error: null
            };
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

    const needsSibsCheckout = (methods) => {
        return Array.isArray(methods) && methods.some(method => ['MBWAY', 'MULTIBANCO'].includes(method));
    };

    const createSibsCheckout = useCallback(async (documentId, amount) => {
        if (state.checkoutInitialized && state.sibsTransactionId) return state.checkoutData;

        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            const checkoutData = await paymentService.createPreventiveCheckout(documentId, amount);
            dispatch({ type: 'SET_SIBS_CHECKOUT', checkoutData });
            return checkoutData;
        } catch (error) {
            console.error('Erro checkout SIBS:', error);
            dispatch({ type: 'SET_ERROR', error: error.message });
            throw error;
        }
    }, [state.checkoutInitialized, state.sibsTransactionId, state.checkoutData]);

    const setOrderDetails = useCallback((documentId, amount, availableMethods, regnumber) => {
        if (state.initialized && state.documentId === documentId && state.amount === amount) return;

        dispatch({
            type: 'SET_ORDER',
            documentId,
            amount: Number(amount || 0),
            regnumber
        });

        // Normally we would init SIBS here if needed, keeping it simple for now
    }, [state.initialized, state.documentId, state.amount]);

    const resetPayment = () => dispatch({ type: 'RESET' });

    const value = {
        state,
        setOrderDetails,
        createSibsCheckout,
        resetPayment,
        reset: resetPayment
    };

    return (
        <PaymentContext.Provider value={value}>
            {children}
        </PaymentContext.Provider>
    );
};
