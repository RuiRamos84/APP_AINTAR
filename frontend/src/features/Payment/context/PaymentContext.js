import React, { createContext, useReducer, useCallback } from 'react';
import paymentService from '../services/paymentService';

const initialState = {
    documentId: null,
    amount: 0,
    regnumber: null,
    selectedMethod: null,
    transactionId: null,
    checkoutData: null, // NOVO
    loading: false,
    error: null,
    status: 'PENDING'
};

const paymentReducer = (state, action) => {
    switch (action.type) {
        case 'SET_CHECKOUT_ERROR':
            return {
                ...state,
                loading: false,
                error: action.error,
            };
        case 'SET_ORDER':
            return {
                ...state,
                documentId: action.documentId,
                amount: action.amount,
                regnumber: action.regnumber
            };
        case 'SET_CHECKOUT':
            return {
                ...state,
                checkoutData: action.checkoutData,
                transactionId: action.checkoutData?.transaction_id, // ✅ CORRECTO
                loading: false,
                error: null // ✅ ADICIONAR
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
                status: action.status,        // ✅ CORRECTO?
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

    // Checkout preventivo
    const createPreventiveCheckout = useCallback(async (documentId, amount) => {
        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            const checkoutData = await paymentService.createPreventiveCheckout(documentId, amount);
            dispatch({ type: 'SET_CHECKOUT', checkoutData });
            return checkoutData;
        } catch (error) {
            dispatch({ type: 'SET_ERROR', error: error.message });
            throw error;
        }
    }, []);

    const setOrderDetails = useCallback((documentId, amount, availableMethods, regnumber) => {
        dispatch({
            type: 'SET_ORDER',
            documentId,
            amount: Number(amount || 0),
            regnumber
        });
    }, []);

    // MBWay - usa transaction_id existente
    const payWithMBWay = useCallback(async (phoneNumber) => {
        if (!state.transactionId) {
            throw new Error('Checkout não criado');
        }

        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            const result = await paymentService.processMBWay(state.transactionId, phoneNumber);
            dispatch({
                type: 'SET_SUCCESS',
                status: result.payment_status || 'PENDING'
            });
            return result;
        } catch (error) {
            dispatch({ type: 'SET_ERROR', error: error.message });
            throw error;
        }
    }, [state.transactionId]);

    // Multibanco - usa transaction_id existente
    const payWithMultibanco = useCallback(async () => {
        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            const result = await paymentService.processMultibanco(state.transactionId);

            // ✅ Status específico para referência gerada
            dispatch({
                type: 'SET_SUCCESS',
                status: 'REFERENCE_GENERATED'
            });

            return result;
        } catch (error) {
            dispatch({ type: 'SET_ERROR', error: error.message });
            throw error;
        }
    }, [state.transactionId]);

    // Manual - directo
    const payManual = useCallback(async (paymentType, details) => {
        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            const result = await paymentService.processManual(
                state.documentId, state.amount, paymentType, details
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

    const checkStatus = async () => {
        try {
            dispatch({ type: 'SET_LOADING', loading: true });

            const result = await paymentService.checkStatus(state.transactionId);
            console.log('Context recebeu:', result); // ✅ DEBUG

            dispatch({
                type: 'SET_STATUS',
                status: result.payment_status  // ✅ verificar campo exacto
            });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', error: error.message });
        }
    };

    const value = {
        state,
        createPreventiveCheckout,
        setOrderDetails,
        setMethod: (method) => dispatch({ type: 'SET_METHOD', method }),
        payWithMBWay,
        payWithMultibanco,
        payManual,
        checkStatus,
        reset: () => dispatch({ type: 'RESET' })
    };

    return (
        <PaymentContext.Provider value={value}>
            {children}
        </PaymentContext.Provider>
    );
};