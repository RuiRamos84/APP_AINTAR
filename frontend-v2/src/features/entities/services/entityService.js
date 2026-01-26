import { apiClient } from '@/services/api/client';

export const entityService = {
  /**
   * Get all entities
   * @returns {Promise<Array>}
   */
  getEntities: async () => {
    const response = await apiClient.get('/entities');
    return response;
  },

  /**
   * Get entity by NIF
   * @param {string} nipc 
   * @returns {Promise<Object|null>}
   */
  getEntityByNIF: async (nipc) => {
    const response = await apiClient.get(`/entity/nipc/${nipc}`);
    return response || null;
  },

  /**
   * Get entity by ID
   * @param {number} id 
   * @returns {Promise<Object>}
   */
  getEntity: async (id) => {
    const response = await apiClient.get(`/entity/${id}`);
    return response;
  },

  /**
   * Update entity
   * @param {number} pk 
   * @param {Object} entityData 
   * @returns {Promise<Object>}
   */
  updateEntity: async (pk, entityData) => {
    try {
      const response = await apiClient.put(`/entity/${pk}`, entityData);
      return { success: true, data: response };
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Erro ao atualizar entidade');
    }
  },

  /**
   * Add new entity
   * @param {Object} entityData 
   * @returns {Promise<Object>}
   */
  addEntity: async (entityData) => {
    try {
      const response = await apiClient.post('/entity', entityData);
      return { success: true, data: response };
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Erro ao criar entidade');
    }
  }
};
