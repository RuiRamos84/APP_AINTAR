import api from '../../../services/api/client';

class PaymentService {
    /**
     * CHECKOUT PREVENTIVO SIBS - Apenas para MBWay e Multibanco
     */
    async createPreventiveCheckout(documentId, amount) {
        // In V2, we might not have the exact same route, but we assume parity.
        // Legacy used: /payments/checkout
        const response = await api.post('/payments/checkout', {
            document_id: documentId,
            amount,
            payment_method: 'MBWAY' // Qualquer um serve para checkout SIBS
        });

        if (response.success) return response;
        if (response.data && response.data.success) return response.data;
        
        // Handle V2 api response structure which returns data directly usually?
        // But for post, it might differ.
        if (response.transaction_id) return response; // Direct return case

        throw new Error(response.error || response.data?.error || 'Erro no checkout SIBS');
    }

    async getInvoiceAmount(documentId) {
        // Legacy: /payments/invoice/${documentId}
        const response = await api.get(`/payments/invoice/${documentId}`);
        // Legacy returned response.data. V2 client interceptor usually returns data.
        return response;
    }

    /**
     * MBWAY - Usa checkout SIBS existente
     */
    async processMBWay(transactionId, phoneNumber) {
        const response = await api.post('/payments/mbway', {
            transaction_id: transactionId,
            phone_number: phoneNumber
        });
        return response;
    }

    /**
     * MULTIBANCO - Usa checkout SIBS existente
     */
    async processMultibanco(transactionId) {
        const response = await api.post('/payments/multibanco', {
            transaction_id: transactionId
        });
        return response;
    }

    /**
     * DADOS SIBS - Buscar por order_id
     */
    async getSibsData(orderId) {
        try {
            const response = await api.get(`/payments/sibs/${orderId}`);
            return response;
        } catch (error) {
            console.error('Erro dados SIBS:', error);
            return null;
        }
    }

    async processManual(documentId, amount, paymentType, details) {
        let reference_info;

        if (typeof details === 'string') {
            reference_info = details;
        } else if (details && typeof details === 'object') {
            if (details.userReference) {
                reference_info = `${paymentType} - Ref: ${details.userReference}`;
                if (details.municipality) reference_info += ` - ${details.municipality}`;
                if (details.paymentDate) reference_info += ` - ${new Date(details.paymentDate).toLocaleDateString('pt-PT')}`;
                if (details.processedBy) reference_info += ` - Por: ${details.processedBy}`;
            } else if (details.reference_info) {
                reference_info = details.reference_info;
            } else {
                reference_info = JSON.stringify(details);
            }
        } else {
            reference_info = `Pagamento ${paymentType} registado`;
        }

        const response = await api.post('/payments/manual-direct', {
            document_id: documentId,
            amount,
            payment_type: paymentType,
            reference_info
        });
        return response;
    }

    async checkStatus(transactionId) {
        const response = await api.get(`/payments/status/${transactionId}`);
        return response;
    }
}

export default new PaymentService();
