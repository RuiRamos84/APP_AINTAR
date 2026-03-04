/**
 * Analysis Service
 * Gestão de análises laboratoriais
 */

import api from '@/services/api/client';

export const searchAnalysisByPK = (pk) =>
  api.get(`/analysis/search/${pk}`);

export const queryAnalyses = (filters = {}) =>
  api.post('/analysis/query', filters);

export const updateAnalysis = (data) =>
  api.post('/analysis/update', data);
