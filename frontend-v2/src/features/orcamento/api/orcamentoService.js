import api from '../../../services/api/client';

export const orcamentoService = {
    async getDetalhe(ano = null) {
        const params = ano ? { ano } : {};
        const response = await api.get('/orcamento', { params });
        return response;
    },

    async getSummary(ano = null) {
        const params = ano ? { ano } : {};
        const response = await api.get('/orcamento/summary', { params });
        return response;
    },

    async getAnos() {
        const response = await api.get('/orcamento/anos');
        return response;
    },

    async getSubclasses() {
        const response = await api.get('/orcamento/subclasses');
        return response;
    },

    async create(data) {
        const response = await api.post('/orcamento', data);
        return response;
    },

    async update(pk, data) {
        const response = await api.put(`/orcamento/${pk}`, data);
        return response;
    },

    async remove(pk) {
        const response = await api.delete(`/orcamento/${pk}`);
        return response;
    },

    async getTipos() {
        const response = await api.get('/orcamento/tipos');
        return response;
    },

    async getClasses() {
        const response = await api.get('/orcamento/classes');
        return response;
    },

    async createClasse(data) {
        const response = await api.post('/orcamento/classe', data);
        return response;
    },

    async createSubclasse(data) {
        const response = await api.post('/orcamento/subclasse', data);
        return response;
    },

    async updateClasse(pk, data) {
        const response = await api.put(`/orcamento/classe/${pk}`, data);
        return response;
    },

    async updateSubclasse(pk, data) {
        const response = await api.put(`/orcamento/subclasse/${pk}`, data);
        return response;
    },
};
