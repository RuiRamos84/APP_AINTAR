// services/signature_service.js
// Módulo de Assinatura Digital - Reutilizável em todo o projeto
// Suporta: Chave Móvel Digital (CMD) e Cartão de Cidadão (CC)
import api from './api';

const BASE_URL = '/signature';

/**
 * Obtém o hash SHA256 do PDF para assinatura com Cartão de Cidadão
 * @param {string} documentType - Tipo do documento ('emission', etc.)
 * @param {number} documentId - ID do documento
 * @returns {Promise}
 */
export const getDocumentHash = async (documentType, documentId) => {
  const response = await api.get(`${BASE_URL}/hash`, {
    params: { document_type: documentType, document_id: documentId }
  });
  return response.data;
};

/**
 * Inicia assinatura com Chave Móvel Digital
 * @param {string} documentType - Tipo do documento
 * @param {number} documentId - ID do documento
 * @param {string} phone - Número de telemóvel (+351XXXXXXXXX)
 * @param {string} nif - NIF do utilizador
 * @param {string} reason - Motivo da assinatura (opcional)
 * @returns {Promise}
 */
export const initCMDSignature = async (documentType, documentId, phone, nif, reason = 'Assinatura de Documento Oficial') => {
  const response = await api.post(`${BASE_URL}/cmd/init`, {
    document_type: documentType,
    document_id: documentId,
    phone,
    nif,
    reason
  });
  return response.data;
};

/**
 * Verifica o estado de uma assinatura CMD em curso
 * @param {string} requestId - ID do pedido de assinatura
 * @returns {Promise}
 */
export const checkCMDStatus = async (requestId) => {
  const response = await api.get(`${BASE_URL}/cmd/status/${requestId}`);
  return response.data;
};

/**
 * Completa a assinatura CMD após confirmação do PIN
 * @param {string} documentType - Tipo do documento
 * @param {number} documentId - ID do documento
 * @param {string} requestId - ID do pedido de assinatura
 * @returns {Promise}
 */
export const completeCMDSignature = async (documentType, documentId, requestId) => {
  const response = await api.post(`${BASE_URL}/cmd/complete`, {
    document_type: documentType,
    document_id: documentId,
    request_id: requestId
  });
  return response.data;
};

/**
 * Assina um documento com Cartão de Cidadão
 * @param {string} documentType - Tipo do documento
 * @param {number} documentId - ID do documento
 * @param {string} certificate - Certificado em PEM
 * @param {string} signature - Valor da assinatura (calculado no frontend via middleware CC)
 * @param {string} reason - Motivo da assinatura (opcional)
 * @returns {Promise}
 */
export const signWithCC = async (documentType, documentId, certificate, signature, reason = 'Assinatura de Documento Oficial') => {
  const response = await api.post(`${BASE_URL}/cc`, {
    document_type: documentType,
    document_id: documentId,
    certificate,
    signature,
    reason
  });
  return response.data;
};

export default {
  getDocumentHash,
  initCMDSignature,
  checkCMDStatus,
  completeCMDSignature,
  signWithCC
};
