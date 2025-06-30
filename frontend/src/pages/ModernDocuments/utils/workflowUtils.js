// utils/workflowUtils.js

/**
 * Obtém transições válidas para um documento
 * @param {Object} document - Documento actual
 * @param {Object} metaData - Metadados incluindo step_transitions
 * @returns {Array} Transições válidas
 */
export const getValidTransitions = (document, metaData) => {
    // console.log('🔍 getValidTransitions - Input:', {
    //     document_what: document?.what,
    //     document_type: document?.tt_type,
    //     document_type_code: document?.tt_type_code,
    //     transitions_count: metaData?.step_transitions?.length
    // });

    if (!document || !metaData?.step_transitions) {
        console.log('❌ Sem documento ou transições');
        return [];
    }

    const currentStep = document.what;

    // CORRECÇÃO: buscar doctype_pk pela string tt_type
    const documentTypeStr = document.tt_type;
    const documentTypePk = metaData.step_transitions.find(t => t.doctype === documentTypeStr)?.doctype_pk;

    // console.log('🔄 Filtros:', {
    //     currentStep,
    //     documentTypeStr,
    //     documentTypePk
    // });

    if (!documentTypePk) {
        console.log('❌ Tipo de documento não encontrado nas transições');
        return [];
    }

    const filtered = metaData.step_transitions.filter(transition => {
        const matchType = transition.doctype_pk === documentTypePk;
        const matchStep = transition.from_step_pk === currentStep;

        // console.log(`Transição ${transition.pk}:`, {
        //     doctype: transition.doctype,
        //     doctype_pk: transition.doctype_pk,
        //     from_step_pk: transition.from_step_pk,
        //     to_step_pk: transition.to_step_pk,
        //     matchType,
        //     matchStep,
        //     include: matchType && matchStep
        // });

        return matchType && matchStep;
    });

    // console.log('✅ Transições filtradas:', filtered);
    return filtered;
};

/**
 * Verifica se o documento pode ficar no mesmo passo
 * @param {Object} document - Documento actual
 * @param {Object} metaData - Metadados
 * @returns {boolean} Se pode manter o passo
 */
export const canStayInSameStep = (document, metaData) => {
    const validTransitions = getValidTransitions(document, metaData);
    return validTransitions.some(t => t.to_step_pk === document.what);
};

/**
 * Obtém utilizadores para transferência no mesmo passo
 * @param {Object} document - Documento actual
 * @param {Object} metaData - Metadados
 * @returns {Array} Utilizadores possíveis
 */
export const getUsersForTransfer = (document, metaData) => {
    if (!document?.who_pk) return [];

    // Todos os utilizadores excepto o actual
    return (metaData.who || []).filter(user => user.pk !== document.who_pk);
};

/**
 * Obtém próximos passos possíveis (incluindo actual para transferência)
 * @param {Object} document - Documento actual
 * @param {Object} metaData - Metadados
 * @returns {Array} Passos possíveis
 */
export const getAvailableSteps = (document, metaData) => {
    const validTransitions = getValidTransitions(document, metaData);

    // Se não há transições configuradas, mostrar todos os estados
    if (validTransitions.length === 0) {
        return metaData.what || [];
    }

    let stepIds = [...new Set(validTransitions.map(t => t.to_step_pk))];

    // Adicionar passo actual para transferência (excepto ENTRADA)
    const currentStepName = metaData.what?.find(s => s.pk === document.what)?.step;
    const isEntrada = currentStepName?.toUpperCase().includes('ENTRADA');

    if (!stepIds.includes(document.what) && !isEntrada) {
        stepIds.push(document.what);
    }

    // Mapear para dados completos
    const steps = stepIds.map(stepId => {
        const step = metaData.what?.find(s => s.pk === stepId);
        if (step && stepId === document.what && !isEntrada) {
            return { ...step, step: `${step.step} (Transferir)` };
        }
        return step;
    }).filter(Boolean);

    return steps;
};

/**
 * Obtém utilizadores possíveis para um passo específico
 * @param {number} stepId - ID do passo
 * @param {Object} document - Documento actual
 * @param {Object} metaData - Metadados
 * @returns {Array} Utilizadores possíveis
 */
export const getAvailableUsersForStep = (stepId, document, metaData) => {
    const validTransitions = getValidTransitions(document, metaData);

    // Se não há workflow, mostrar todos os utilizadores
    if (validTransitions.length === 0) {
        return metaData.who || [];
    }

    // Se é o passo actual, permitir transferência para TODOS excepto o actual
    if (stepId === document.what) {
        return (metaData.who || []).filter(user => user.pk !== document.who_pk);
    }

    const stepTransitions = validTransitions.filter(t => t.to_step_pk === stepId);

    const userIds = [...new Set(
        stepTransitions.flatMap(t => Array.isArray(t.client) ? t.client : [t.client])
    )].filter(Boolean);

    // console.log('👥 Debug utilizadores:', { stepId, userIds, stepTransitions });

    return userIds.map(userId =>
        metaData.who?.find(user => user.pk === userId)
    ).filter(Boolean);
};

/**
 * Verifica se uma transição é válida
 * @param {number} fromStep - Passo actual
 * @param {number} toStep - Passo destino
 * @param {number} userId - ID do utilizador
 * @param {Object} document - Documento
 * @param {Object} metaData - Metadados
 * @returns {boolean} Se a transição é válida
 */
export const isValidTransition = (fromStep, toStep, userId, document, metaData) => {
    const validTransitions = getValidTransitions(document, metaData);

    return validTransitions.some(t =>
        t.from_step_pk === fromStep &&
        t.to_step_pk === toStep &&
        t.client === userId
    );
};

/**
 * Obtém workflow completo para um tipo de documento
 * @param {string|number} documentType - Tipo de documento
 * @param {Object} metaData - Metadados
 * @returns {Array} Fluxo completo de trabalho
 */
export const getWorkflowForDocumentType = (documentType, metaData) => {
    if (!metaData?.step_transitions) return [];

    return metaData.step_transitions.filter(t =>
        t.doctype_pk === documentType
    ).sort((a, b) => {
        // Ordenar por from_step, depois por to_step
        if (a.from_step_pk !== b.from_step_pk) {
            return a.from_step_pk - b.from_step_pk;
        }
        return a.to_step_pk - b.to_step_pk;
    });
};

/**
 * Timeline optimizada - evita duplicações e gere reabertura
 */
export const getWorkflowTimeline = (document, metaData, steps) => {
    // console.log('🔍 Timeline - Input:', { document_what: document.what, steps_count: steps.length });

    // 1. Encontrar passo ENTRADA automaticamente
    const entradaStep = metaData.what?.find(s =>
        s.step?.toUpperCase().includes('ENTRADA')
    );

    const uniqueSteps = new Map();

    // 2. Adicionar ENTRADA sempre como primeiro passo
    if (entradaStep) {
        uniqueSteps.set(entradaStep.pk, {
            stepId: entradaStep.pk,
            stepName: entradaStep.step,
            status: 'completed',
            when: document.created_at || document.when_start,
            isEntrada: true
        });
    }

    // 3. Obter todos os passos únicos executados (cronológico)
    steps
        .sort((a, b) => new Date(a.when_start || 0) - new Date(b.when_start || 0))
        .forEach(step => {
            const stepData = metaData.what?.find(s => s.pk === step.what);
            if (stepData && !stepData.step?.toUpperCase().includes('ENTRADA')) {
                uniqueSteps.set(step.what, {
                    stepId: step.what,
                    stepName: stepData.step,
                    status: 'completed',
                    when: step.when_start,
                    who: step.who
                });
            }
        });

    // 4. Passo actual (remover se já existir no histórico)
    const currentStepData = metaData.what?.find(s => s.pk === document.what);
    const isCurrentEntrada = currentStepData?.step?.toUpperCase().includes('ENTRADA');

    if (currentStepData && !isCurrentEntrada) {
        uniqueSteps.set(document.what, {
            stepId: document.what,
            stepName: currentStepData.step,
            status: 'current'
        });
    } else if (isCurrentEntrada && entradaStep) {
        // Se estamos em ENTRADA, actualizar o status
        uniqueSteps.set(entradaStep.pk, {
            ...uniqueSteps.get(entradaStep.pk),
            status: 'current'
        });
    }

    // 3. Próximos passos possíveis (só se não existirem)
    const validTransitions = getValidTransitions(document, metaData);
    const nextSteps = validTransitions
        .filter(t => !uniqueSteps.has(t.to_step_pk))
        .map(t => {
            const stepData = metaData.what?.find(s => s.pk === t.to_step_pk);
            return stepData ? {
                stepId: t.to_step_pk,
                stepName: stepData.step,
                status: 'pending'
            } : null;
        })
        .filter(Boolean);

    // 4. Timeline final - array ordenado
    const timelineSteps = [...uniqueSteps.values(), ...nextSteps];

    // console.log('✅ Timeline final:', timelineSteps);

    return {
        steps: timelineSteps,
        completed: timelineSteps.filter(s => s.status === 'completed').length,
        total: timelineSteps.length
    };
};

/**
 * Obtém progresso do workflow
 * @param {Object} document - Documento actual
 * @param {Object} metaData - Metadados
 * @param {Array} steps - Histórico de passos
 * @returns {Object} Informações de progresso
 */
export const getWorkflowProgress = (document, metaData, steps) => {
    const timeline = getWorkflowTimeline(document, metaData, steps);

    const isCompleted = timeline.current.stepData?.step?.toUpperCase().includes('CONCLUÍDO') ||
        timeline.current.stepData?.step?.toUpperCase().includes('CONCLUIDO');

    return {
        ...timeline.progress,
        isCompleted,
        currentStepName: timeline.current.stepData?.step || 'Desconhecido',
        nextSteps: timeline.pending.map(p => p.stepData?.step).filter(Boolean)
    };
};