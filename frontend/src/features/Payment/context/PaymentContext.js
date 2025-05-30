// frontend/src/features/Payment/context/PaymentContext.js

import React, { createContext, useReducer, useCallback, useEffect } from 'react';
import paymentService from '../services/paymentService';
import { PAYMENT_STATUS } from '../services/paymentTypes';
import {
    generateSessionToken,
    isSessionTokenValid,
    paymentRateLimiter,
    sanitizeInput,
    generateChecksum
} from '../utils/securityUtils';
import {
    paymentCache,
    paymentRequestQueue,
    debounce
} from '../utils/performanceUtils';

// Actions
const ACTIONS = {
    SET_ORDER_DETAILS: 'SET_ORDER_DETAILS',
    SELECT_PAYMENT_METHOD: 'SELECT_PAYMENT_METHOD',
    UPDATE_PAYMENT_DATA: 'UPDATE_PAYMENT_DATA',
    SET_LOADING: 'SET_LOADING',
    SET_ERROR: 'SET_ERROR',
    SET_STATUS: 'SET_STATUS',
    RESET_PAYMENT: 'RESET_PAYMENT',
    SET_SESSION_TOKEN: 'SET_SESSION_TOKEN'
};

// Initial state
const initialState = {
    orderId: null,
    amount: 0,
    selectedMethod: null,
    status: PAYMENT_STATUS.PENDING,
    transactionId: null,
    referenceInfo: null,
    loading: false,
    error: null,
    sessionToken: null,
    checksum: null
};

// Reducer
const paymentReducer = (state, action) => {
    switch (action.type) {
        case ACTIONS.SET_ORDER_DETAILS:
            return {
                ...state,
                orderId: action.payload.orderId,
                amount: action.payload.amount
            };

        case ACTIONS.SELECT_PAYMENT_METHOD:
            return {
                ...state,
                selectedMethod: action.payload,
                error: null
            };

        case ACTIONS.UPDATE_PAYMENT_DATA:
            return {
                ...state,
                ...action.payload
            };

        case ACTIONS.SET_LOADING:
            return {
                ...state,
                loading: action.payload
            };

        case ACTIONS.SET_ERROR:
            return {
                ...state,
                error: action.payload,
                loading: false
            };

        case ACTIONS.SET_STATUS:
            return {
                ...state,
                status: action.payload
            };

        case ACTIONS.SET_SESSION_TOKEN:
            return {
                ...state,
                sessionToken: action.payload
            };

        case ACTIONS.RESET_PAYMENT:
            return {
                ...initialState,
                orderId: state.orderId,
                amount: state.amount
            };

        default:
            return state;
    }
};

// Context
export const PaymentContext = createContext();

// Provider
export const PaymentProvider = ({ children }) => {
    const [state, dispatch] = useReducer(paymentReducer, initialState);

    // Inicializar sessão
    useEffect(() => {
        const token = generateSessionToken();
        dispatch({ type: ACTIONS.SET_SESSION_TOKEN, payload: token });
    }, []);

    // Verificar validade da sessão
    const checkSessionValidity = useCallback(() => {
        if (!isSessionTokenValid(state.sessionToken)) {
            dispatch({ type: ACTIONS.SET_ERROR, payload: 'Sessão expirada. Por favor, recarregue a página.' });
            return false;
        }
        return true;
    }, [state.sessionToken]);

    // Set order details
    const setOrderDetails = useCallback((orderId, amount) => {
        if (!orderId || amount <= 0) {
            dispatch({ type: ACTIONS.SET_ERROR, payload: 'Dados do pedido inválidos' });
            return;
        }

        const checksum = generateChecksum({ orderId, amount });

        dispatch({
            type: ACTIONS.SET_ORDER_DETAILS,
            payload: { orderId, amount }
        });

        dispatch({
            type: ACTIONS.UPDATE_PAYMENT_DATA,
            payload: { checksum }
        });
    }, []);

    // Select payment method
    const selectPaymentMethod = useCallback((method) => {
        dispatch({ type: ACTIONS.SELECT_PAYMENT_METHOD, payload: method });
    }, []);

    // Update payment data
    const updatePaymentData = useCallback((data) => {
        // Sanitizar dados antes de atualizar
        const sanitizedData = Object.keys(data).reduce((acc, key) => {
            acc[key] = typeof data[key] === 'string' ? sanitizeInput(data[key]) : data[key];
            return acc;
        }, {});

        dispatch({ type: ACTIONS.UPDATE_PAYMENT_DATA, payload: sanitizedData });
    }, []);

    // Generate Multibanco reference
    const generateMultibancoReference = useCallback(async () => {
        if (!checkSessionValidity()) return null;

        // Check rate limiting
        if (!paymentRateLimiter.isAllowed(`mb-${state.orderId}`)) {
            dispatch({ type: ACTIONS.SET_ERROR, payload: 'Demasiadas tentativas. Aguarde um momento.' });
            return null;
        }

        // Check cache
        const cacheKey = `mb-ref-${state.orderId}-${state.amount}`;
        const cached = paymentCache.get(cacheKey);
        if (cached) return cached;

        dispatch({ type: ACTIONS.SET_LOADING, payload: true });

        try {
            const result = await paymentRequestQueue.add(() =>
                paymentService.generateMultibancoReference(state.orderId, state.amount)
            );

            if (result.success && result.data) {
                dispatch({
                    type: ACTIONS.UPDATE_PAYMENT_DATA,
                    payload: {
                        referenceInfo: result.data,
                        status: PAYMENT_STATUS.PENDING_PAYMENT
                    }
                });

                // Cache result
                paymentCache.set(cacheKey, result);

                return result;
            } else {
                dispatch({ type: ACTIONS.SET_ERROR, payload: result.error || 'Erro ao gerar referência' });
                return null;
            }
        } catch (error) {
            dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
            return null;
        } finally {
            dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        }
    }, [state.orderId, state.amount, checkSessionValidity]);

    // Process MBWay payment
    const processMBWayPayment = useCallback(async (phoneNumber) => {
        if (!checkSessionValidity()) return null;

        // Check rate limiting
        if (!paymentRateLimiter.isAllowed(`mbway-${state.orderId}`)) {
            dispatch({ type: ACTIONS.SET_ERROR, payload: 'Demasiadas tentativas. Aguarde um momento.' });
            return null;
        }

        dispatch({ type: ACTIONS.SET_LOADING, payload: true });

        try {
            const result = await paymentRequestQueue.add(() =>
                paymentService.processMBWayPayment(state.orderId, state.amount, phoneNumber)
            );

            if (result.success) {
                dispatch({
                    type: ACTIONS.UPDATE_PAYMENT_DATA,
                    payload: {
                        transactionId: result.data.transaction_id,
                        status: PAYMENT_STATUS.PENDING_PAYMENT
                    }
                });
                return result;
            } else {
                dispatch({ type: ACTIONS.SET_ERROR, payload: result.error || 'Erro no pagamento MBWay' });
                return null;
            }
        } catch (error) {
            dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
            return null;
        } finally {
            dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        }
    }, [state.orderId, state.amount, checkSessionValidity]);

    /**
 * Registra um pagamento manual
 * @param {string} orderId - ID do pedido
 * @param {number} amount - Valor do pagamento
 * @param {string} paymentType - Tipo de pagamento (CASH, BANK_TRANSFER, etc)
 * @param {string} referenceInfo - Informações de referência
 * @returns {Promise<Object>} Resultado do registro
 */
    const registerManualPayment = async (orderId, amount, paymentType, referenceInfo) => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true });

            // Chamar o serviço de pagamento
            const result = await paymentService.registerManualPayment(
                orderId,
                amount,
                paymentType,
                referenceInfo
            );

            console.log('[PaymentContext] Resultado do registerManualPayment:', result);

            // Verificar se o resultado é válido
            if (result) {
                // Atualizar o estado com o transaction_id se existir
                if (result.transaction_id) {
                    dispatch({
                        type: 'UPDATE_PAYMENT_DATA',
                        payload: {
                            transactionId: result.transaction_id,
                            status: 'PENDING_VALIDATION'
                        }
                    });
                }

                // Retornar o resultado completo
                return result;
            } else {
                // Se o resultado for null ou undefined
                console.error('[PaymentContext] Resultado inválido do paymentService');
                dispatch({
                    type: 'SET_ERROR',
                    payload: 'Erro ao processar pagamento'
                });
                return {
                    success: false,
                    error: 'Resposta inválida do servidor'
                };
            }
        } catch (error) {
            console.error('[PaymentContext] Erro no registerManualPayment:', error);
            dispatch({
                type: 'SET_ERROR',
                payload: error.message || 'Erro ao registrar pagamento'
            });

            // Retornar objeto de erro
            return {
                success: false,
                error: error.message || 'Erro ao registrar pagamento'
            };
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    // Check payment status (with debounce)
    const checkStatus = useCallback(
        debounce(async () => {
            if (!state.transactionId || !checkSessionValidity()) return;

            dispatch({ type: ACTIONS.SET_LOADING, payload: true });

            try {
                const result = await paymentService.checkPaymentStatus(state.transactionId, state.documentId || state.orderId);

                if (result.success) {
                    dispatch({ type: ACTIONS.SET_STATUS, payload: result.data.status });
                }
            } catch (error) {
                console.error('Erro ao verificar status:', error);
            } finally {
                dispatch({ type: ACTIONS.SET_LOADING, payload: false });
            }
        }, 1000),
        [state.transactionId, checkSessionValidity]
    );

    // Reset payment
    const resetPayment = useCallback(() => {
        dispatch({ type: ACTIONS.RESET_PAYMENT });
        paymentCache.clear();
    }, []);

    // Context value
    const value = {
        state,
        setOrderDetails,
        selectPaymentMethod,
        updatePaymentData,
        generateMultibancoReference,
        processMBWayPayment,
        registerManualPayment,
        checkStatus,
        resetPayment
    };

    return (
        <PaymentContext.Provider value={value}>
            {children}
        </PaymentContext.Provider>
    );
};