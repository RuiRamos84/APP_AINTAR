// frontend/src/pages/Operation/services/completionService.js
import { addDocumentStep } from '../../../services/documentService';
import { notification } from './notificationService';

export const completeOperatorTask = async (documentId, note = "Tarefa concluída") => {
    if (!documentId) throw new Error("ID do documento é obrigatório");

    const stepData = {
        tb_document: documentId,
        memo: note,
        who: '81',
        what: '0'
    };

    try {
        const result = await notification.loading(
            addDocumentStep(documentId, stepData),
            "A finalizar tarefa...",
            "Tarefa finalizada!",
            "Erro ao finalizar"
        );

        return { success: true, data: result };
    } catch (error) {
        console.error('Erro:', error);
        throw error;
    }
};

export const validateTaskCompletion = (document, currentUser) => {
    if (!document) return { valid: false, reason: 'Documento não encontrado' };
    if (Number(document.who) !== Number(currentUser?.user_id)) {
        return { valid: false, reason: 'Sem permissão' };
    }
    return { valid: true };
};