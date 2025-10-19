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
    //     documentTypePk,
    //     allTransitions: metaData.step_transitions.map(t => ({
    //         pk: t.pk,
    //         doctype: t.doctype,
    //         doctype_pk: t.doctype_pk,
    //         from: t.from_step_pk,
    //         to: t.to_step_pk,
    //         client: t.client
    //     }))
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
        //     client: transition.client,
        //     matchType,
        //     matchStep,
        //     include: matchType && matchStep
        // });

        return matchType && matchStep;
    });

    // console.log('✅ Transições filtradas:', filtered.length, 'de', metaData.step_transitions.length);
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

    // console.log('🔍 getAvailableUsersForStep - Início:', {
    //     stepId,
    //     validTransitionsCount: validTransitions.length,
    //     currentStep: document?.what
    // });

    // Se não há workflow, mostrar todos os utilizadores
    if (validTransitions.length === 0) {
        // console.log('⚠️ Sem workflow configurado, retornando todos os utilizadores');
        return metaData.who || [];
    }

    // Se é o passo actual, permitir transferência para TODOS excepto o actual
    if (stepId === document.what) {
        // console.log('🔄 Transferência no mesmo passo');
        return (metaData.who || []).filter(user => user.pk !== document.who_pk);
    }

    const stepTransitions = validTransitions.filter(t => t.to_step_pk === stepId);

    // console.log('📋 Transições filtradas para step', stepId, ':', stepTransitions);

    // CORRIGIDO: Melhor extração do client (pode ser array ou valor único)
    const userIds = [];

    stepTransitions.forEach(t => {
        // console.log('🔍 Processando transição:', {
        //     pk: t.pk,
        //     from: t.from_step_pk,
        //     to: t.to_step_pk,
        //     client: t.client,
        //     client_type: typeof t.client,
        //     is_array: Array.isArray(t.client)
        // });

        if (Array.isArray(t.client)) {
            // Se é array, adicionar todos os valores
            t.client.forEach(c => {
                if (c !== null && c !== undefined) {
                    userIds.push(c);
                }
            });
        } else if (t.client !== null && t.client !== undefined) {
            // Se é valor único (incluindo 0), adicionar
            userIds.push(t.client);
        }
    });

    // Remover duplicados
    const uniqueUserIds = [...new Set(userIds)];

    // console.log('👥 UserIds extraídos:', {
    //     raw: userIds,
    //     unique: uniqueUserIds,
    //     metaData_who: metaData.who?.map(u => ({ pk: u.pk, name: u.name, type: typeof u.pk }))
    // });

    // CORRIGIDO: Comparação robusta que aceita 0, '0' e conversões
    const users = uniqueUserIds.map(userId => {
        // Converter ambos para número para comparação consistente
        const userIdNum = Number(userId);
        const found = metaData.who?.find(user => Number(user.pk) === userIdNum);

        // console.log(`🔎 Buscando userId ${userId} (${userIdNum}):`, found ? `✅ ${found.name}` : '❌ Não encontrado');

        return found;
    }).filter(user => user !== null && user !== undefined);

    // console.log('✅ Utilizadores finais:', users.map(u => ({ pk: u.pk, name: u.name })));

    return users;
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
 * Timeline corrigida - funciona com what como string ou number
 * @param {Object} document - Documento atual
 * @param {Object} metaData - Metadados
 * @param {Array} steps - Array de passos executados
 * @returns {Object} Timeline organizada sem duplicações
 */
export const getWorkflowTimeline = (document, metaData, steps) => {
    // console.log('🔍 Timeline - Input:', {
    //     document_what: document.what,
    //     steps_count: steps.length,
    //     current_step: document.what,
    //     steps_detail: steps.map(s => ({ what: s.what, when: s.when_start }))
    // });

    // 1. Função auxiliar para encontrar step data (suporta string e number)
    const findStepData = (whatValue) => {
        if (!whatValue) return null;

        // Tentar encontrar por pk (number)
        const byPk = metaData.what?.find(s => s.pk === whatValue);
        if (byPk) return byPk;

        // Tentar encontrar por nome (string)
        const byName = metaData.what?.find(s => s.step === whatValue);
        if (byName) return byName;

        // Tentar comparação case-insensitive
        const byNameInsensitive = metaData.what?.find(s =>
            s.step?.toUpperCase() === String(whatValue).toUpperCase()
        );

        return byNameInsensitive || null;
    };

    // 2. Processar todos os passos executados
    const executedSteps = steps
        .filter(step => step.what !== null && step.what !== undefined && step.what !== '')
        .sort((a, b) => {
            // Converter as datas portuguesas para Date objects
            const parsePortugueseDate = (dateStr) => {
                if (!dateStr) return new Date(0);
                try {
                    // Formato: "2025-07-01 às 15:05"
                    const cleanDate = dateStr.replace(' às ', ' ');
                    return new Date(cleanDate);
                } catch (e) {
                    return new Date(dateStr);
                }
            };

            return parsePortugueseDate(a.when_start) - parsePortugueseDate(b.when_start);
        });

    // console.log('📋 Passos executados ordenados:', executedSteps.map(s => {
    //     const stepData = findStepData(s.what);
    //     return {
    //         what: s.what,
    //         when: s.when_start,
    //         stepName: stepData?.step,
    //         stepPk: stepData?.pk
    //     };
    // }));

    // 3. Criar mapa de passos únicos executados
    const uniqueExecutedSteps = new Map();

    executedSteps.forEach(step => {
        const stepData = findStepData(step.what);

        if (stepData) {
            const stepKey = stepData.pk; // Usar pk como chave única

            // Se o passo já existe, manter o mais recente
            const parseDate = (dateStr) => {
                try {
                    const cleanDate = dateStr.replace(' às ', ' ');
                    return new Date(cleanDate);
                } catch (e) {
                    return new Date(dateStr);
                }
            };

            if (!uniqueExecutedSteps.has(stepKey) ||
                parseDate(step.when_start) > parseDate(uniqueExecutedSteps.get(stepKey)?.when || '1900-01-01')) {

                uniqueExecutedSteps.set(stepKey, {
                    stepId: stepData.pk,
                    stepName: stepData.step,
                    when: step.when_start,
                    who: step.who,
                    memo: step.memo,
                    originalStep: step,
                    originalWhat: step.what
                });
            }
        } else {
            // console.warn(`⚠️ Step não encontrado nos metadados:`, step.what);
        }
    });

    // console.log('🎯 Passos únicos identificados:', Array.from(uniqueExecutedSteps.values()).map(s => ({
    //     id: s.stepId,
    //     name: s.stepName,
    //     when: s.when
    // })));

    // 4. Verificar se ENTRADA foi executada explicitamente
    const entradaStep = metaData.what?.find(s =>
        s.step?.toUpperCase().includes('ENTRADA')
    );

    const hasEntradaInSteps = Array.from(uniqueExecutedSteps.keys()).includes(entradaStep?.pk);

    // 5. Construir timeline ordenada
    const timelineSteps = [];

    // Adicionar ENTRADA se não foi executada explicitamente
    if (entradaStep && !hasEntradaInSteps) {
        timelineSteps.push({
            stepId: entradaStep.pk,
            stepName: entradaStep.step,
            status: 'completed',
            when: document.created_at || document.when_start,
            isEntrada: true,
            order: 0
        });
    }

    // Adicionar todos os passos únicos executados
    Array.from(uniqueExecutedSteps.values()).forEach(stepDetails => {
        const isCurrentStep = stepDetails.stepId === document.what;

        const parseDate = (dateStr) => {
            try {
                const cleanDate = dateStr.replace(' às ', ' ');
                return new Date(cleanDate).getTime();
            } catch (e) {
                return new Date(dateStr).getTime();
            }
        };

        timelineSteps.push({
            ...stepDetails,
            status: isCurrentStep ? 'current' : 'completed',
            order: parseDate(stepDetails.when)
        });
    });

    // Se o passo atual não está nos executados, adicionar
    const currentStepData = findStepData(document.what);
    const currentStepExists = timelineSteps.some(step => step.stepId === document.what);

    if (currentStepData && !currentStepExists) {
        timelineSteps.push({
            stepId: currentStepData.pk,
            stepName: currentStepData.step,
            status: 'current',
            order: Date.now()
        });
    }

    // 6. Ordenar timeline por data/ordem
    timelineSteps.sort((a, b) => {
        // ENTRADA sempre primeiro
        if (a.isEntrada && !b.isEntrada) return -1;
        if (!a.isEntrada && b.isEntrada) return 1;

        // Depois por ordem temporal
        return (a.order || 0) - (b.order || 0);
    });

    // 7. Obter próximos passos possíveis com agrupamento
    const validTransitions = getValidTransitions(document, metaData);
    const existingStepIds = new Set(timelineSteps.map(s => s.stepId));

    const possibleNextStepIds = validTransitions
        .map(t => t.to_step_pk)
        .filter(stepId => !existingStepIds.has(stepId));

    // Agrupar próximos passos se há múltiplas opções
    const possibleNextSteps = [];

    if (possibleNextStepIds.length > 1) {
        // Múltiplas opções - criar um passo "ramificado"
        const nextStepsData = possibleNextStepIds
            .map(stepId => metaData.what?.find(s => s.pk === stepId))
            .filter(Boolean);

        possibleNextSteps.push({
            stepId: 'multiple-options',
            stepName: 'Próximos Passos',
            status: 'pending',
            order: 999999,
            isMultipleOptions: true,
            options: nextStepsData.map(step => ({
                stepId: step.pk,
                stepName: step.step
            }))
        });
    } else if (possibleNextStepIds.length === 1) {
        // Uma única opção
        const stepData = metaData.what?.find(s => s.pk === possibleNextStepIds[0]);
        if (stepData) {
            possibleNextSteps.push({
                stepId: stepData.pk,
                stepName: stepData.step,
                status: 'pending',
                order: 999999
            });
        }
    }

    // 8. Timeline final
    const finalTimeline = [...timelineSteps, ...possibleNextSteps];

    const completedCount = finalTimeline.filter(s => s.status === 'completed').length;
    const currentStep = finalTimeline.find(s => s.status === 'current');

    const result = {
        steps: finalTimeline,
        completed: completedCount,
        total: finalTimeline.length,
        current: currentStep,
        pending: possibleNextSteps
    };

    // console.log('✅ Timeline final corrigida:', {
    //     total_steps: result.steps.length,
    //     completed: result.completed,
    //     current_step: result.current?.stepName,
    //     pending_count: result.pending.length,
    //     all_steps: result.steps.map(s => ({
    //         id: s.stepId,
    //         name: s.stepName,
    //         status: s.status,
    //         when: s.when
    //     }))
    // });

    return result;
};

/**
 * Função para debug que mostra todos os passos encontrados nos metadados
 */
export const debugMetaDataSteps = (metaData) => {
    // console.log('🔍 Debug - Metadados what:', metaData.what?.map(s => ({
    //     pk: s.pk,
    //     step: s.step
    // })));
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