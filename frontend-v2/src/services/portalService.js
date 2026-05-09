import { documentsService } from '@/features/documents/api/documentsService';

/**
 * PortalService
 * Wrapper over documentsService to provide a clean API for the Client Portal.
 */
export const portalService = {
  async getMyRequests(params = {}) {
    return documentsService.fetchCreated(params);
  },

  /**
   * Fetch a specific request detail
   * @param {string|number} id - Request/Document ID
   * @returns {Promise<Object>} Request details
   */
  async getRequestDetail(id) {
    return documentsService.fetchById(id);
  },

  /**
   * Fetch the timeline/steps of a request
   * @param {string|number} id - Request/Document ID
   * @returns {Promise<Array>} List of steps
   */
  async getRequestTimeline(id) {
    return documentsService.fetchSteps(id);
  },

  /**
   * Fetch annexes/files of a request
   * @param {string|number} id - Request/Document ID
   * @returns {Promise<Array>} List of annexes
   */
  async getRequestAnnexes(id) {
    return documentsService.fetchAnnexes(id);
  },

  /**
   * Fetch custom parameters of a request
   * @param {string|number} id - Request/Document ID
   * @returns {Promise<Array>} List of parameters
   */
  async getRequestParams(id) {
    return documentsService.fetchParams(id);
  },

  /**
   * Fetch payment info of a request
   * @param {string|number} id - Request/Document ID
   */
  async getRequestPayments(id) {
    const { default: paymentService } = await import('@/features/payments/services/paymentService');
    return paymentService.getInvoiceAmount(id);
  },

  /**
   * Download a file from a request
   * @param {string} regnumber - Request registration number
   * @param {string} filename - File name
   * @param {string} displayName - Name for the downloaded file
   */
  async downloadFile(regnumber, filename, displayName) {
    return documentsService.downloadFile(regnumber, filename, displayName);
  },

  /**
   * Preview a file
   * @param {string} regnumber - Request registration number
   * @param {string} filename - File name
   */
  async previewFile(regnumber, filename) {
    return documentsService.previewFile(regnumber, filename);
  },

  /**
   * Fetch all payments/invoices for the current client
   * @returns {Promise<Array>} List of payments
   */
  async getMyPayments() {
    const { data } = await import('@/services/api/client');
    const response = await data.get('/payments/me');
    return response.payments || [];
  },

  /**
   * Fetch contracts and payment periods for the authenticated client
   * @returns {Promise<Array>} List of contracts with their payment periods
   */
  async getMyContracts() {
    const { data } = await import('@/services/api/client');
    const response = await data.get('/payments/my-contracts');
    return response.contracts || [];
  },

  /**
   * Download invoice PDF
   */
  async downloadInvoice(documentId) {
    const { data } = await import('@/services/api/client');
    const response = await data.get(`/documents/form/pdf/${documentId}`, {
      responseType: 'blob'
    });
    return response;
  }
};

export default portalService;
