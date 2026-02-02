/**
 * Workflow Utilities - Validação de transições e gestão de workflow
 * Baseado nos metadados step_transitions do backend
 */

/**
 * Obtém transições válidas para um documento
 * @param {Object} document - Documento actual
 * @param {Object} metaData - Metadados (inclui step_transitions, what, who)
 * @returns {Array} Transições válidas
 */
export const getValidTransitions = (document, metaData) => {
  if (!document || !metaData?.step_transitions) {
    return [];
  }

  const currentStep = document.what;
  const documentTypeStr = document.tt_type;

  // Buscar doctype_pk pela string tt_type
  const documentTypePk = metaData.step_transitions.find(
    (t) => t.doctype === documentTypeStr
  )?.doctype_pk;

  if (!documentTypePk) {
    return [];
  }

  return metaData.step_transitions.filter(
    (transition) =>
      transition.doctype_pk === documentTypePk &&
      transition.from_step_pk === currentStep
  );
};

/**
 * Verifica se o documento pode ficar no mesmo passo (transferência)
 * @param {Object} document
 * @param {Object} metaData
 * @returns {boolean}
 */
export const canStayInSameStep = (document, metaData) => {
  const validTransitions = getValidTransitions(document, metaData);
  return validTransitions.some((t) => t.to_step_pk === document.what);
};

/**
 * Obtém utilizadores para transferência no mesmo passo
 * @param {Object} document
 * @param {Object} metaData
 * @returns {Array} Utilizadores possíveis (excepto o actual)
 */
export const getUsersForTransfer = (document, metaData) => {
  if (!document?.who_pk) return [];
  return (metaData.who || []).filter((user) => user.pk !== document.who_pk);
};

/**
 * Obtém próximos passos possíveis (incluindo actual para transferência)
 * @param {Object} document
 * @param {Object} metaData
 * @returns {Array} Passos possíveis com dados completos
 */
export const getAvailableSteps = (document, metaData) => {
  const validTransitions = getValidTransitions(document, metaData);

  // Se não há transições configuradas, mostrar todos os estados
  if (validTransitions.length === 0) {
    return metaData.what || [];
  }

  let stepIds = [...new Set(validTransitions.map((t) => t.to_step_pk))];

  // Adicionar passo actual para transferência (excepto ENTRADA)
  const currentStepName = metaData.what?.find((s) => s.pk === document.what)?.step;
  const isEntrada = currentStepName?.toUpperCase().includes('ENTRADA');

  if (!stepIds.includes(document.what) && !isEntrada) {
    stepIds.push(document.what);
  }

  // Mapear para dados completos
  return stepIds
    .map((stepId) => {
      const step = metaData.what?.find((s) => s.pk === stepId);
      if (step && stepId === document.what && !isEntrada) {
        return { ...step, step: `${step.step} (Transferir)` };
      }
      return step;
    })
    .filter(Boolean);
};

/**
 * Obtém utilizadores possíveis para um passo específico
 * @param {number} stepId - ID do passo destino
 * @param {Object} document
 * @param {Object} metaData
 * @returns {Array} Utilizadores possíveis
 */
export const getAvailableUsersForStep = (stepId, document, metaData) => {
  const validTransitions = getValidTransitions(document, metaData);

  // Se não há workflow, mostrar todos os utilizadores
  if (validTransitions.length === 0) {
    return metaData.who || [];
  }

  // Se é o passo actual, permitir transferência para todos excepto o actual
  if (stepId === document.what) {
    return (metaData.who || []).filter((user) => user.pk !== document.who_pk);
  }

  const stepTransitions = validTransitions.filter((t) => t.to_step_pk === stepId);

  // Extrair user IDs das transições (client pode ser array ou valor único)
  const userIds = [];
  stepTransitions.forEach((t) => {
    if (Array.isArray(t.client)) {
      t.client.forEach((c) => {
        if (c !== null && c !== undefined) {
          userIds.push(c);
        }
      });
    } else if (t.client !== null && t.client !== undefined) {
      userIds.push(t.client);
    }
  });

  const uniqueUserIds = [...new Set(userIds)];

  // Comparação robusta (aceita 0, '0' e conversões)
  return uniqueUserIds
    .map((userId) => {
      const userIdNum = Number(userId);
      return metaData.who?.find((user) => Number(user.pk) === userIdNum);
    })
    .filter(Boolean);
};

/**
 * Verifica se uma transição é válida
 * @param {number} fromStep
 * @param {number} toStep
 * @param {number} userId
 * @param {Object} document
 * @param {Object} metaData
 * @returns {boolean}
 */
export const isValidTransition = (fromStep, toStep, userId, document, metaData) => {
  const validTransitions = getValidTransitions(document, metaData);
  return validTransitions.some(
    (t) =>
      t.from_step_pk === fromStep &&
      t.to_step_pk === toStep &&
      t.client === userId
  );
};

/**
 * Obtém workflow completo para um tipo de documento
 * @param {string|number} documentType
 * @param {Object} metaData
 * @returns {Array} Fluxo completo ordenado
 */
export const getWorkflowForDocumentType = (documentType, metaData) => {
  if (!metaData?.step_transitions) return [];

  return metaData.step_transitions
    .filter((t) => t.doctype_pk === documentType)
    .sort((a, b) => {
      if (a.from_step_pk !== b.from_step_pk) {
        return a.from_step_pk - b.from_step_pk;
      }
      return a.to_step_pk - b.to_step_pk;
    });
};
