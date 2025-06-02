import api from '../../../services/api';

class PaymentService {
    constructor() {
        this.api = api;
        this.checkoutCache = new Map(); // Cache de checkouts
    }

    /**
     * CHECKOUT AUTOMÁTICO (invisível ao user)
     */
    async _ensureCheckout(documentId, amount, method) {
        const key = `${documentId}-${amount}-${method}`;

        // Usar cache se existir
        if (this.checkoutCache.has(key)) {
            return this.checkoutCache.get(key);
        }

        // Criar novo checkout
        const response = await this.api.post('/payments/checkout', {
            document_id: documentId,
            amount,
            payment_method: method
        });

        if (response.data.success) {
            this.checkoutCache.set(key, response.data);
            return response.data;
        }

        throw new Error(response.data.error || 'Erro no checkout');
    }

    // Adicionar ao PaymentService
    async getInvoiceAmount(documentId) {
        try {
            const response = await this.api.get(`/payments/invoice/${documentId}`);
            return response.data;
        } catch (error) {
            throw new Error(error.message || 'Erro fatura');
        }
    }

    /**
     * MBWAY - tudo num passo
     */
    async processMBWay(documentId, amount, phoneNumber) {
        try {
            // 1. Checkout automático
            const checkout = await this._ensureCheckout(documentId, amount, 'MBWAY');

            // 2. Processar MBWay
            const response = await this.api.post('/payments/mbway', {
                transaction_id: checkout.transaction_id,
                phone_number: phoneNumber
            });

            return {
                success: true,
                transaction_id: checkout.transaction_id,
                data: response.data
            };
        } catch (error) {
            throw new Error(error.message || 'Erro MBWay');
        }
    }

    /**
     * MULTIBANCO - tudo num passo
     */
    async processMultibanco(documentId, amount) {
        try {
            const checkout = await this._ensureCheckout(documentId, amount, 'MULTIBANCO');

            const response = await this.api.post('/payments/multibanco', {
                transaction_id: checkout.transaction_id
            });

            return {
                success: true,
                transaction_id: checkout.transaction_id,
                reference: response.data.multibanco_reference
            };
        } catch (error) {
            throw new Error(error.message || 'Erro Multibanco');
        }
    }

    /**
     * MANUAL - tudo num passo
     */
    async processManual(documentId, amount, paymentType, details) {
        try {
            const checkout = await this._ensureCheckout(documentId, amount, paymentType);

            const response = await this.api.post('/payments/manual', {
                transaction_id: checkout.transaction_id,
                payment_details: details
            });

            return {
                success: true,
                transaction_id: checkout.transaction_id,
                status: 'PENDING_VALIDATION'
            };
        } catch (error) {
            throw new Error(error.message || 'Erro pagamento manual');
        }
    }

    /**
     * PRÉ-CHECKOUT - para acelerar seleção
     */
    async preloadCheckouts(documentId, amount, methods) {
        const promises = methods.map(method =>
            this._ensureCheckout(documentId, amount, method).catch(() => null)
        );
        await Promise.all(promises);
    }

    /**
     * Outros métodos inalterados...
     */
    async checkStatus(transactionId) {
        const response = await this.api.get(`/payments/status/${transactionId}`);
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

    // Limpar cache
    clearCache() {
        this.checkoutCache.clear();
    }
}

export default new PaymentService();