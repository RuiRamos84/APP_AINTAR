// frontend/src/pages/Operation/utils/workflowHelpers.js

/**
 * Obtém as transições válidas para um documento baseado no step atual
 * @param {Object} document - Documento com informação do step atual (what)
 * @param {Object} metaData - Metadados incluindo step_transitions
 * @returns {Array} Transições válidas para o step atual
 */
export const getValidTransitionsForCompletion = (document, metaData) => {
    console.log('🔍 getValidTransitionsForCompletion - Input:', {
        document_pk: document?.pk,
        document_regnumber: document?.regnumber,
        current_step: document?.what,
        document_type: document?.tt_type,
        transitions_available: metaData?.step_transitions?.length || 0
    });

    if (!document || !metaData?.step_transitions) {
        console.warn('❌ Sem documento ou step_transitions no metaData');
        return [];
    }

    const currentStep = document.what;
    const documentType = document.tt_type;

    // 🔥 Converter currentStep para number para comparação correta
    const currentStepNumber = Number(currentStep);

    // Encontrar o doctype_pk pelo tt_type do documento
    // IMPORTANTE: tt_type é o PK do tipo de documento, não o nome
    const documentTypePk = Number(documentType);

    console.log('🔄 Filtros de workflow:', {
        currentStep,
        currentStepNumber,
        documentType,
        documentTypePk
    });

    if (!documentTypePk) {
        console.warn('❌ Tipo de documento não encontrado');
        return [];
    }

    // Filtrar transições válidas:
    // 1. Mesmo tipo de documento (doctype_pk)
    // 2. Partindo do step atual (from_step_pk)
    const validTransitions = metaData.step_transitions.filter(transition => {
        const matchType = transition.doctype_pk === documentTypePk;
        const matchStep = transition.from_step_pk === currentStepNumber;

        if (matchType && matchStep) {
            console.log('✅ Transição válida encontrada:', {
                transition_id: transition.pk,
                from_step: transition.from_step_pk,
                from_step_name: transition.from_step_name,
                to_step: transition.to_step_pk,
                to_step_name: transition.to_step_name,
                client: transition.client
            });
        }

        return matchType && matchStep;
    });

    console.log(`📋 Total de transições válidas: ${validTransitions.length}`);
    return validTransitions;
};

/**
 * Determina o próximo step baseado nas transições do workflow
 * Se há múltiplas opções, retorna a primeira (pode ser refinado no futuro)
 * @param {Object} document - Documento atual
 * @param {Object} metaData - Metadados com step_transitions
 * @returns {Object|null} - { what: stepId, who: userId, to_step_name: string } ou null
 */
export const getNextStepFromWorkflow = (document, metaData) => {
    const validTransitions = getValidTransitionsForCompletion(document, metaData);

    if (validTransitions.length === 0) {
        console.warn('⚠️ Nenhuma transição válida encontrada no workflow');
        return null;
    }

    // Se há múltiplas transições, log para informar
    if (validTransitions.length > 1) {
        console.warn('⚠️ Múltiplas transições possíveis:', validTransitions.map(t => ({
            to_step: t.to_step_pk,
            to_step_name: t.to_step_name,
            client: t.client
        })));
    }

    // Pegar a primeira transição válida
    const selectedTransition = validTransitions[0];

    // Extrair o client (pode ser array ou valor único)
    let targetUser;
    if (Array.isArray(selectedTransition.client)) {
        targetUser = selectedTransition.client[0]; // Pegar o primeiro se for array
        console.log('ℹ️ Client é array, usando o primeiro:', targetUser);
    } else {
        targetUser = selectedTransition.client;
    }

    const result = {
        what: String(selectedTransition.to_step_pk),
        who: String(targetUser),
        to_step_name: selectedTransition.to_step_name
    };

    console.log('✅ Próximo step determinado pelo workflow:', result);
    return result;
};

/**
 * Fallback para quando não há workflow configurado
 * Retorna step 0 (concluído) com user padrão
 * @returns {Object} - { what: '0', who: '17' }
 */
export const getFallbackCompletionStep = () => {
    console.log('⚠️ Usando fallback - sem workflow configurado');
    return {
        what: '0',   // CONCLUIDO COM SUCESSO
        who: '17',   // User padrão
        to_step_name: 'CONCLUIDO COM SUCESSO'
    };
};

/**
 * Função principal para determinar o próximo step ao concluir uma operação
 * @param {Object} document - Documento atual
 * @param {Object} metaData - Metadados com step_transitions
 * @returns {Object} - { what: stepId, who: userId, to_step_name: string }
 */
export const getCompletionStep = (document, metaData) => {
    console.log('🎯 getCompletionStep - Iniciando determinação do próximo step');

    if (!document) {
        console.error('❌ Documento não fornecido');
        return getFallbackCompletionStep();
    }

    // Tentar obter do workflow
    const workflowStep = getNextStepFromWorkflow(document, metaData);

    if (workflowStep) {
        return workflowStep;
    }

    // Fallback se não há workflow
    console.warn('⚠️ Workflow não disponível, usando fallback');
    return getFallbackCompletionStep();
};
