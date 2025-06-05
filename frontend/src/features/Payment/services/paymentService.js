import api from '../../../services/api';

class PaymentService {
    constructor() {
        this.api = api;
    }

    /**
     * CHECKOUT PREVENTIVO - Criar logo ao entrar no módulo
     */
    async createPreventiveCheckout(documentId, amount) {
        const response = await this.api.post('/payments/checkout', {
            document_id: documentId,
            amount,
            payment_method: 'MBWAY' // Qualquer um serve para checkout SIBS
        });

        if (response.data.success) {
            return response.data;
        }

        throw new Error(response.data.error || 'Erro no checkout');
    }

    async getInvoiceAmount(documentId) {
        try {
            const response = await this.api.get(`/payments/invoice/${documentId}`);
            return response.data;
        } catch (error) {
            throw new Error(error.message || 'Erro fatura');
        }
    }

    /**
     * MBWAY - Usa checkout existente
     */
    async processMBWay(transactionId, phoneNumber) {
        const response = await this.api.post('/payments/mbway', {
            transaction_id: transactionId,
            phone_number: phoneNumber
        });

        if (response.data.success) {
            return response.data;
        }

        throw new Error(response.data.error || 'Erro MBWay');
    }

    /**
     * MULTIBANCO - Usa checkout existente
     */
    async processMultibanco(transactionId) {
        const response = await this.api.post('/payments/multibanco', {
            transaction_id: transactionId
        });

        if (response.data.success) {
            return response.data;
        }

        throw new Error(response.data.error || 'Erro Multibanco');
    }

    /**
     * MANUAL - Direto (sem checkout SIBS)
     */
    async processManual(documentId, amount, paymentType, details) {
        const response = await this.api.post('/payments/manual', {
            document_id: documentId,
            amount,
            payment_type: paymentType,
            payment_details: details
        });

        if (response.data.success) {
            return response.data;
        }

        throw new Error(response.data.error || 'Erro pagamento manual');
    }

    /**
     * FLUXO COMPLETO - Para métodos SIBS
     */
    async processFullPayment(documentId, amount, method, extraData = {}) {
        try {
            // 1. Criar checkout
            const checkout = await this.createCheckout(documentId, amount, method);

            // 2. Processar pagamento
            switch (method) {
                case 'MBWAY':
                    if (!extraData.phoneNumber) {
                        throw new Error('Número de telefone obrigatório');
                    }
                    return await this.processMBWay(checkout.transaction_id, extraData.phoneNumber);

                case 'MULTIBANCO':
                    return await this.processMultibanco(checkout.transaction_id);

                default:
                    throw new Error('Método inválido para checkout SIBS');
            }
        } catch (error) {
            throw new Error(error.message || 'Erro no pagamento');
        }
    }

    async checkStatus(transactionId) {
        const response = await this.api.get(`/payments/status/${transactionId}`);
        console.log('Frontend recebeu:', response.data); // ✅ 
        return response.data;
    }

    async getPendingPayments() {
        const response = await this.api.get('/payments/pending');
        return response.data;
    }

    async approvePayment(paymentPk) {
        const response = await this.api.put(`/payments/approve/${paymentPk}`);
        return response.data;
    }

    async getPaymentHistory(params = {}) {
        try {
            const queryParams = new URLSearchParams();

            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    queryParams.append(key, value);
                }
            });

            const response = await this.api.get(`/payments/history?${queryParams}`);
            return response.data;
        } catch (error) {
            throw new Error(error.message || 'Erro histórico');
        }
    }
}

export default new PaymentService();