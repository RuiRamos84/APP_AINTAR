import api from '../../../services/api/client';

export const orcamentoService = {
    async getDetalhe(ano = null) {
        const params = ano ? { ano } : {};
        return api.get('/orcamento', { params });
    },

    async getAnos() {
        return api.get('/orcamento/anos');
    },

    async getClasses() {
        return api.get('/orcamento/classes');
    },

    async getSubclasses() {
        return api.get('/orcamento/subclasses');
    },

    async getTipos() {
        return api.get('/orcamento/tipos');
    },

    async getSummary(ano = null) {
        const params = ano ? { ano } : {};
        return api.get('/orcamento/summary', { params });
    },

    async getSncap(pk) {
        return api.get(`/orcamento/sncap/${encodeURIComponent(pk)}`);
    },

    async getSncapSummary(ano = null) {
        const params = ano ? { ano } : {};
        return api.get('/orcamento/sncap-summary', { params });
    },

    async create(data) {
        return api.post('/orcamento', data);
    },

    async update(pk, data) {
        return api.put(`/orcamento/${pk}`, data);
    },

    async remove(pk) {
        return api.delete(`/orcamento/${pk}`);
    },

    async createClasse(data) {
        return api.post('/orcamento/classe', data);
    },

    async updateClasse(pk, data) {
        return api.put(`/orcamento/classe/${pk}`, data);
    },

    async createSubclasse(data) {
        return api.post('/orcamento/subclasse', data);
    },

    async updateSubclasse(pk, data) {
        return api.put(`/orcamento/subclasse/${pk}`, data);
    },
};
