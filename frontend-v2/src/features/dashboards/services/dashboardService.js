/**
 * Dashboard Service
 * Acesso aos dados estatísticos por categoria e view
 */

import apiClient from '@/services/api/client';

export const getDashboardStructure = () =>
  apiClient.get('/dashboard/structure');

export const getDashboardViewData = (viewName, filters = {}) => {
  const params = {};
  if (filters.year) params.year = filters.year;
  if (filters.month) params.month = filters.month;
  return apiClient.get(`/dashboard/view/${viewName}`, { params });
};

export const getDashboardCategoryData = (category, filters = {}) => {
  const params = {};
  if (filters.year) params.year = filters.year;
  if (filters.month) params.month = filters.month;
  return apiClient.get(`/dashboard/category/${category}`, { params });
};

export const getLandingData = () =>
  apiClient.get('/dashboard/landing');

export const clearDashboardCache = () =>
  apiClient.post('/dashboard/cache/clear');

/** Lookup pk → nome dos municípios abrangidos */
export const getMunicipalities = () =>
  apiClient.get('/municipalities');
