// frontend/src/pages/Operation/services/api.js - CONSOLIDADO
import api from '../../../services/api';
import { addDocumentStep } from '../../../services/documentService';
import { notification } from './notificationService';

// === OPERAÇÕES ===
export const fetchOperationsData = async (page = 1, pageSize = 50) => {
    const response = await api.get('/operations', {
        params: { page, page_size: pageSize }
    });
    return response.data;
};

// === FINALIZAÇÃO ===
export const completeOperation = async (documentId, note = "Tarefa concluída") => {
    if (!documentId) throw new Error("ID obrigatório");

    const stepData = {
        tb_document: documentId,
        memo: note,
        who: '81',
        what: '0'
    };

    try {
        const result = await notification.loading(
            addDocumentStep(documentId, stepData),
            "A finalizar...",
            "Finalizado!",
            "Erro ao finalizar"
        );
        return { success: true, data: result };
    } catch (error) {
        console.error('Erro:', error);
        throw error;
    }
};

// === VALIDAÇÃO ===
export const validateTaskCompletion = (document, currentUser) => {
    if (!document) return { valid: false, reason: 'Documento não encontrado' };
    if (Number(document.who) !== Number(currentUser?.user_id)) {
        return { valid: false, reason: 'Sem permissão' };
    }
    return { valid: true };
};