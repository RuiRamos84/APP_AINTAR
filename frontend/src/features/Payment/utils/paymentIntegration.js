// src/features/Payment/utils/paymentIntegration.js
import paymentService from '../services/paymentService';

/**
 * Utilitário para integração do módulo de pagamentos com outros módulos da aplicação
 */
const paymentIntegration = {
    /**
 * Inicia um processo de pagamento para um documento
 * @param {Object} document - Documento a ser pago
 * @param {Function} onSuccess - Callback a ser chamado em caso de sucesso
 * @param {Function} onError - Callback a ser chamado em caso de erro
 * @param {Function} showNotification - Função para exibir notificações
 * @returns {Promise<Object>} - Dados de pagamento ou erro
 */
    async initiateDocumentPayment(document, onSuccess, onError, showNotification) {
        if (!document || !document.pk) {
            const error = "Documento inválido ou sem identificador";
            if (onError) onError(error);
            if (showNotification) showNotification(error, 'error');
            return { success: false, error };
        }

        try {
            if (showNotification) showNotification('Obtendo dados de pagamento...', 'info');

            // Obter valor a ser pago
            const response = await paymentService.getInvoiceAmount(document.pk);

            if (response.success && response.invoice_data) {
                const invoiceData = response.invoice_data;
                const hasPaymentData = !!invoiceData.updated_at;

                // Preparar dados de pagamento
                const paymentData = {
                    orderId: document.regnumber || document.pk.toString(),
                    documentId: document.pk,
                    amount: invoiceData.invoice || 0,
                    description: document.descr || 'Pagamento de documento',
                    invoiceData: invoiceData,
                    hasPaymentData: hasPaymentData
                };

                // Chamar callback de sucesso
                if (onSuccess) onSuccess(paymentData);
                return {
                    success: true,
                    paymentData,
                    hasPaymentData
                };
            } else {
                const error = response.error || 'Não foi possível obter os dados da fatura para este documento';
                if (onError) onError(error);
                if (showNotification) showNotification(error, 'error');
                return { success: false, error };
            }
        } catch (error) {
            console.error('Erro ao iniciar pagamento:', error);
            const errorMessage = error.message || 'Erro ao iniciar processo de pagamento';
            if (onError) onError(errorMessage);
            if (showNotification) showNotification(errorMessage, 'error');
            return { success: false, error: errorMessage };
        }
    },

    /**
     * Processa o resultado do pagamento e atualiza o documento se necessário
     * @param {Object} paymentResult - Resultado do pagamento
     * @param {Object} document - Documento que foi pago
     * @param {Function} onComplete - Callback a ser chamado após processamento
     * @param {Function} showNotification - Função para exibir notificações
     * @param {Function} refreshData - Função para atualizar dados
     */
    processPaymentResult(paymentResult, document, onComplete, showNotification, refreshData) {
        if (paymentResult && paymentResult.success) {
            if (showNotification) showNotification('Pagamento processado com sucesso!', 'success');

            // Atualizar documento se necessário
            if (refreshData) refreshData();
        }

        if (onComplete) onComplete(paymentResult);
    }
};

export default paymentIntegration;