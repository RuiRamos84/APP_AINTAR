/**
 * Emissões Service
 * Sistema unificado: Ofícios, Notificações, Declarações, Informações, Deliberações
 */

import apiClient from '@/services/api/client';

const BASE = '/emissions';

// ─── Tipos de Documento ───────────────────────────────────────────────────────

export const getDocumentTypes = (activeOnly = true) =>
  apiClient.get(`${BASE}/types`, { params: { active_only: activeOnly } });

// ─── Templates ────────────────────────────────────────────────────────────────

export const getTemplates = (filters = {}) =>
  apiClient.get(`${BASE}/templates`, { params: filters });

export const getTemplate = (id) =>
  apiClient.get(`${BASE}/templates/${id}`);

export const createTemplate = (data) =>
  apiClient.post(`${BASE}/templates`, data);

export const updateTemplate = (id, data) =>
  apiClient.put(`${BASE}/templates/${id}`, data);

export const deleteTemplate = (id) =>
  apiClient.delete(`${BASE}/templates/${id}`);

// ─── Emissões ─────────────────────────────────────────────────────────────────

export const getEmissions = (filters = {}) =>
  apiClient.get(`${BASE}/`, { params: filters });

export const getEmission = (id) =>
  apiClient.get(`${BASE}/${id}`);

export const createEmission = (data) =>
  apiClient.post(`${BASE}/`, data);

export const updateEmission = (id, data) =>
  apiClient.put(`${BASE}/${id}`, data);

export const deleteEmission = (id) =>
  apiClient.delete(`${BASE}/${id}`);

// ─── Numeração ────────────────────────────────────────────────────────────────

export const previewNextNumber = (params) =>
  apiClient.post(`${BASE}/numbering/preview`, params);

export const getYearStatistics = (year, typeCode = null) =>
  apiClient.get(`${BASE}/numbering/statistics/${year}`, {
    params: typeCode ? { type: typeCode } : {},
  });

// ─── Variáveis ────────────────────────────────────────────────────────────────

export const getVariablesForType = (typeCode) =>
  apiClient.get(`${BASE}/variables/${typeCode}`);

// ─── PDF ──────────────────────────────────────────────────────────────────────

export const generatePDF = (id) =>
  apiClient.post(`${BASE}/${id}/generate`, {});

export const downloadPDF = async (id, filename = null) => {
  const response = await apiClient.get(`${BASE}/${id}/download`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || `emissao_${id}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return { success: true };
};

export const viewPDF = async (id) => {
  const response = await apiClient.get(`${BASE}/${id}/view`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(
    new Blob([response], { type: 'application/pdf' })
  );
  window.open(url, '_blank');
  return { success: true };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const STATUS_CONFIG = {
  draft:     { label: 'Rascunho',  color: 'default',   chipColor: 'default' },
  issued:    { label: 'Emitido',   color: 'primary',   chipColor: 'primary' },
  signed:    { label: 'Assinado',  color: 'success',   chipColor: 'success' },
  archived:  { label: 'Arquivado', color: 'secondary', chipColor: 'secondary' },
  cancelled: { label: 'Cancelado', color: 'error',     chipColor: 'error' },
};

export const formatEmissionNumber = (num) => {
  if (!num) return '-';
  try {
    const parts = num.split('-');
    const [year, dept, type, seq] = parts[1].split('.');
    const names = { OFI: 'Ofício', NOT: 'Notificação', DEC: 'Declaração', INF: 'Informação', DEL: 'Deliberação' };
    return `${names[type] || type} nº ${parseInt(seq, 10)}/${year} (${dept})`;
  } catch {
    return num;
  }
};
