import api from '../../../services/api';

class PaymentService {
    constructor() {
        this.api = api;
    }

    /**
     * CHECKOUT PREVENTIVO SIBS - Apenas para MBWay e Multibanco
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

        throw new Error(response.data.error || 'Erro no checkout SIBS');
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
     * MBWAY - Usa checkout SIBS existente
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
     * MULTIBANCO - Usa checkout SIBS existente
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
     * DADOS SIBS - Buscar por order_id
     */
    async getSibsData(orderId) {
        try {
            const response = await this.api.get(`/payments/sibs/${orderId}`);
            return response.data;
        } catch (error) {
            console.error('Erro dados SIBS:', error);
            return null;
        }
    }

    /**
     * PAGAMENTOS MANUAIS - Direto, sem checkout SIBS
     * Para: CASH, BANK_TRANSFER, MUNICIPALITY
     */
    async processManual(documentId, amount, paymentType, details) {
        console.log('🔧 Processando pagamento manual:', {
            documentId,
            amount,
            paymentType,
            details
        });

        // Converter details para reference_info
        let reference_info;
        if (typeof details === 'string') {
            reference_info = details;
        } else if (details && typeof details === 'object') {
            if (details.reference_info) {
                reference_info = details.reference_info;
            } else {
                // Serializar objeto complexo
                reference_info = JSON.stringify(details);
            }
        } else {
            reference_info = 'Pagamento manual registado';
        }

        const response = await this.api.post('/payments/manual-direct', {
            document_id: documentId,
            amount,
            payment_type: paymentType,
            reference_info
        });

        if (response.data.success) {
            return response.data;
        }

        throw new Error(response.data.error || 'Erro pagamento manual');
    }

    /**
     * VERIFICAR STATUS - Funciona para todos os tipos
     */
    async checkStatus(transactionId) {
        const response = await this.api.get(`/payments/status/${transactionId}`);
        console.log('Frontend recebeu status:', response.data);
        return response.data;
    }

    /**
     * ADMINISTRAÇÃO
     */
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

    /**
     * UTILITÁRIOS
     */

    // Determinar se método precisa checkout SIBS
    requiresSibsCheckout(paymentMethod) {
        return ['MBWAY', 'MULTIBANCO'].includes(paymentMethod);
    }

    // Determinar se método é manual
    isManualMethod(paymentMethod) {
        return ['CASH', 'BANK_TRANSFER', 'MUNICIPALITY'].includes(paymentMethod);
    }

    // Validar dados do método
    validateMethodData(paymentMethod, data) {
        switch (paymentMethod) {
            case 'MBWAY':
                if (!data.phoneNumber) throw new Error('Número de telefone obrigatório');
                break;
            case 'CASH':
                if (!data.reference_info) throw new Error('Informação de referência obrigatória');
                break;
            case 'BANK_TRANSFER':
                if (!data.accountHolder || !data.iban) throw new Error('Dados bancários obrigatórios');
                break;
            case 'MUNICIPALITY':
                if (!data.municipality || !data.reference) throw new Error('Município e referência obrigatórios');
                break;
        }
        return true;
    }
}

export default new PaymentService();