// src/hooks/usePayment.js
import { useState } from 'react';
import paymentService from '../services/paymentService';
import { PAYMENT_METHODS, PAYMENT_STATUS } from '../services/paymentTypes';

export const usePayment = () => {
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [transactionId, setTransactionId] = useState(null);
    const [transactionSignature, setTransactionSignature] = useState(null);
    const [orderId, setOrderId] = useState(null);
    const [amount, setAmount] = useState(0);
    const [status, setStatus] = useState(PAYMENT_STATUS.PENDING);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [paymentData, setPaymentData] = useState({});

    // Definir dados do pedido
    const setOrderDetails = (id, value) => {
        setOrderId(id);
        setAmount(value);
    };

    // Selecionar método de pagamento
    const selectPaymentMethod = (method) => {
        setSelectedMethod(method);
    };

    // Processar pagamento MBWay
    const payWithMBWay = async (phoneNumber) => {
        setLoading(true);
        setError(null);

        try {
            console.log('Iniciando pagamento MBWay:', { orderId, amount, phoneNumber });

            // Usar o paymentService para processar o pagamento
            const response = await paymentService.processMBWayPayment(
                orderId,
                amount,
                phoneNumber
            );

            console.log('Resposta MB WAY:', response);

            if (response.success) {
                // Extrair IDs da transação
                setTransactionId(response.transaction_id);
                setTransactionSignature(response.transaction_signature);
                setStatus(PAYMENT_STATUS.PENDING);

                // Atualizar dados de pagamento
                setPaymentData({
                    ...paymentData,
                    phoneNumber: phoneNumber.replace('351#', '')
                });

                return {
                    success: true,
                    method: PAYMENT_METHODS.MBWAY,
                    transactionId: response.transaction_id
                };
            } else {
                throw new Error(response.error || 'Falha ao processar pagamento MBWay');
            }
        } catch (err) {
            console.error('Erro no pagamento MBWay:', err);
            setError(err.message || 'Erro ao processar pagamento MBWay');
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // Processar pagamento Multibanco
    const payWithMultibanco = async (expiryDays) => {
        setLoading(true);
        setError(null);

        try {
            // Calcular data de expiração
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + expiryDays);
            const expiryDateString = expiryDate.toISOString();

            console.log('Iniciando pagamento Multibanco:', { orderId, amount, expiryDate: expiryDateString });

            // Usar o paymentService para gerar referência multibanco
            const response = await paymentService.generateMultibancoReference(
                orderId,
                amount,
                expiryDateString
            );

            console.log('Resposta Multibanco:', response);

            if (response.success) {
                // Extrair IDs da transação e dados do multibanco
                setTransactionId(response.transaction_id);
                setTransactionSignature(response.transaction_signature);

                // Extrair dados do multibanco
                const multibancoDetails = response.multibanco_response || {};

                // Atualizar dados de pagamento
                setPaymentData({
                    ...paymentData,
                    entity: multibancoDetails.entity,
                    reference: multibancoDetails.reference,
                    expiryDate: multibancoDetails.expiryDate,
                    amount: multibancoDetails.amount?.value || amount
                });

                setStatus(PAYMENT_STATUS.PENDING);

                return {
                    success: true,
                    method: PAYMENT_METHODS.MULTIBANCO,
                    transactionId: response.transaction_id
                };
            } else {
                throw new Error(response.error || 'Falha ao gerar referência Multibanco');
            }
        } catch (err) {
            console.error('Erro ao gerar referência Multibanco:', err);
            setError(err.message || 'Erro ao gerar referência Multibanco');
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // Verificar status do pagamento
    const checkStatus = async () => {
        if (!transactionId) {
            setError('ID de transação não disponível');
            return { success: false };
        }

        setLoading(true);
        try {
            const response = await paymentService.checkPaymentStatus(transactionId);

            if (response.success) {
                // Obter status correto da resposta
                const paymentStatus = response.status.paymentStatus;
                setStatus(paymentStatus);

                return { success: true, status: paymentStatus };
            } else {
                throw new Error(response.error || 'Falha ao verificar status');
            }
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // Métodos auxiliares
    const getMBWayDetails = () => {
        return {
            phoneNumber: paymentData.phoneNumber,
            transactionId
        };
    };

    const getMultibancoDetails = () => {
        return {
            entity: paymentData.entity,
            reference: paymentData.reference,
            amount: paymentData.amount || amount,
            expiryDate: paymentData.expiryDate
        };
    };

    return {
        selectedMethod,
        transactionId,
        transactionSignature,
        orderId,
        amount,
        status,
        loading,
        error,
        paymentData,
        setOrderDetails,
        selectPaymentMethod,
        payWithMBWay,
        payWithMultibanco,  // Novo método implementado
        checkStatus,
        getMBWayDetails,
        getMultibancoDetails,  // Novo método implementado
        updatePaymentData: (data) => setPaymentData({ ...paymentData, ...data }),
        resetPayment: () => {
            setSelectedMethod(null);
            setTransactionId(null);
            setTransactionSignature(null);
            setStatus(PAYMENT_STATUS.PENDING);
            setError(null);
            setPaymentData({});
        }
    };
};