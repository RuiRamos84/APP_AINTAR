import React, { createContext, useReducer, useCallback } from 'react';
import paymentService from '../services/paymentService';

const initialState = {
    documentId: null,
    amount: 0,
    regnumber: null, // ADICIONAR
    selectedMethod: null,
    transactionId: null,
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
                regnumber: action.regnumber
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
                transactionId: action.transactionId,
                status: action.status || 'SUCCESS',
                loading: false
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

    // Configurar pedido
    const setOrderDetails = useCallback((documentId, amount, availableMethods, regnumber) => {
        const safeAmount = Number(amount || 0);
        dispatch({
            type: 'SET_ORDER',
            documentId,
            amount: safeAmount,
            regnumber
        });
    }, []);

    // MBWay - checkout só quando chamado
    const payWithMBWay = useCallback(async (phoneNumber) => {
        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            const result = await paymentService.processMBWay(
                state.documentId, state.amount, phoneNumber
            );

            dispatch({
                type: 'SET_SUCCESS',
                transactionId: result.transaction_id,
                status: 'PENDING'
            });

            return result;
        } catch (error) {
            dispatch({ type: 'SET_ERROR', error: error.message });
            throw error;
        }
    }, [state.documentId, state.amount]);

    // Multibanco - só gerar referência
    const payWithMultibanco = useCallback(async () => {
        dispatch({ type: 'SET_LOADING', loading: true });
        try {
            const result = await paymentService.processMultibanco(
                state.documentId, state.amount, state.regnumber
            );

            // NÃO actualizar status - só parar loading
            dispatch({ type: 'SET_LOADING', loading: false });

            return {
                transaction_id: result.transaction_id,
                reference: result.reference,
                entity: result.entity,
                expire_date: result.expire_date
            };
        } catch (error) {
            dispatch({ type: 'SET_ERROR', error: error.message });
            throw error;
        }
    }, [state.documentId, state.amount, state.regnumber]);

    // Manual - checkout só quando chamado
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

    // Verificar estado
    const checkStatus = useCallback(async () => {
        if (!state.transactionId) return;

        try {
            const result = await paymentService.checkStatus(state.transactionId);
            if (result.payment_status) {
                dispatch({
                    type: 'SET_SUCCESS',
                    transactionId: state.transactionId,
                    status: result.payment_status
                });
            }
        } catch (error) {
            console.error('Erro verificação:', error);
        }
    }, [state.transactionId]);

    const value = {
        state,
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