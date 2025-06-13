import { addDocumentStep } from '../../../services/documentService';
import { notification } from '../../../components/common/Toaster/ThemedToaster';

/**
 * Finaliza tarefa do operador (parâmetros + passo para who=81, what=0)
 */
export const completeOperatorTask = async (documentId, note = "Tarefa concluída") => {
    try {
        // 1. Validação
        if (!documentId) {
            throw new Error("ID do documento é obrigatório");
        }

        // 2. Preparar dados do passo
        const stepData = {
            tb_document: documentId,  // Campo obrigatório no backend
            memo: note,
            who: '81',
            what: '0'
        };

        // 3. Executar com notificação de loading
        const result = await notification.loading(
            () => addDocumentStep(documentId, stepData),
            "A finalizar tarefa...",
            "Tarefa finalizada com sucesso!",
            "Erro ao finalizar tarefa"
        );

        return {
            success: true,
            message: 'Tarefa concluída com sucesso',
            data: result
        };

    } catch (error) {
        console.error('Erro ao finalizar tarefa:', error);

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