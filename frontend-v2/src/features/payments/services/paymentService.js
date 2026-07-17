import api from '../../../services/api/client';
import { registerPendingTransaction } from '@/core/utils/pendingTransactions';

class PaymentService {
    /**
     * CHECKOUT PREVENTIVO SIBS - Apenas para MBWay e Multibanco
     */
    async createPreventiveCheckout(documentId, amount) {
        const response = await api.post('/payments/checkout', {
            document_id: documentId,
            amount,
            payment_method: 'MBWAY' // Qualquer um serve para checkout SIBS
        });

        if (!response?.success) {
            throw new Error(response?.error || 'Erro no checkout SIBS');
        }
        // O webhook 'payment_status_update' é broadcast para todos os clientes;
        // registar a transação permite ao SocketContext reagir só às deste browser.
        registerPendingTransaction(response?.transaction_id);
        return response;
    }

    async getInvoiceAmount(documentId) {
        const response = await api.get(`/payments/invoice/${documentId}`);
        return response;
    }

    /**
     * MBWAY - Usa checkout SIBS existente
     */
    async processMBWay(transactionId, phoneNumber) {
        try {
            const response = await api.post('/payments/mbway', {
                transaction_id: transactionId,
                phone_number: phoneNumber
            });
            return response;
        } catch (error) {
            const backendMsg = error.response?.data?.error;
            if (backendMsg) {
                throw new Error(backendMsg);
            }
            throw error;
        }
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

    /** Força sincronização com SIBS — inclui devoluções feitas no backoffice SIBS */
    async forceSyncStatus(transactionId) {
        const response = await api.post(`/payments/force-sync/${transactionId}`);
        return response;
    }

    /**
     * ADMINISTRAÇÃO
     */
    async getPaymentDetails(paymentPk) {
        const response = await api.get(`/payments/details/${paymentPk}`);
        return response;
    }

    async getPendingPayments() {
        const response = await api.get('/payments/pending');
        return response;
    }

    async approvePayment(paymentPk) {
        const response = await api.put(`/payments/approve/${paymentPk}`);
        return response;
    }

    async getPaymentHistory(params = {}) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                queryParams.append(key, value);
            }
        });
        const response = await api.get(`/payments/history?${queryParams}`);
        return response;
    }

    /**
     * DEVOLUÇÕES
     */
    async refundPayment(paymentPk, reason = '') {
        const response = await api.post(`/payments/refund/${paymentPk}`, { reason });
        return response;
    }

    /**
     * ISENÇÕES
     */
    async applyExemption(documentId) {
        const response = await api.post('/payments/exemptions/apply', { document_id: documentId });
        return response;
    }

    async submitExemption(documentId) {
        const response = await api.post('/payments/exemptions/submit', { document_id: documentId });
        return response;
    }

    async getPendingExemptions() {
        const response = await api.get('/payments/exemptions/pending');
        return response;
    }

    async getExemptionHistory(params = {}) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                queryParams.append(key, value);
            }
        });
        const response = await api.get(`/payments/exemptions?${queryParams}`);
        return response;
    }

    async approveExemption(paymentPk) {
        const response = await api.put(`/payments/exemptions/${paymentPk}/approve`);
        return response;
    }

    async rejectExemption(paymentPk) {
        const response = await api.put(`/payments/exemptions/${paymentPk}/reject`);
        return response;
    }

    /**
     * CONTRATOS
     */
    async getContracts() {
        const response = await api.get('/payments/contracts');
        return response;
    }

    async getEntityByNipc(nipc) {
        const response = await api.get(`/entity/nipc/${nipc}`);
        return response;
    }

    async createContract(data) {
        const response = await api.post('/payments/contracts', data);
        return response;
    }

    async getContractAlerts() {
        const response = await api.get('/payments/contracts/alerts');
        return response;
    }

    async getContractPayments(contractPk) {
        const response = await api.get(`/payments/contracts/${contractPk}/payments`);
        return response;
    }

    async invoiceContractPayment(contractPk, paymentPk, invoiceDate) {
        const response = await api.patch(`/payments/contracts/${contractPk}/payments/${paymentPk}/invoice`, { invoice_date: invoiceDate || null });
        return response;
    }

    async validateContractPayment(contractPk, paymentPk, payedDate) {
        const response = await api.patch(`/payments/contracts/${contractPk}/payments/${paymentPk}/validate`, { payed_date: payedDate });
        return response;
    }
}

export default new PaymentService();
