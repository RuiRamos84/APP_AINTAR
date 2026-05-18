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

    async getSncap(pk) {
        return api.get(`/orcamento/sncap/${encodeURIComponent(pk)}`);
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

};
