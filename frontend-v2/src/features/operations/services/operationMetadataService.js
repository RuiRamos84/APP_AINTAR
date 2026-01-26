import { apiClient } from '@/services/api/client';

export const operationMetadataService = {
  /**
   * Query operation metadata
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  queryMetadata: async (filters) => {
    try {
      const response = await apiClient.post('/operation_metadata/query', filters);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar metadata');
    }
  },

  /**
   * Create operation metadata
   * @param {Object} data 
   * @returns {Promise<Object>}
   */
  createMetadata: async (data) => {
    try {
      const response = await apiClient.post('/operation_metadata/create', data);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao criar metadata');
    }
  },

  /**
   * Update operation metadata
   * @param {Object} data 
   * @returns {Promise<Object>}
   */
  updateMetadata: async (data) => {
    try {
      const response = await apiClient.post('/operation_metadata/update', data);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao atualizar metadata');
    }
  },

  /**
   * Delete operation metadata
   * @param {number} pk 
   * @returns {Promise<Object>}
   */
  deleteMetadata: async (pk) => {
    try {
      const response = await apiClient.delete(`/operation_metadata/delete/${pk}`);
      return response;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erro ao eliminar metadata');
    }
  }
};
