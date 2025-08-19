// utils/workflowValidationUtils.js

/**
 * ✅ MIGRADO: Validações avançadas de workflow do modelo antigo
 * Funções para validação completa de transições e permissões
 */

/**
 * Valida se uma transição é permitida baseada em regras de negócio
 * @param {Object} document - Documento atual
 * @param {number} fromStep - Passo atual
 * @param {number} toStep - Passo de destino  
 * @param {number} userId - ID do utilizador
 * @param {Object} metaData - Metadados do sistema
 * @returns {Object} Resultado da validação
 */
export const validateWorkflowTransition = (document, fromStep, toStep, userId, metaData) => {
    const validation = {
        isValid: false,
        canProceed: false,
        warnings: [],
        errors: [],
        requiredActions: []
    };

    // ✅ VALIDAÇÃO 1: Verificar se há workflow configurado
    if (!metaData?.step_transitions || metaData.step_transitions.length === 0) {
        validation.warnings.push("Sem workflow configurado - todas as transições são permitidas");
        validation.isValid = true;
        validation.canProceed = true;
        return validation;
    }

    // ✅ VALIDAÇÃO 2: Encontrar transições válidas
    const validTransitions = metaData.step_transitions.filter(transition => {
        const matchType = transition.doctype === document.tt_type;
        const matchFromStep = transition.from_step_pk === fromStep;
        const matchToStep = transition.to_step_pk === toStep;

        return matchType && matchFromStep && matchToStep;
    });

    if (validTransitions.length === 0) {
        validation.errors.push(`Transição de "${getStepName(fromStep, metaData)}" para "${getStepName(toStep, metaData)}" não é permitida para este tipo de documento`);
        return validation;
    }

    // ✅ VALIDAÇÃO 3: Verificar permissões de utilizador
    const userCanPerformTransition = validTransitions.some(transition => {
        if (Array.isArray(transition.client)) {
            return transition.client.includes(userId);
        }
        return transition.client === userId;
    });

    if (!userCanPerformTransition) {
        validation.errors.push("Utilizador não tem permissão para efetuar esta transição");
        return validation;
    }

    // ✅ VALIDAÇÃO 4: Verificar regras especiais por tipo de passo
    const stepValidation = validateSpecialStepRules(document, fromStep, toStep, metaData);
    if (!stepValidation.isValid) {
        validation.errors.push(...stepValidation.errors);
        validation.warnings.push(...stepValidation.warnings);
        if (stepValidation.errors.length > 0) {
            return validation;
        }
    }

    // ✅ VALIDAÇÃO 5: Verificar dependências de parâmetros
    const paramValidation = validateParameterDependencies(document, toStep, metaData);
    if (!paramValidation.isValid) {
        validation.warnings.push(...paramValidation.warnings);
        validation.requiredActions.push(...paramValidation.requiredActions);
    }

    // ✅ VALIDAÇÃO 6: Verificar se é transferência no mesmo passo
    if (fromStep === toStep) {
        const transferValidation = validateSameStepTransfer(document, userId, metaData);
        if (!transferValidation.isValid) {
            validation.errors.push(...transferValidation.errors);
            return validation;
        }
        validation.warnings.push("Transferência no mesmo passo - documento permanece no estado atual");
    }

    // Transição válida
    validation.isValid = true;
    validation.canProceed = validation.errors.length === 0;

    return validation;
};

/**
 * Valida regras especiais por tipo de passo
 */
const validateSpecialStepRules = (document, fromStep, toStep, metaData) => {
    const validation = {
        isValid: true,
        errors: [],
        warnings: []
    };

    const fromStepName = getStepName(fromStep, metaData)?.toUpperCase() || '';
    const toStepName = getStepName(toStep, metaData)?.toUpperCase() || '';

    // ✅ REGRA: Não pode voltar para ENTRADA
    if (toStepName.includes('ENTRADA') && fromStep !== 1) {
        validation.errors.push("Não é possível voltar ao passo de ENTRADA");
        validation.isValid = false;
    }

    // ✅ REGRA: CONCLUÍDO/ANULADO são finais
    if (fromStepName.includes('CONCLUÍDO') || fromStepName.includes('ANULADO')) {
        validation.errors.push("Documento já está num estado final");
        validation.isValid = false;
    }

    // ✅ REGRA: Para COBRANÇA precisa de valor
    if (toStepName.includes('COBRANÇA')) {
        // Verificar se tem parâmetros de valor/preço
        const hasValue = document.parameters?.some(param =>
            param.name?.toLowerCase().includes('valor') ||
            param.name?.toLowerCase().includes('preço') ||
            param.name?.toLowerCase().includes('custo')
        );

        if (!hasValue) {
            validation.warnings.push("Recomendado definir valor antes de enviar para cobrança");
        }
    }

    // ✅ REGRA: Para PAGAMENTO precisa de valor de cobrança
    if (toStepName.includes('PAGAMENTO')) {
        validation.warnings.push("Verificar se valor de cobrança está definido");
    }

    return validation;
};

/**
 * Valida dependências de parâmetros para um passo
 */
const validateParameterDependencies = (document, toStep, metaData) => {
    const validation = {
        isValid: true,
        warnings: [],
        requiredActions: []
    };

    const toStepName = getStepName(toStep, metaData)?.toUpperCase() || '';

    // ✅ DEPENDÊNCIA: Orçamentação precisa de medições
    if (toStepName.includes('ORÇAMENTAÇÃO')) {
        const hasMeasurements = document.parameters?.some(param =>
            param.name?.toLowerCase().includes('comprimento') ||
            param.name?.toLowerCase().includes('largura') ||
            param.name?.toLowerCase().includes('área') ||
            param.name?.toLowerCase().includes('metro')
        );

        if (!hasMeasurements) {
            validation.warnings.push("Recomendado definir medições antes de orçamentar");
            validation.requiredActions.push("Adicionar parâmetros de medição");
        }
    }

    // ✅ DEPENDÊNCIA: Execução precisa de aprovação de orçamento
    if (toStepName.includes('EXECUÇÃO')) {
        validation.warnings.push("Verificar se orçamento foi aprovado");
    }

    // ✅ DEPENDÊNCIA: Avaliação no terreno precisa de localização
    if (toStepName.includes('AVALIAÇÃO') && toStepName.includes('TERRENO')) {
        const hasLocation = document.address?.coords ||
            (document.address?.street && document.address?.nut4);

        if (!hasLocation) {
            validation.warnings.push("Localização pode ser necessária para avaliação no terreno");
            validation.requiredActions.push("Verificar dados de localização");
        }
    }

    return validation;
};

/**
 * Valida transferência no mesmo passo
 */
const validateSameStepTransfer = (document, userId, metaData) => {
    const validation = {
        isValid: true,
        errors: []
    };

    // ✅ VALIDAÇÃO: Não pode transferir para si próprio
    if (document.who_pk === userId) {
        validation.errors.push("Não pode transferir documento para si próprio");
        validation.isValid = false;
    }

    // ✅ VALIDAÇÃO: Verificar se utilizador de destino existe e está ativo
    const targetUser = metaData?.who?.find(user => user.pk === userId);
    if (!targetUser) {
        validation.errors.push("Utilizador de destino não encontrado");
        validation.isValid = false;
    } else if (targetUser.active === 0) {
        validation.errors.push("Utilizador de destino não está ativo");
        validation.isValid = false;
    }

    return validation;
};

/**
 * Obtém o nome de um passo pelos metadados
 */

const getStepName = (step, metaData) => {
    const stepInfo = metaData?.steps?.find(s => s.id === step);
    return stepInfo?.name;
};


