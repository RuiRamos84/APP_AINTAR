// services/emission_service.js
// Cliente API para sistema unificado de emissões
import api from './api';

const BASE_URL = '/emissions';

/**
 * Sistema Unificado de Emissões - API Client
 * Suporta: Ofícios, Notificações, Declarações, Informações, Deliberações
 */

// =============================================================================
// DOCUMENT TYPES
// =============================================================================

/**
 * Lista todos os tipos de documentos disponíveis
 * @param {boolean} activeOnly - Retornar apenas tipos ativos
 * @returns {Promise}
 */
export const getDocumentTypes = async (activeOnly = true) => {
  try {
    const response = await api.get(`${BASE_URL}/types`, {
      params: { active_only: activeOnly }
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao obter tipos de documentos:', error);
    throw error;
  }
};

// =============================================================================
// TEMPLATES
// =============================================================================

/**
 * Lista templates com filtros
 * @param {Object} filters - {tb_document_type, active, search, limit, offset}
 * @returns {Promise}
 */
export const getTemplates = async (filters = {}) => {
  try {
    const response = await api.get(`${BASE_URL}/templates`, { params: filters });
    return response.data;
  } catch (error) {
    console.error('Erro ao obter templates:', error);
    throw error;
  }
};

/**
 * Obtém template específico por ID
 * @param {number} templateId
 * @returns {Promise}
 */
export const getTemplate = async (templateId) => {
  try {
    const response = await api.get(`${BASE_URL}/templates/${templateId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter template:', error);
    throw error;
  }
};

/**
 * Cria novo template
 * @param {Object} templateData - {tb_document_type, name, body, header_template, footer_template, metadata}
 * @returns {Promise}
 */
export const createTemplate = async (templateData) => {
  try {
    const response = await api.post(`${BASE_URL}/templates`, templateData);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar template:', error);
    // Retornar erro estruturado em vez de lançar exceção
    if (error.response?.data) {
      return error.response.data;
    }
    return { success: false, message: error.message || 'Erro ao criar template' };
  }
};

/**
 * Atualiza template existente
 * @param {number} templateId
 * @param {Object} templateData
 * @returns {Promise}
 */
export const updateTemplate = async (templateId, templateData) => {
  try {
    const response = await api.put(`${BASE_URL}/templates/${templateId}`, templateData);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar template:', error);
    // Retornar erro estruturado em vez de lançar exceção
    if (error.response?.data) {
      return error.response.data;
    }
    return { success: false, message: error.message || 'Erro ao atualizar template' };
  }
};

/**
 * Desativa template (soft delete)
 * @param {number} templateId
 * @returns {Promise}
 */
export const deleteTemplate = async (templateId) => {
  try {
    const response = await api.delete(`${BASE_URL}/templates/${templateId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar template:', error);
    // Retornar erro estruturado em vez de lançar exceção
    if (error.response?.data) {
      return error.response.data;
    }
    return { success: false, message: error.message || 'Erro ao deletar template' };
  }
};

// =============================================================================
// EMISSIONS
// =============================================================================

/**
 * Lista emissões com filtros
 * @param {Object} filters - {tb_document_type, status, search, date_from, date_to, limit, offset}
 * @returns {Promise}
 */
export const getEmissions = async (filters = {}) => {
  try {
    const response = await api.get(`${BASE_URL}/`, { params: filters });
    return response.data;
  } catch (error) {
    console.error('Erro ao obter emissões:', error);
    throw error;
  }
};

/**
 * Obtém emissão específica por ID
 * @param {number} emissionId
 * @returns {Promise}
 */
export const getEmission = async (emissionId) => {
  try {
    const response = await api.get(`${BASE_URL}/${emissionId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter emissão:', error);
    throw error;
  }
};

/**
 * Cria nova emissão
 * @param {Object} emissionData
 * @returns {Promise}
 */
export const createEmission = async (emissionData) => {
  try {
    const response = await api.post(`${BASE_URL}/`, emissionData);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar emissão:', error);
    throw error;
  }
};

/**
 * Atualiza emissão existente
 * @param {number} emissionId
 * @param {Object} emissionData
 * @returns {Promise}
 */
export const updateEmission = async (emissionId, emissionData) => {
  try {
    const response = await api.put(`${BASE_URL}/${emissionId}`, emissionData);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar emissão:', error);
    throw error;
  }
};

/**
 * Cancela emissão (soft delete)
 * @param {number} emissionId
 * @returns {Promise}
 */
export const deleteEmission = async (emissionId) => {
  try {
    const response = await api.delete(`${BASE_URL}/${emissionId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar emissão:', error);
    throw error;
  }
};

// =============================================================================
// NUMBERING
// =============================================================================

/**
 * Preview do próximo número disponível
 * @param {Object} params - {document_type_code, year, department_code}
 * @returns {Promise}
 */
export const previewNextNumber = async (params) => {
  try {
    const response = await api.post(`${BASE_URL}/numbering/preview`, params);
    return response.data;
  } catch (error) {
    console.error('Erro ao gerar preview de número:', error);
    throw error;
  }
};

/**
 * Estatísticas de emissões por ano
 * @param {number} year
 * @param {string} typeCode - Código do tipo (opcional)
 * @returns {Promise}
 */
export const getYearStatistics = async (year, typeCode = null) => {
  try {
    const params = typeCode ? { type: typeCode } : {};
    const response = await api.get(`${BASE_URL}/numbering/statistics/${year}`, { params });
    return response.data;
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    throw error;
  }
};

// =============================================================================
// VARIABLES
// =============================================================================

/**
 * Obtém variáveis disponíveis para tipo de documento
 * @param {string} typeCode - Código do tipo (OFI, NOT, DEC, etc)
 * @returns {Promise}
 */
export const getVariablesForType = async (typeCode) => {
  try {
    const response = await api.get(`${BASE_URL}/variables/${typeCode}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter variáveis:', error);
    throw error;
  }
};

// =============================================================================
// AUDIT
// =============================================================================

/**
 * Lista logs de auditoria
 * @param {Object} filters - {user_id, action, emission_id, date_from, date_to, limit}
 * @returns {Promise}
 */
export const getAuditLogs = async (filters = {}) => {
  try {
    const response = await api.get(`${BASE_URL}/audit`, { params: filters });
    return response.data;
  } catch (error) {
    console.error('Erro ao obter audit logs:', error);
    throw error;
  }
};

// =============================================================================
// PDF GENERATION & DOWNLOAD
// =============================================================================

/**
 * Gera PDF para uma emissão
 * @param {number} emissionId
 * @returns {Promise}
 */
export const generatePDF = async (emissionId) => {
  try {
    const response = await api.post(`${BASE_URL}/${emissionId}/generate`, {});
    return response.data;
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }
};

/**
 * Upload PDF gerado no frontend para o backend
 * @param {number} emissionId - ID da emissão
 * @param {File} pdfFile - Arquivo PDF gerado
 * @param {Object} metadata - Metadados adicionais (opcional)
 * @returns {Promise}
 */
export const uploadPDF = async (emissionId, pdfFile, metadata = {}) => {
  try {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await api.post(`${BASE_URL}/${emissionId}/upload-pdf`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao fazer upload do PDF:', error);
    throw error;
  }
};

/**
 * Alias para getEmission - obtém emissão por ID com todos os dados
 * @param {number} emissionId
 * @returns {Promise}
 */
export const getEmissionById = getEmission;

/**
 * Faz download do PDF de uma emissão
 * @param {number} emissionId
 * @param {string} filename - Nome do ficheiro (opcional)
 * @returns {Promise}
 */
export const downloadPDF = async (emissionId, filename = null) => {
  try {
    const response = await api.get(`${BASE_URL}/${emissionId}/download`, {
      responseType: 'blob'
    });

    // Criar link de download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || `emission_${emissionId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('Erro ao fazer download do PDF:', error);
    throw error;
  }
};

/**
 * Abre PDF em nova aba para visualização
 * @param {number} emissionId
 * @returns {Promise}
 */
export const viewPDF = async (emissionId) => {
  try {
    const response = await api.get(`${BASE_URL}/${emissionId}/view`, {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    window.open(url, '_blank');

    return { success: true };
  } catch (error) {
    console.error('Erro ao visualizar PDF:', error);
    throw error;
  }
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Status badges config
 */
export const STATUS_CONFIG = {
  draft: {
    label: 'Rascunho',
    color: 'default',
    icon: '📝'
  },
  issued: {
    label: 'Emitido',
    color: 'primary',
    icon: '✓'
  },
  signed: {
    label: 'Assinado',
    color: 'success',
    icon: '✓✓'
  },
  archived: {
    label: 'Arquivado',
    color: 'secondary',
    icon: '📦'
  },
  cancelled: {
    label: 'Cancelado',
    color: 'error',
    icon: '✗'
  }
};

/**
 * Formata número de emissão para display
 * @param {string} emissionNumber
 * @returns {string}
 */
export const formatEmissionNumber = (emissionNumber) => {
  if (!emissionNumber) return '-';

  // Parse: OF-2025.S.OFI.000001 → Ofício nº 1/2025 (S)
  try {
    const parts = emissionNumber.split('-');
    const [year, dept, type, seq] = parts[1].split('.');

    const typeNames = {
      OFI: 'Ofício',
      NOT: 'Notificação',
      DEC: 'Declaração',
      INF: 'Informação',
      DEL: 'Deliberação'
    };

    const typeName = typeNames[type] || type;
    const seqNum = parseInt(seq, 10);

    return `${typeName} nº ${seqNum}/${year} (${dept})`;
  } catch (err) {
    return emissionNumber;
  }
};

export default {
  getDocumentTypes,
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getEmissions,
  getEmission,
  getEmissionById,
  createEmission,
  updateEmission,
  deleteEmission,
  previewNextNumber,
  getYearStatistics,
  getVariablesForType,
  getAuditLogs,
  generatePDF,
  uploadPDF,
  downloadPDF,
  viewPDF,
  STATUS_CONFIG,
  formatEmissionNumber
};
