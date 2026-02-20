import { apiClient } from '@/services/api/client';

export const operationService = {
  // ============================================================
  // ENDPOINTS LEGACY (/operations) - mantidos para compatibilidade
  // ============================================================

  fetchOperationsData: async (page = 1, pageSize = 20) => {
    const response = await apiClient.get('/operations', {
      params: { page, page_size: pageSize }
    });
    return response;
  },

  fetchOperationDetails: async (documentId) => {
    const response = await apiClient.get(`/operations/${documentId}`);
    return response;
  },

  completeOperation: async (documentId, stepData) => {
    const response = await apiClient.post(`/add_document_step/${documentId}`, stepData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response;
  },

  fetchOperationsByType: async (viewKey) => {
    const response = await apiClient.get(`/operations/type/${viewKey}`);
    return response;
  },

  fetchFilteredOperations: async (filters) => {
    const response = await apiClient.post('/operations/filter', filters);
    return response;
  },

  // ============================================================
  // ENDPOINTS OPERAÇÃO (/operacao*) - Sistema de tarefas operacionais
  // ============================================================

  /** Tarefas do operador autenticado */
  getOperacaoSelf: async () => {
    const response = await apiClient.get('/operacao_self');
    return response;
  },

  /** Todas as operações (supervisor) */
  getOperacao: async () => {
    const response = await apiClient.get('/operacao');
    return response;
  },

  /** Completar tarefa operacional (com suporte para foto via FormData) */
  completeTask: async (taskId, completionData) => {
    if (completionData.photo) {
      const formData = new FormData();
      formData.append('valuetext', completionData.valuetext || '');
      if (completionData.valuememo) {
        formData.append('valuememo', completionData.valuememo);
      }
      formData.append('photo', completionData.photo);
      return apiClient.post(`/operacao_complete/${taskId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return apiClient.post(`/operacao_complete/${taskId}`, completionData);
  },

  /** Parâmetros de análise para tipo 5 */
  getAnalysisParameters: async (operationId) => {
    const response = await apiClient.get(`/operacao_analysis/${operationId}`);
    return response?.data || response || [];
  },

  /** Opções de referência para tipo 3 */
  getReferenceOptions: async (refObj) => {
    const response = await apiClient.get(`/operacao_reference/${refObj}`);
    return response?.data?.data || response?.data || [];
  },

  /** URL de foto de operação */
  getOperationPhotoUrl: (photoPath) => {
    const normalizedPath = photoPath.replace(/\\/g, '/');
    return `/operacao_photo/${normalizedPath}`;
  },

  /** Download de foto de operação */
  downloadOperationPhoto: async (photoPath) => {
    const normalizedPath = photoPath.replace(/\\/g, '/');
    return apiClient.get(`/operacao_photo/${normalizedPath}`, {
      responseType: 'blob'
    });
  },

  // ============================================================
  // GESTÃO DE METAS (operacao_meta) - Supervisor
  // ============================================================

  getOperacaoMeta: async ({ limit, offset, search } = {}) => {
    const params = {};
    if (limit) params.limit = limit;
    if (offset != null) params.offset = offset;
    if (search) params.search = search;
    const response = await apiClient.get('/operacao_meta', { params });
    return response;
  },

  createOperacaoMeta: async (data) => {
    const response = await apiClient.post('/operacao_meta', data);
    return response;
  },

  updateOperacaoMeta: async (id, data) => {
    const response = await apiClient.put(`/operacao_meta/${id}`, data);
    return response;
  },

  deleteOperacaoMeta: async (id) => {
    const response = await apiClient.delete(`/operacao_meta/${id}`);
    return response;
  },

  // ============================================================
  // SUPERVISOR - Analytics e Dashboards
  // ============================================================

  getSupervisorAnalytics: async () => {
    const response = await apiClient.get('/operacao_supervisor_analytics');
    return response;
  },

  getTeamActivity: async () => {
    const response = await apiClient.get('/operacao_team_activity');
    return response;
  },

  getOperatorStats: async () => {
    const response = await apiClient.get('/operacao_operator_stats');
    return response;
  },

  // ============================================================
  // CONTROLO OPERACIONAL (operation_control)
  // ============================================================

  queryControl: async (payload) => {
    const response = await apiClient.post('/operation_control/query', payload);
    return response;
  },

  updateControl: async (formData) => {
    const response = await apiClient.post('/operation_control/update', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response;
  },

  downloadControlFile: async (pk, filename) => {
    const response = await apiClient.get(
      `/operation_control/download/${pk}?filename=${encodeURIComponent(filename)}`,
      { responseType: 'blob' }
    );
    return response;
  }
};
