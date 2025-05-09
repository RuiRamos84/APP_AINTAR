import api from "./api";

/**
 * Busca dados de operações com suporte a paginação
 * @param {number} page - Número da página a buscar
 * @param {number} pageSize - Tamanho da página
 * @returns {Promise<Object>} - Dados de operações
 */
export const fetchOperationsData = async (page = 1, pageSize = 20) => {
  try {
    const response = await api.get("/operations", {
      params: {
        page,
        page_size: pageSize
      }
    });

    console.log(`Dados de operações (página ${page}):`, response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar dados de operações:", error);
    throw error;
  }
};

/**
 * Marca uma operação como concluída
 * @param {number} documentId - ID do documento
 * @param {Object} stepData - Dados do passo para conclusão
 * @returns {Promise<Object>} - Resultado da operação
 */
export const completeOperation = async (documentId, stepData) => {
  try {
    const response = await api.post(`/add_document_step/${documentId}`, stepData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erro ao concluir operação:", error);
    throw error;
  }
};

/**
 * Busca detalhes de uma operação específica
 * @param {number} documentId - ID do documento
 * @returns {Promise<Object>} - Detalhes da operação
 */
export const fetchOperationDetails = async (documentId) => {
  try {
    const response = await api.get(`/operations/${documentId}`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar detalhes da operação:", error);
    throw error;
  }
};

/**
 * Busca todas as operações de um tipo específico
 * @param {string} viewKey - Chave da vista (ex: vbr_document_fossa)
 * @returns {Promise<Array>} - Lista de operações do tipo
 */
export const fetchOperationsByType = async (viewKey) => {
  try {
    const response = await api.get(`/operations/type/${viewKey}`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao buscar operações do tipo ${viewKey}:`, error);
    throw error;
  }
};

/**
 * Obtém operações com filtragem
 * @param {Object} filters - Critérios de filtragem
 * @returns {Promise<Object>} - Operações filtradas
 */
export const fetchFilteredOperations = async (filters) => {
  try {
    const response = await api.post("/operations/filter", filters);
    return response.data;
  } catch (error) {
    console.error("Erro ao filtrar operações:", error);
    throw error;
  }
};