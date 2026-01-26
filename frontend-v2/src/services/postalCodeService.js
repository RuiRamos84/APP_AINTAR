/**
 * Postal Code Service
 *
 * Serviço para consulta de códigos postais portugueses através da API CTT
 * (Correios de Portugal)
 *
 * API: https://www.cttcodigopostal.pt/
 */

import axios from 'axios';

// Criar instância axios dedicada para a API CTT
const cttApi = axios.create({
  baseURL: `https://www.cttcodigopostal.pt/api/v1/${import.meta.env.VITE_CTT_API_KEY || '8a21fc4e22fc480994321a46f6bddc6b'}`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos
});

/**
 * Formata código postal para o formato português XXXX-XXX
 * @param {string} value - Código postal sem formatação
 * @returns {string} Código postal formatado
 */
export const formatPostalCode = (value) => {
  if (!value) return '';

  // Remove todos os caracteres não numéricos
  let cleaned = value.replace(/[^\d]/g, '');

  // Limita a 7 dígitos
  cleaned = cleaned.slice(0, 7);

  // Adiciona hífen após os primeiros 4 dígitos
  if (cleaned.length > 4) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }

  return cleaned;
};

/**
 * Valida se o código postal está completo (formato XXXX-XXX)
 * @param {string} postalCode - Código postal a validar
 * @returns {boolean} True se válido e completo
 */
export const isValidPostalCode = (postalCode) => {
  if (!postalCode) return false;
  const regex = /^\d{4}-\d{3}$/;
  return regex.test(postalCode);
};

/**
 * Busca endereços por código postal através da API CTT
 * @param {string} postalCode - Código postal no formato XXXX-XXX
 * @returns {Promise<Array|null>} Array de objetos com dados de endereço ou null se não encontrado
 *
 * Estrutura do objeto retornado:
 * {
 *   morada: string,      // Rua/Avenida
 *   localidade: string,  // NUT4 - Localidade/Cidade
 *   freguesia: string,   // NUT3 - Freguesia
 *   concelho: string,    // NUT2 - Concelho
 *   distrito: string     // NUT1 - Distrito
 * }
 */
export const getAddressByPostalCode = async (postalCode) => {
  try {
    // Validar formato antes de fazer chamada
    if (!isValidPostalCode(postalCode)) {
      throw new Error('Código postal inválido. Use o formato XXXX-XXX');
    }

    if (import.meta.env.DEV) {
      console.log('[PostalCodeService] Fetching address for:', postalCode);
    }

    const response = await cttApi.get(`/${postalCode}`);

    if (response.data && response.data.length > 0) {
      if (import.meta.env.DEV) {
        console.log('[PostalCodeService] Found addresses:', response.data.length);
      }
      return response.data;
    }

    // Nenhum endereço encontrado
    if (import.meta.env.DEV) {
      console.log('[PostalCodeService] No addresses found for:', postalCode);
    }
    return null;

  } catch (error) {
    // Erro de rede ou API
    console.error('[PostalCodeService] Error fetching address:', error.message);

    // Re-throw com mensagem mais amigável
    if (error.code === 'ECONNABORTED') {
      throw new Error('Tempo esgotado ao consultar código postal');
    }

    if (error.response?.status === 404) {
      throw new Error('Código postal não encontrado');
    }

    throw new Error('Erro ao consultar código postal. Tente novamente.');
  }
};

/**
 * Extrai lista de ruas/moradas únicas dos dados retornados pela API
 * @param {Array} addressData - Array de objetos de endereço da API
 * @returns {Array<string>} Array de strings com nomes de ruas únicas
 */
export const extractStreets = (addressData) => {
  if (!Array.isArray(addressData) || addressData.length === 0) {
    return [];
  }

  // Extrair moradas e remover duplicados
  const streets = addressData
    .map(item => item.morada)
    .filter(Boolean); // Remove valores vazios/null

  return [...new Set(streets)]; // Remove duplicados
};

/**
 * Extrai dados administrativos (NUTs) do primeiro endereço
 * @param {Array} addressData - Array de objetos de endereço da API
 * @returns {Object} Objeto com nut1, nut2, nut3, nut4
 */
export const extractAdministrativeData = (addressData) => {
  if (!Array.isArray(addressData) || addressData.length === 0) {
    return {
      nut1: '', // Distrito
      nut2: '', // Concelho
      nut3: '', // Freguesia
      nut4: '', // Localidade
    };
  }

  const firstAddress = addressData[0];

  return {
    nut1: firstAddress.distrito || '',
    nut2: firstAddress.concelho || '',
    nut3: firstAddress.freguesia || '',
    nut4: firstAddress.localidade || '',
  };
};

export default {
  formatPostalCode,
  isValidPostalCode,
  getAddressByPostalCode,
  extractStreets,
  extractAdministrativeData,
};
