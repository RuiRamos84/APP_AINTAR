// frontend/src/pages/Operation/services/api.js - CONSOLIDADO
import api from '../../../services/api';
import { addDocumentStep } from '../../../services/documentService';
import { notification } from './notificationService';
import { getCompletionStep } from '../utils/workflowHelpers';

// === OPERAÇÕES ===
export const fetchOperationsData = async (page = 1, pageSize = 50) => {
    const response = await api.get('/operations', {
        params: { page, page_size: pageSize }
    });
    return response.data;
};

// === FINALIZAÇÃO ===

/**
 * Completa uma operação seguindo o workflow configurado
 * @param {number} documentId - ID do documento
 * @param {string} note - Nota de conclusão
 * @param {Object} document - Documento atual com informação do step
 * @param {Object} metaData - Metadados com step_transitions (workflow)
 * @returns {Promise<Object>} - Resultado da operação
 */
export const completeOperation = async (documentId, note = "Tarefa concluída", document = null, metaData = null) => {
    if (!documentId) throw new Error("ID obrigatório");

    console.log('🚀 completeOperation - Iniciando:', {
        documentId,
        document_regnumber: document?.regnumber,
        current_step: document?.what,
        has_metaData: !!metaData,
        has_step_transitions: !!metaData?.step_transitions
    });

    // Determinar próximo step usando o workflow dinâmico
    const nextStep = getCompletionStep(document, metaData);

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

    try {
        // Mensagens dinâmicas baseadas no destino
        const isCompletion = nextStep.what === '0';

        const result = await notification.loading(
            addDocumentStep(documentId, stepData),
            isCompletion ? "A finalizar..." : `A enviar para ${nextStep.to_step_name}...`,
            isCompletion ? "Finalizado!" : `Enviado para ${nextStep.to_step_name}!`,
            "Erro ao processar"
        );

        console.log('✅ Operação concluída com sucesso');
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ Erro ao completar operação:', error);
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