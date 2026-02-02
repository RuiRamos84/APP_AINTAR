import api from '../../../services/api/client';


export const entitiesService = {
    /**
     * Get entity by NIPC
     * @param {string} nipc 
     */
    async getEntityByNipc(nipc) {
        // Endpoint matches legacy: /entity/nipc/:nipc
        const response = await api.get(`/entity/nipc/${nipc}`);
        // Legacy returns { entity: ... }. We should normalize or return as is.
        // Let's return the whole data to match legacy expectation of response.entity
        return response;
    },

    /**
     * Create new entity
     * @param {Object} entityData 
     */
    async createEntity(entityData) {
        const response = await api.post('/entity', entityData);
        // Legacy returns { data: response.data } on success.
        return response;
    },

    /**
     * Update existing entity
     * @param {number|string} pk 
     * @param {Object} entityData 
     */
    async updateEntity(pk, entityData) {
        const response = await api.put(`/entity/${pk}`, entityData);
        return response;
    },

    /**
     * Search entities (Optional, for autocomplete if needed later)
     * @param {string} query 
     */
    async searchEntities(query) {
        const response = await api.get('/entities', { params: { search: query } });
        return response;
    },

    /**
     * Get all entities
     */
    async getEntities() {
        const response = await api.get('/entities');
        return response;
    }
};
