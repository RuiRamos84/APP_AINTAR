import api from '@/services/api/client';

const BASE = '/aval';

const avalService = {
  getAnalyticsEnriched: () => api.get(`${BASE}/analytics/enriched`),
  getAnalytics: () => api.get(`${BASE}/analytics`),
  getPending: () => api.get(`${BASE}/pending`),
  getPeriods: () => api.get(`${BASE}/periods`),
  getList: (periodPk) => api.get(`${BASE}/${periodPk}/list`),
  getStatus: (periodPk) => api.get(`${BASE}/${periodPk}/status`),
  submit: (data) => api.post(`${BASE}/submit`, data),
};

export default avalService;
