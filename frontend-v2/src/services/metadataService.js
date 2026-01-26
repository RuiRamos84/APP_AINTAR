/**
 * Metadata Service
 * Serviço para buscar metadados da aplicação (dropdowns, listas de referência, etc.)
 */

import apiClient from './api/client';

/**
 * Busca todos os metadados da aplicação
 * Inclui: tipos de identificação, associados, utilizadores, estados, etc.
 * @returns {Promise<Object>} Objeto com todos os metadados
 */
export const fetchMetaData = async () => {
  try {
    const response = await apiClient.get('/metaData');
    return response;
  } catch (error) {
    console.error('[MetaDataService] Error fetching metadata:', error);
    throw error;
  }
};

/**
 * Busca apenas tipos de identificação
 * @returns {Promise<Array>} Lista de tipos de identificação
 */
export const fetchIdentTypes = async () => {
  try {
    const metadata = await fetchMetaData();
    return metadata.ident_types || [];
  } catch (error) {
    console.error('[MetaDataService] Error fetching ident types:', error);
    throw error;
  }
};

/**
 * Busca apenas associados
 * @returns {Promise<Array>} Lista de associados
 */
export const fetchAssociates = async () => {
  try {
    const metadata = await fetchMetaData();
    return metadata.associates || [];
  } catch (error) {
    console.error('[MetaDataService] Error fetching associates:', error);
    throw error;
  }
};

/**
 * Helper: Encontrar valor em metadata por chave
 * @param {Array} metaArray - Array de metadata
 * @param {string} key - Chave a procurar
 * @param {any} value - Valor a procurar
 * @returns {Object|null} Objeto encontrado ou null
 */
export const findMetaValue = (metaArray, key, value) => {
  if (!Array.isArray(metaArray)) return null;
  return metaArray.find(item => item[key] === value) || null;
};

/**
 * Helper: Mapear ID para label
 * @param {Array} metaArray - Array de metadata
 * @param {string} idKey - Nome da chave do ID
 * @param {string} labelKey - Nome da chave do label
 * @param {any} id - ID a procurar
 * @returns {string} Label correspondente ou string vazia
 */
export const mapIdToLabel = (metaArray, idKey, labelKey, id) => {
  const item = findMetaValue(metaArray, idKey, id);
  return item ? item[labelKey] : '';
};

/**
 * Busca apenas profiles (ts_profile)
 * @returns {Promise<Array>} Lista de profiles
 */
export const fetchProfiles = async () => {
  try {
    const metadata = await fetchMetaData();
    return metadata.profiles || [];
  } catch (error) {
    console.error('[MetaDataService] Error fetching profiles:', error);
    throw error;
  }
};

/**
 * Busca apenas interfaces/permissions (ts_interface)
 * @returns {Promise<Array>} Lista de interfaces
 */
export const fetchInterfaces = async () => {
  try {
    const metadata = await fetchMetaData();
    return metadata.interfaces || [];
  } catch (error) {
    console.error('[MetaDataService] Error fetching interfaces:', error);
    throw error;
  }
};

/**
 * Busca apenas prioridades de tasks
 * @returns {Promise<Array>} Lista de prioridades
 */
export const fetchTaskPriorities = async () => {
  try {
    const metadata = await fetchMetaData();
    return metadata.task_priority || [];
  } catch (error) {
    console.error('[MetaDataService] Error fetching task priorities:', error);
    throw error;
  }
};

/**
 * Busca apenas status de tasks
 * @returns {Promise<Array>} Lista de status
 */
export const fetchTaskStatus = async () => {
  try {
    const metadata = await fetchMetaData();
    return metadata.task_status || [];
  } catch (error) {
    console.error('[MetaDataService] Error fetching task status:', error);
    throw error;
  }
};

export default {
  fetchMetaData,
  fetchIdentTypes,
  fetchAssociates,
  fetchProfiles,
  fetchInterfaces,
  fetchTaskPriorities,
  fetchTaskStatus,
  findMetaValue,
  mapIdToLabel,
};
