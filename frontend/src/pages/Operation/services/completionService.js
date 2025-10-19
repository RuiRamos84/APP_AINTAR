// frontend/src/pages/Operation/services/completionService.js
import { addDocumentStep } from '../../../services/documentService';
import { notification } from '../../../components/common/Toaster/ThemedToaster';
import { getCompletionStep } from '../utils/workflowHelpers';

/**
 * Finaliza tarefa do operador usando workflow dinâmico
 * @param {number} documentId - ID do documento
 * @param {string} note - Nota de conclusão
 * @param {Object} document - Documento completo com step atual
 * @param {Object} metaData - MetaData global com step_transitions
 */
export const completeOperatorTask = async (documentId, note = "Tarefa concluída", document = null, metaData = null) => {
    try {
        // 1. Validação
        if (!documentId) {
            throw new Error("ID do documento é obrigatório");
        }

        console.log('🚀 completeOperatorTask - Iniciando:', {
            documentId,
            document_regnumber: document?.regnumber,
            current_step: document?.what,
            has_metaData: !!metaData,
            has_step_transitions: !!metaData?.step_transitions
        });

        // 2. Determinar próximo step usando workflow dinâmico
        const nextStep = getCompletionStep(document, metaData);

        // 3. Preparar dados do passo
        const stepData = {
            tb_document: documentId,
            memo: note,
            who: nextStep.who,
            what: nextStep.what
        };

        console.log('📤 Enviando step para:', {
            ...stepData,
            to_step_name: nextStep.to_step_name
        });

        // 4. Executar com notificação de loading
        // Não mostrar o step de destino ao operador - apenas confirmar conclusão
        const result = await notification.loading(
            () => addDocumentStep(documentId, stepData),
            "A processar tarefa...",
            "Tarefa concluída com sucesso!",
            "Erro ao processar"
        );

        console.log('✅ Tarefa concluída com sucesso');

        return {
            success: true,
            message: 'Tarefa concluída com sucesso',
            data: result
        };

    } catch (error) {
        console.error('❌ Erro ao finalizar tarefa:', error);

        // Notificação de erro específica
        notification.error(
            error.response?.data?.erro ||
            error.message ||
            'Erro inesperado ao finalizar tarefa'
        );

        throw error;
    }
};

/**
 * Valida se tarefa pode ser finalizada
 */
export const validateTaskCompletion = (document, currentUser) => {
    if (!document) return { valid: false, reason: 'Documento não encontrado' };

    if (Number(document.who) !== Number(currentUser?.user_id)) {
        return { valid: false, reason: 'Não tens permissão para finalizar esta tarefa' };
    }

    return { valid: true };
};
