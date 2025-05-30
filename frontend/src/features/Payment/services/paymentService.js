import api from '../../../services/api';
import { PAYMENT_STATUS } from './paymentTypes';

class PaymentService {
    constructor() {
        this.api = api;
        this.forceRealApi = true;
    }

    /**
     * Obter dados da fatura
     */
    async getInvoiceData(documentId) {
        try {
            if (!documentId) throw new Error("ID do documento obrigatório");

            const response = await this.api.get(`/payments/invoice/${documentId}`);
            return response.data;
        } catch (error) {
            this._handleError(error, 'Erro ao obter dados da fatura');
            throw error;
        }
    }

    /**
     * Estado completo do pagamento do documento
     */
    async getDocumentPaymentStatus(documentId) {
        try {
            if (!documentId) throw new Error("ID do documento obrigatório");

            const response = await this.api.get(`/payments/document/${documentId}/status`);
            return response.data;
        } catch (error) {
            this._handleError(error, 'Erro ao obter estado do documento');
            throw error;
        }
    }

    /**
     * PASSO 1: Criar checkout (rápido)
     */
    async createCheckout(documentId, amount, paymentMethod) {
        try {
            const response = await this.api.post('/payments/checkout', {
                document_id: documentId,
                amount: amount,
                payment_method: paymentMethod
            });
            return response.data;
        } catch (error) {
            this._handleError(error, 'Erro ao criar checkout');
            throw error;
        }
    }

    /**
     * PASSO 2: Processar MBWay
     */
    async processMBWayPayment(transactionId, phoneNumber) {
        try {
            if (!transactionId) throw new Error("Transaction ID obrigatório");

            const response = await this.api.post('/payments/mbway', {
                transaction_id: transactionId,
                phone_number: phoneNumber
            });
            return response.data;
        } catch (error) {
            this._handleError(error, 'Erro no pagamento MBWay');
            throw error;
        }
    }

    /**
     * PASSO 2: Processar Multibanco
     */
    async processMultibancoPayment(transactionId) {
        try {
            if (!transactionId) throw new Error("Transaction ID obrigatório");

            const response = await this.api.post('/payments/multibanco', {
                transaction_id: transactionId
            });
            return response.data;
        } catch (error) {
            this._handleError(error, 'Erro no pagamento Multibanco');
            throw error;
        }
    }

    /**
     * PASSO 2: Processar pagamento manual
     */
    async processManualPayment(transactionId, paymentDetails) {
        try {
            if (!transactionId) throw new Error("Transaction ID obrigatório");

            const response = await this.api.post('/payments/manual', {
                transaction_id: transactionId,
                payment_details: paymentDetails
            });
            return response.data;
        } catch (error) {
            this._handleError(error, 'Erro no pagamento manual');
            throw error;
        }
    }

    /**
     * Verificar estado de transação
     */
    async checkPaymentStatus(transactionId) {
        try {
            if (!transactionId) throw new Error("Transaction ID obrigatório");

            const response = await this.api.get(`/payments/status/${transactionId}`);
            return response.data;
        } catch (error) {
            this._handleError(error, 'Erro ao verificar estado');
            throw error;
        }
    }

    /**
     * Registo direto de pagamento manual (compatibilidade)
     */
    async registerManualPaymentDirect(documentId, amount, paymentType, referenceInfo) {
        try {
            const response = await this.api.post('/payments/manual-direct', {
                document_id: documentId,
                amount: amount,
                payment_type: paymentType,
                reference_info: referenceInfo
            });
            return response.data;
        } catch (error) {
            this._handleError(error, 'Erro no registo manual');
            throw error;
        }
    }

    /**
     * Obter pagamentos pendentes
     */
    async getPendingPayments() {
        try {
            const response = await this.api.get('/payments/pending');
            return response.data;
        } catch (error) {
            if (error.response?.status === 403) {
                return { success: false, error: 'Sem permissão', payments: [] };
            }
            this._handleError(error, 'Erro ao obter pendentes');
            throw error;
        }
    }

    /**
     * Aprovar pagamento
     */
    async approvePayment(paymentPk) {
        try {
            if (!paymentPk) throw new Error("Payment PK obrigatório");

            const response = await this.api.put(`/payments/approve/${paymentPk}`);
            return response.data;
        } catch (error) {
            this._handleError(error, 'Erro na aprovação');
            throw error;
        }
    }

    /**
     * Fluxo completo MBWay (2 passos)
     */
    async completeMBWayFlow(documentId, amount, phoneNumber) {
        try {
            // Passo 1: Checkout
            const checkout = await this.createCheckout(documentId, amount, 'MBWAY');
            if (!checkout.success) throw new Error(checkout.error);

            // Passo 2: Processar
            const payment = await this.processMBWayPayment(checkout.transaction_id, phoneNumber);
            return {
                success: true,
                transaction_id: checkout.transaction_id,
                payment_data: payment
            };
        } catch (error) {
            this._handleError(error, 'Erro no fluxo MBWay');
            throw error;
        }
    }

    /**
     * Fluxo completo Multibanco (2 passos)
     */
    async completeMultibancoFlow(documentId, amount) {
        try {
            // Passo 1: Checkout
            const checkout = await this.createCheckout(documentId, amount, 'MULTIBANCO');
            if (!checkout.success) throw new Error(checkout.error);

            // Passo 2: Gerar referência
            const reference = await this.processMultibancoPayment(checkout.transaction_id);
            return {
                success: true,
                transaction_id: checkout.transaction_id,
                reference_data: reference
            };
        } catch (error) {
            this._handleError(error, 'Erro no fluxo Multibanco');
            throw error;
        }
    }

    /**
     * Fluxo completo manual (2 passos)
     */
    async completeManualFlow(documentId, amount, paymentType, paymentDetails) {
        try {
            // Passo 1: Checkout
            const checkout = await this.createCheckout(documentId, amount, paymentType);
            if (!checkout.success) throw new Error(checkout.error);

            // Passo 2: Submeter detalhes
            const submission = await this.processManualPayment(checkout.transaction_id, paymentDetails);
            return {
                success: true,
                transaction_id: checkout.transaction_id,
                submission_data: submission
            };
        } catch (error) {
            this._handleError(error, 'Erro no fluxo manual');
            throw error;
        }
    }

    /**
     * Polling para verificação periódica
     */
    pollPaymentStatus(transactionId, onStatusChange, interval = 5000, timeout = 300000) {
        if (!transactionId) {
            onStatusChange(PAYMENT_STATUS.UNKNOWN, { success: false, error: "Transaction ID inválido" });
            return { stop: () => { } };
        }

        let polling = true;
        let elapsed = 0;

        const controller = { stop: () => { polling = false; } };

        const poll = async () => {
            if (!polling || elapsed >= timeout) return;

            try {
                const statusData = await this.checkPaymentStatus(transactionId);
                const status = statusData.payment_status || statusData.internal_status || PAYMENT_STATUS.PENDING;

                onStatusChange(status, statusData);

                // Parar se concluído
                const finalStates = ['SUCCESS', 'DECLINED', 'EXPIRED', 'PENDING_VALIDATION'];
                if (finalStates.includes(status)) {
                    polling = false;
                    return;
                }

                elapsed += interval;
                setTimeout(poll, interval);
            } catch (error) {
                console.error('Erro no polling:', error);
                setTimeout(poll, interval);
            }
        };

        poll();
        return controller;
    }

    /**
     * Mapear estado backend → frontend
     */
    _mapPaymentStatus(backendStatus) {
        const mapping = {
            'CREATED': PAYMENT_STATUS.PENDING,
            'PENDING': PAYMENT_STATUS.PENDING,
            'PENDING_VALIDATION': PAYMENT_STATUS.PENDING_VALIDATION,
            'SUCCESS': PAYMENT_STATUS.PAID,
            'DECLINED': PAYMENT_STATUS.FAILED,
            'EXPIRED': PAYMENT_STATUS.EXPIRED
        };
        return mapping[backendStatus] || PAYMENT_STATUS.UNKNOWN;
    }

    /**
     * Tratamento de erros
     */
    _handleError(error, defaultMessage) {
        console.error(defaultMessage, error);

        if (error.response?.data) {
            const errorMessage = error.response.data.error || error.response.data.message || defaultMessage;
            throw new Error(errorMessage);
        }

        throw error;
    }

    // Métodos legacy para compatibilidade
    async getInvoiceAmount(documentId) {
        return this.getInvoiceData(documentId);
    }

    async registerManualPayment(orderId, amount, paymentType, referenceInfo) {
        return this.registerManualPaymentDirect(orderId, amount, paymentType, referenceInfo);
    }

    async generateMultibancoReference(orderId, amount, expiryDate) {
        return this.completeMultibancoFlow(orderId, amount);
    }

    async processMBWayPayment(orderId, amount, phoneNumber) {
        return this.completeMBWayFlow(orderId, amount, phoneNumber);
    }
}

export default new PaymentService();