import { addDocumentStep } from '../../../services/documentService';

/**
 * Finaliza tarefa (parâmetros + passo who=81, what=0)
 */
export const completeOperatorTask = async (documentId, note = "Tarefa concluída") => {
    if (!documentId) throw new Error("ID do documento é obrigatório");

    const stepData = {
        tb_document: documentId,
        memo: note,
        who: '81',
        what: '0'
    };

    try {
        const result = await addDocumentStep(documentId, stepData);
        return { success: true, message: 'Tarefa concluída', data: result };
    } catch (error) {
        console.error('Erro ao finalizar tarefa:', error);
        throw error;
    }
};

/**
 * Valida se tarefa pode ser finalizada
 */
export const validateTaskCompletion = (document, currentUser) => {
    if (!document) return { valid: false, reason: 'Documento não encontrado' };

    if (Number(document.who) !== Number(currentUser?.user_id)) {
        return { valid: false, reason: 'Sem permissão para finalizar' };
    }

    return { valid: true };
};