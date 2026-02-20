import api from '../../../services/api/client';

/**
 * Extract array from API response.
 * The backend returns nested objects like { documents: [...] }, { document_self: [...] }, etc.
 * The Axios interceptor already extracts response.data, so we receive the inner payload directly.
 */
const extractArray = (response, ...keys) => {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object') {
    for (const key of keys) {
      if (Array.isArray(response[key])) return response[key];
    }
  }
  return [];
};

/**
 * Extract a single object from API response.
 * The backend returns nested objects like { document: {...} }.
 */
const extractObject = (response, ...keys) => {
  if (response && typeof response === 'object') {
    for (const key of keys) {
      if (response[key] && typeof response[key] === 'object' && !Array.isArray(response[key])) {
        return response[key];
      }
    }
  }
  return response;
};

/**
 * Service to handle document related API requests
 */
export const documentsService = {
  /**
   * Fetch all documents
   * @returns {Promise<Array>} List of documents
   */
  async fetchAll() {
    const response = await api.get('/documents');
    return extractArray(response, 'documents');
  },

  /**
   * Fetch documents assigned to the current user
   * @returns {Promise<Array>} List of assigned documents
   */
  async fetchAssigned() {
    const response = await api.get('/document_self');
    return extractArray(response, 'document_self');
  },

  /**
   * Fetch documents created by the current user
   * @returns {Promise<Array>} List of owned documents
   */
  async fetchCreated() {
    const response = await api.get('/document_owner');
    return extractArray(response, 'document_owner');
  },

  /**
   * Fetch late documents (older than 30 days)
   * @returns {Promise<Array>} List of late documents
   */
  async fetchLate() {
    const response = await api.get('/documents/late');
    return extractArray(response, 'late_documents');
  },

  /**
   * Fetch a specific document by ID
   * @param {string|number} id - Document ID
   * @returns {Promise<Object>} Document details
   */
  async fetchById(id) {
    const response = await api.get(`/document/${id}`);
    return extractObject(response, 'document', 'documents');
  },

  /**
   * Fetch document steps
   * @param {string|number} id - Document ID
   * @returns {Promise<Array>} List of steps
   */
  async fetchSteps(id) {
    const response = await api.get(`/get_document_step/${id}`);
    return extractArray(response, 'steps', 'document_steps', 'documents');
  },

  /**
   * Add a new step to a document
   * @param {number} id - Document ID
   * @param {FormData} formData - Step data
   * @returns {Promise<Object>} Result
   */
  async addStep(id, formData) {
    const response = await api.post(`/add_document_step/${id}`, formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
    return response;
  },

  /**
   * Create a new document
   * @param {FormData} formData - Document data including files
   * @returns {Promise<Object>} Created document
   */
  async create(formData) {
    // Ensure 'files' is present in formData even if empty, but usually handled by caller
    const response = await api.post('/create_document', formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
    return response;
  },

  /**
   * Fetch document params
   */
  async fetchParams(id) {
    const response = await api.get(`/document/${id}/params`);
    return extractArray(response, 'params', 'document_params');
  },

  /**
   * Update document params
   */
  async updateParams(id, params) {
    const response = await api.put(`/document/${id}/params`, params);
    return response;
  },

  /**
   * Replicate document
   */
  async replicate(id, newType) {
    const response = await api.post(`/document/replicate/${id}`, { new_type: newType });
    return response;
  },

  /**
   * Clear notification
   */
  async clearNotification(id) {
    const response = await api.put(`/update_document_notification/${id}`);
    return response;
  },

  /**
   * Fetch document annexes
   * @param {string|number} id - Document ID
   * @returns {Promise<Array>} List of annexes
   */
  async fetchAnnexes(id) {
    const response = await api.get(`/get_document_anex/${id}`);
    return extractArray(response, 'annexes', 'document_annexes', 'documents');
  },

  /**
   * Add annex to document
   * @param {FormData} formData - Annex data with files
   * @returns {Promise<Object>} Result
   */
  async addAnnex(formData) {
    const response = await api.post('/add_document_annex', formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
    return response;
  },

  /**
   * Download comprovativo (proof document)
   * @param {string|number} id - Document ID
   * @returns {Promise<Blob>} PDF blob
   */
  async downloadComprovativo(id) {
    const response = await api.get(`/extrair_comprovativo/${id}`, {
      responseType: 'blob',
    });
    return response;
  },

  /**
   * Get document types available for an entity
   * @param {string|number} entityPk - Entity ID
   * @returns {Promise<Array>} Available document types
   */
  async fetchEntityDocumentTypes(entityPk) {
    const response = await api.get(`/entity_count_types/${entityPk}`);
    return response;
  },

  /**
   * Check if a user is on vacation
   * @param {string|number} userPk - User ID
   * @returns {Promise<Object>} Vacation status
   */
  async checkVacationStatus(userPk) {
    const response = await api.get(`/check_vacation_status/${userPk}`);
    return response;
  },

  /**
   * Preview a file (fetch as blob for inline viewing)
   * @param {string} regnumber - Document regnumber
   * @param {string} filename - File name
   * @returns {Promise<{url: string, type: string}>} Object URL and content type
   */
  async previewFile(regnumber, filename) {
    const response = await api.get(`/files/${regnumber}/${filename}?v=${Date.now()}`, {
      responseType: 'blob',
      headers: { Accept: '*/*' },
    });
    const blob = response instanceof Blob ? response : new Blob([response]);
    const url = URL.createObjectURL(blob);
    return { url, type: blob.type };
  },

  /**
   * Download a file
   * @param {string} regnumber - Document regnumber
   * @param {string} filename - File name
   * @param {string} displayName - Display name for download
   */
  async downloadFile(regnumber, filename, displayName) {
    const response = await api.get(`/files/${regnumber}/${filename}`, {
      responseType: 'blob',
      headers: { Accept: '*/*' },
    });
    const blob = response instanceof Blob ? response : new Blob([response]);
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.setAttribute('download', displayName || filename);
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  /**
   * Fetch document workflow hierarchy
   * @param {string|number} typeId - Document Type ID
   * @returns {Promise<Object>} Workflow hierarchy
   */
  async getDocumentWorkflow(typeId) {
    const response = await api.get(`/step_hierarchy/${typeId}`);
    // Adjust based on legacy expectation. Legacy expects object with .hierarchy
    return response; 
  },
};
