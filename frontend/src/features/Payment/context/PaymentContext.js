import React, { createContext, useEffect, useReducer } from 'react';
import paymentService from '../services/paymentService';
import { PAYMENT_METHODS, PAYMENT_STATUS } from '../services/paymentTypes';

// Estado inicial
const initialState = {
    orderId: null,
    amount: 0,
    selectedMethod: null,
    transactionId: null,
    transactionSignature: null,
    status: PAYMENT_STATUS.PENDING,
    statusDetails: null,
    error: null,
    loading: false,
    paymentData: {},
    paymentResult: null
};

// Tipos de ações
export const PAYMENT_ACTIONS = {
    SET_ORDER_DETAILS: 'SET_ORDER_DETAILS',
    SET_PAYMENT_METHOD: 'SET_PAYMENT_METHOD',
    SET_TRANSACTION_DATA: 'SET_TRANSACTION_DATA',
    SET_PAYMENT_DATA: 'SET_PAYMENT_DATA',
    SET_PAYMENT_STATUS: 'SET_PAYMENT_STATUS',
    SET_PAYMENT_RESULT: 'SET_PAYMENT_RESULT',
    SET_LOADING: 'SET_LOADING',
    SET_ERROR: 'SET_ERROR',
    RESET_PAYMENT: 'RESET_PAYMENT'
};

// Reducer para gerenciar o estado
function paymentReducer(state, action) {
    switch (action.type) {
        case PAYMENT_ACTIONS.SET_ORDER_DETAILS:
            return {
                ...state,
                orderId: action.payload.orderId,
                amount: action.payload.amount
            };

        case PAYMENT_ACTIONS.SET_PAYMENT_METHOD:
            return {
                ...state,
                selectedMethod: action.payload,
                paymentData: {} // Limpar dados do método anterior
            };

        case PAYMENT_ACTIONS.SET_TRANSACTION_DATA:
            return {
                ...state,
                transactionId: action.payload.transactionId,
                transactionSignature: action.payload.transactionSignature
            };

        case PAYMENT_ACTIONS.SET_PAYMENT_DATA:
            // Cuidado especial com o transactionId quando vier nos dados
            { const newPaymentData = {
                ...state.paymentData,
                ...action.payload
            };

            // Se estiver atualizando com transactionId nos dados, também atualize o estado principal
            const updatedState = {
                ...state,
                paymentData: newPaymentData
            };

            // Se tiver transactionId nos dados e o estado principal estiver vazio
            if (action.payload.transactionId && !state.transactionId) {
                console.log("Atualizando transactionId de paymentData para estado principal:", action.payload.transactionId);
                updatedState.transactionId = action.payload.transactionId;
            }

            return updatedState; }

        case PAYMENT_ACTIONS.SET_PAYMENT_STATUS:
            return {
                ...state,
                status: action.payload.status,
                statusDetails: action.payload.details || state.statusDetails
            };

        case PAYMENT_ACTIONS.SET_PAYMENT_RESULT:
            return {
                ...state,
                paymentResult: action.payload
            };

        case PAYMENT_ACTIONS.SET_LOADING:
            return {
                ...state,
                loading: action.payload
            };

        case PAYMENT_ACTIONS.SET_ERROR:
            return {
                ...state,
                error: action.payload,
                loading: false
            };

        case PAYMENT_ACTIONS.RESET_PAYMENT:
            return {
                ...initialState,
                orderId: state.orderId,
                amount: state.amount
            };

        default:
            return state;
    }
}

// Criar contexto
export const PaymentContext = createContext();

// Provider component
export const PaymentProvider = ({ children, initialData }) => {
    const [state, dispatch] = useReducer(paymentReducer, initialState);

    // Referência para o polling de status
    let statusPolling = null;

    useEffect(() => {
        if (initialData && initialData.orderId && initialData.amount) {
            console.log('Inicializando contexto com:', initialData);
            dispatch({
                type: PAYMENT_ACTIONS.SET_ORDER_DETAILS,
                payload: {
                    orderId: initialData.orderId,
                    amount: initialData.amount
                }
            });
        }
    }, [initialData]);

    // Limpar polling quando o componente for desmontado
    useEffect(() => {
        return () => {
            if (statusPolling) {
                statusPolling.stop();
            }
        };
    }, []);

    // Ações disponíveis
    const actions = {
        // Definir detalhes do pedido
        setOrderDetails: (orderId, amount) => {
            dispatch({
                type: PAYMENT_ACTIONS.SET_ORDER_DETAILS,
                payload: { orderId, amount }
            });
        },

        // Selecionar método de pagamento
        selectPaymentMethod: (method) => {
            dispatch({
                type: PAYMENT_ACTIONS.SET_PAYMENT_METHOD,
                payload: method
            });
        },

        // Atualizar dados do método de pagamento
        updatePaymentData: (data) => {
            dispatch({
                type: PAYMENT_ACTIONS.SET_PAYMENT_DATA,
                payload: data
            });
        },

        // Obter valor da fatura para um documento
        fetchInvoiceAmount: async (documentId) => {
            dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });

            try {
                const result = await paymentService.getInvoiceAmount(documentId);

                if (result.success && result.invoice_data) {
                    // Armazenar dados completos da fatura
                    const invoiceData = result.invoice_data;

                    // Atualizar estado com detalhes do pedido
                    dispatch({
                        type: PAYMENT_ACTIONS.SET_ORDER_DETAILS,
                        payload: {
                            orderId: documentId.toString(),
                            amount: invoiceData.invoice || invoiceData.amount || 0
                        }
                    });

                    // Também armazenar os dados completos da fatura para referência
                    dispatch({
                        type: PAYMENT_ACTIONS.SET_PAYMENT_DATA,
                        payload: {
                            invoiceDetails: invoiceData,
                            hasPaymentData: !!invoiceData.updated_at // Indica se já tem pagamento associado
                        }
                    });

                    return {
                        success: true,
                        amount: invoiceData.invoice || invoiceData.amount || 0,
                        invoiceData: invoiceData,
                        hasPaymentData: !!invoiceData.updated_at
                    };
                } else {
                    dispatch({
                        type: PAYMENT_ACTIONS.SET_ERROR,
                        payload: result.error || 'Valor não disponível para este documento'
                    });
                    return { success: false, error: result.error };
                }
            } catch (error) {
                dispatch({
                    type: PAYMENT_ACTIONS.SET_ERROR,
                    payload: error.message
                });
                return { success: false, error: error.message };
            } finally {
                dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: false });
            }
        },

        // Processar pagamento MBWay diretamente (sem depender do state)
        processMBWayPayment: async (orderId, amount, phoneNumber) => {
            if (!orderId || !amount || !phoneNumber) {
                console.error("Dados incompletos para processamento MBWay:", { orderId, amount, phoneNumber });
                return {
                    success: false,
                    error: "Dados incompletos para pagamento MBWay"
                };
            }

            dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
            console.log(`Processando MBWay direto: orderId=${orderId}, amount=${amount}, phone=${phoneNumber}`);

            try {
                // Atualizar estado com telefone (para rastreabilidade)
                dispatch({
                    type: PAYMENT_ACTIONS.SET_PAYMENT_DATA,
                    payload: { phoneNumber }
                });

                // Chamar serviço diretamente
                const paymentResponse = await paymentService.processMBWayPayment(
                    orderId,
                    amount,
                    phoneNumber
                );

                console.log("Resposta do processamento MBWAY:", paymentResponse);

                // Verificar resultado
                if (!paymentResponse.success) {
                    throw new Error(paymentResponse.error || 'Falha no processamento do pagamento MBWay');
                }

                // Extrair o ID da transação, que pode estar em locais diferentes dependendo da resposta da API
                let transactionId = null;
                let transactionSignature = null;

                if (paymentResponse.transaction_id) {
                    // Formato antigo/padrão
                    transactionId = paymentResponse.transaction_id;
                    transactionSignature = paymentResponse.transaction_signature;
                } else if (paymentResponse.mbway_response && paymentResponse.mbway_response.transactionID) {
                    // Formato da API MBWAY real
                    transactionId = paymentResponse.mbway_response.transactionID;
                    console.log("Extraindo transactionID da resposta MBWAY:", transactionId);
                }

                // Verificar se temos um ID de transação
                if (!transactionId) {
                    console.error("Resposta MBWAY não contém ID de transação:", paymentResponse);
                }

                // Guardar dados da transação
                if (transactionId) {
                    dispatch({
                        type: PAYMENT_ACTIONS.SET_TRANSACTION_DATA,
                        payload: {
                            transactionId: transactionId,
                            transactionSignature: transactionSignature
                        }
                    });
                } else {
                    console.error("Não foi possível extrair o ID da transação da resposta:", paymentResponse);
                }

                // Definir resultado do pagamento
                dispatch({
                    type: PAYMENT_ACTIONS.SET_PAYMENT_RESULT,
                    payload: paymentResponse
                });

                // Iniciar polling de status se tivermos um ID de transação
                if (paymentResponse.transaction_id) {
                    actions.startStatusPolling(paymentResponse.transaction_id);
                }

                dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: false });
                return { success: true, data: paymentResponse };

            } catch (error) {
                console.error("Erro em processMBWayPayment:", error.message);
                dispatch({
                    type: PAYMENT_ACTIONS.SET_ERROR,
                    payload: error.message
                });
                return { success: false, error: error.message };
            } finally {
                dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: false });
            }
        },

        // Iniciar o processo de pagamento baseado no método selecionado
        startPayment: async (overrideData = null) => {
            if (!state.orderId || !state.amount || !state.selectedMethod) {
                dispatch({
                    type: PAYMENT_ACTIONS.SET_ERROR,
                    payload: 'Dados de pagamento incompletos'
                });
                return { success: false, error: 'Dados de pagamento incompletos' };
            }

            dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
            console.log(`Processando pagamento: método=${state.selectedMethod}, orderId=${state.orderId}, amount=${state.amount}`);

            try {
                // Combinar dados do estado com override, se fornecido
                const paymentData = overrideData
                    ? { ...state.paymentData, ...overrideData }
                    : state.paymentData;

                // Processar método específico de pagamento diretamente
                let paymentResponse;

                switch (state.selectedMethod) {
                    case PAYMENT_METHODS.MBWAY:
                        if (!paymentData.phoneNumber) {
                            throw new Error('Número de telefone obrigatório para MB WAY');
                        }

                        console.log(`Iniciando pagamento MBWAY: telefone=${paymentData.phoneNumber}`);

                        paymentResponse = await paymentService.processMBWayPayment(
                            state.orderId,
                            state.amount,
                            paymentData.phoneNumber
                        );

                        console.log("Resposta do processamento MBWAY:", paymentResponse);
                        break;

                    case PAYMENT_METHODS.MULTIBANCO:
                        // Calcular data de expiração (por padrão, 2 dias)
                        const expiryDate = paymentData.expiryDate ||
                            new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

                        paymentResponse = await paymentService.generateMultibancoReference(
                            state.orderId,
                            state.amount,
                            expiryDate
                        );
                        break;

                    default:
                        throw new Error(`Método de pagamento não suportado: ${state.selectedMethod}`);
                }

                // Verificar resultado
                if (!paymentResponse.success) {
                    throw new Error(paymentResponse.error || 'Falha no processamento do pagamento');
                }

                // Guardar dados da transação
                if (paymentResponse.transaction_id) {
                    dispatch({
                        type: PAYMENT_ACTIONS.SET_TRANSACTION_DATA,
                        payload: {
                            transactionId: paymentResponse.transaction_id,
                            transactionSignature: paymentResponse.transaction_signature
                        }
                    });
                }

                // Definir resultado do pagamento
                dispatch({
                    type: PAYMENT_ACTIONS.SET_PAYMENT_RESULT,
                    payload: paymentResponse
                });

                // Iniciar polling de status para MBWay se tivermos um ID de transação
                if (state.selectedMethod === PAYMENT_METHODS.MBWAY && paymentResponse.transaction_id) {
                    actions.startStatusPolling(paymentResponse.transaction_id);
                }

                dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: false });
                return { success: true, data: paymentResponse };

            } catch (error) {
                console.error("Erro em startPayment:", error.message);
                dispatch({
                    type: PAYMENT_ACTIONS.SET_ERROR,
                    payload: error.message
                });
                return { success: false, error: error.message };
            } finally {
                dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: false });
            }
        },

        // Iniciar polling para verificar status
        startStatusPolling: (transactionId) => {
            // Parar polling anterior, se existir
            if (statusPolling) {
                statusPolling.stop();
            }

            // Iniciar novo polling
            statusPolling = paymentService.pollPaymentStatus(
                transactionId,
                (status, details) => {
                    dispatch({
                        type: PAYMENT_ACTIONS.SET_PAYMENT_STATUS,
                        payload: { status, details }
                    });

                    // Notificar usuário se o status mudar para pago ou falha
                    if (status === PAYMENT_STATUS.PAID || status === PAYMENT_STATUS.FAILED) {
                        // Aqui você pode adicionar alguma notificação
                        console.log(`Pagamento ${status === PAYMENT_STATUS.PAID ? 'confirmado' : 'falhou'}`);
                    }
                },
                10000,  // 10 segundos entre verificações
                300000  // 5 minutos de timeout
            );
        },

        // Verificar status manualmente
        checkStatus: async (transactionId) => {
            const txId = transactionId || state.transactionId;

            // Validar o ID de transação
            if (!txId) {
                console.warn("Tentativa de verificar status sem ID de transação");
                dispatch({
                    type: PAYMENT_ACTIONS.SET_ERROR,
                    payload: "Não é possível verificar o status: pagamento não foi iniciado"
                });
                return {
                    success: false,
                    error: "ID de transação não disponível",
                    status: { paymentStatus: PAYMENT_STATUS.UNKNOWN }
                };
            }

            dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
            console.log("Verificando status para transação:", txId);

            try {
                // Log antes da chamada API
                console.log("Chamando API para verificar status...");

                // Verificar se estamos usando simulação
                if (paymentService._shouldUseSimulation) {
                    console.log("ATENÇÃO: Usando modo de simulação - chamada à API não será realizada");
                }

                // Forçar useSimulation = false durante esta chamada
                const originalSimFunction = paymentService._shouldUseSimulation;
                paymentService._shouldUseSimulation = () => false;

                // Chamada real à API
                const statusData = await paymentService.checkPaymentStatus(txId);

                // Restaurar função original
                paymentService._shouldUseSimulation = originalSimFunction;

                console.log("Resposta da verificação de status:", statusData);

                if (statusData.success) {
                    const status = statusData?.status?.paymentStatus || PAYMENT_STATUS.UNKNOWN;
                    console.log("Status de pagamento recebido:", status);

                    dispatch({
                        type: PAYMENT_ACTIONS.SET_PAYMENT_STATUS,
                        payload: { status, details: statusData.status }
                    });
                } else {
                    console.error("Erro na resposta de status:", statusData.error);
                }

                dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: false });
                return statusData;
            } catch (error) {
                console.error("Erro ao verificar status:", error);
                dispatch({
                    type: PAYMENT_ACTIONS.SET_ERROR,
                    payload: error.message
                });
                return { success: false, error: error.message };
            } finally {
                dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: false });
            }
        },

        // Registrar pagamento manual (dinheiro ou transferência)
        // Registrar pagamento manual (dinheiro ou transferência)
        registerManualPayment: async (orderId, amount, paymentType, referenceInfo) => {
            if (!orderId || !amount || !paymentType || !referenceInfo) {
                dispatch({
                    type: PAYMENT_ACTIONS.SET_ERROR,
                    payload: 'Dados incompletos para registro de pagamento manual'
                });
                return { success: false, error: 'Dados incompletos para registro de pagamento manual' };
            }

            dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
            console.log(`Registrando pagamento manual: tipo=${paymentType}, orderId=${orderId}, amount=${amount}`);

            try {
                // Chamar serviço para registrar pagamento manual
                const paymentResponse = await paymentService.registerManualPayment(
                    orderId,
                    amount,
                    paymentType,
                    referenceInfo
                );

                console.log("Resposta do registro manual:", paymentResponse);

                // Verificar se temos uma resposta simulada (contorno temporário para problema do backend)
                const isWorkaround = paymentResponse._note && paymentResponse._note.includes("simulada");
                if (isWorkaround) {
                    console.log("Usando resposta simulada devido a problema no backend");
                }

                if (!paymentResponse.success) {
                    throw new Error(paymentResponse.error || 'Falha no registro do pagamento manual');
                }

                // Guardar dados da transação
                if (paymentResponse.transaction_id) {
                    dispatch({
                        type: PAYMENT_ACTIONS.SET_TRANSACTION_DATA,
                        payload: {
                            transactionId: paymentResponse.transaction_id
                        }
                    });
                }

                // Definir resultado do pagamento
                dispatch({
                    type: PAYMENT_ACTIONS.SET_PAYMENT_RESULT,
                    payload: paymentResponse
                });

                // Definir status do pagamento como pendente de validação
                dispatch({
                    type: PAYMENT_ACTIONS.SET_PAYMENT_STATUS,
                    payload: { status: PAYMENT_STATUS.PENDING_VALIDATION }
                });

                dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: false });
                return { success: true, data: paymentResponse };

            } catch (error) {
                console.error("Erro em registerManualPayment:", error.message);

                let errorMessage = error.message;

                // Melhorar mensagens de erro
                if (error.message.includes("500") || error.message.includes("Internal Server Error")) {
                    errorMessage = "Erro no servidor ao registrar pagamento. Por favor, contacte o suporte.";
                } else if (error.message.includes("'str' object has no attribute 'profile'") ||
                    error.message.includes("permission") ||
                    error.message.includes("permissão")) {
                    errorMessage = "Erro de permissão: Não tem autorização para realizar esta operação.";
                }

                dispatch({
                    type: PAYMENT_ACTIONS.SET_ERROR,
                    payload: errorMessage
                });
                return { success: false, error: errorMessage };
            } finally {
                dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: false });
            }
        },

        // Aprovar/validar um pagamento manual (apenas para admin)
        approvePayment: async (paymentPk) => {
            if (!paymentPk) {
                dispatch({
                    type: PAYMENT_ACTIONS.SET_ERROR,
                    payload: 'ID de pagamento não fornecido'
                });
                return { success: false, error: 'ID de pagamento não fornecido' };
            }

            dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: true });
            console.log(`Aprovando pagamento: pk=${paymentPk}`);

            try {
                // Chamar serviço para aprovar pagamento
                const response = await paymentService.approvePayment(paymentPk);

                console.log("Resposta da aprovação:", response);

                if (!response.success) {
                    throw new Error(response.error || 'Falha na aprovação do pagamento');
                }

                // Atualizar status do pagamento para PAID
                dispatch({
                    type: PAYMENT_ACTIONS.SET_PAYMENT_STATUS,
                    payload: { status: PAYMENT_STATUS.PAID }
                });

                dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: false });
                return { success: true, data: response };

            } catch (error) {
                console.error("Erro em approvePayment:", error.message);
                dispatch({
                    type: PAYMENT_ACTIONS.SET_ERROR,
                    payload: error.message
                });
                return { success: false, error: error.message };
            } finally {
                dispatch({ type: PAYMENT_ACTIONS.SET_LOADING, payload: false });
            }
        },

        // Resetar o pagamento (manter apenas os detalhes do pedido)
        resetPayment: () => {
            // Parar polling, se existir
            if (statusPolling) {
                statusPolling.stop();
                statusPolling = null;
            }

            dispatch({ type: PAYMENT_ACTIONS.RESET_PAYMENT });
        }
    };

    return (
        <PaymentContext.Provider value={{ state, ...actions }}>
            {children}
        </PaymentContext.Provider>
    );
};