import { apiClient } from '@/services/api/client';

export const operationService = {
  /**
   * Fetch operations data with pagination
   * @param {number} page 
   * @param {number} pageSize 
   * @returns {Promise<Object>}
   */
  fetchOperationsData: async (page = 1, pageSize = 20) => {
    const response = await apiClient.get('/operations', {
      params: {
        page,
        page_size: pageSize
      }
    });
    return response;
  },

  /**
   * Fetch operation details
   * @param {number} documentId 
   * @returns {Promise<Object>}
   */
  fetchOperationDetails: async (documentId) => {
    const response = await apiClient.get(`/operations/${documentId}`);
    return response;
  },

  /**
   * Complete an operation step
   * @param {number} documentId 
   * @param {Object} stepData 
   * @returns {Promise<Object>}
   */
  completeOperation: async (documentId, stepData) => {
    const response = await apiClient.post(`/add_document_step/${documentId}`, stepData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  /**
   * Fetch operations by type
   * @param {string} viewKey 
   * @returns {Promise<Array>}
   */
  fetchOperationsByType: async (viewKey) => {
    const response = await apiClient.get(`/operations/type/${viewKey}`);
    return response;
  },

  /**
   * Fetch filtered operations
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  fetchFilteredOperations: async (filters) => {
    const response = await apiClient.post('/operations/filter', filters);
    return response;
  },

  /**
   * Query operation control tasks
   * @param {Object} payload 
   * @returns {Promise<Object>}
   */
  queryControl: async (payload) => {
    const response = await apiClient.post('/operation_control/query', payload);
    return response;
  },

  /**
   * Update operation control
   * @param {FormData} formData 
   * @returns {Promise<Object>}
   */
  updateControl: async (formData) => {
    const response = await apiClient.post('/operation_control/update', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response;
  },

  /**
   * Download operation control file
   * @param {number} pk 
   * @param {string} filename 
   * @returns {Promise<Blob>}
   */
  downloadControlFile: async (pk, filename) => {
    const response = await apiClient.get(
      `/operation_control/download/${pk}?filename=${encodeURIComponent(filename)}`,
      { responseType: 'blob' }
    );
    return response;
  }
};
