import paymentService from '../services/paymentService';

export const paymentIntegration = {
    /**
     * Iniciar pagamento documento
     */
    async initDocumentPayment(document) {
        if (!document?.pk) throw new Error('Documento inválido');

        const response = await paymentService.getInvoiceData(document.pk);
        if (!response.success) throw new Error(response.error);

        return {
            documentId: document.pk,
            amount: response.invoice_data.invoice,
            orderId: document.regnumber
        };
    },

    /**
     * Abrir modal pagamento
     */
    openPaymentDialog(documentData, onComplete) {
        // Implementar conforme modal system da app
        return {
            component: 'PaymentDialog',
            props: {
                documentId: documentData.documentId,
                amount: documentData.amount,
                onComplete
            }
        };
    },

    /**
     * Processar resultado
     */
    processResult(result, onSuccess, onError) {
        if (result.success) {
            onSuccess?.(result);
            return true;
        }
        onError?.(result.error);
        return false;
    }
};

export default paymentIntegration;