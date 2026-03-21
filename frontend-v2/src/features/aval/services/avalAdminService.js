import api from '@/services/api/client';

const BASE = '/aval/admin';

const avalAdminService = {
  getPeriods: () => api.get(`${BASE}/periods`),
  createPeriod: (data) => api.post(`${BASE}/periods`, data),
  togglePeriod: (periodPk) => api.post(`${BASE}/periods/${periodPk}/toggle`),
  getAssignments: (periodPk) => api.get(`${BASE}/${periodPk}/assignments`),
  getUsers: () => api.get(`${BASE}/users`),
  generateAssignments: (periodPk, userIds) =>
    api.post(`${BASE}/${periodPk}/generate`, { user_ids: userIds }),
  getResults: (periodPk) => api.get(`${BASE}/${periodPk}/results`),
};

export default avalAdminService;
