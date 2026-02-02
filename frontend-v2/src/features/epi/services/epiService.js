/**
 * EPI Service
 * Serviço para gestão de Equipamentos de Proteção Individual
 */

import api from '@/services/api/client';

/**
 * Busca lista de entregas de EPI/Fardamento
 * @param {Object} params - Parâmetros de filtro
 * @param {string} params.employeeId - ID do colaborador (opcional)
 * @param {string} params.type - Tipo: 'all', 'epi', 'uniform'
 * @param {number} params.page - Página atual
 * @param {number} params.pageSize - Itens por página
 * @returns {Promise<{deliveries: Array, total: number}>}
 */
export const getDeliveries = async ({
  employeeId,
  type = 'all',
  page = 0,
  pageSize = 10,
} = {}) => {
  const response = await api.get('/deliveries', {
    params: {
      employeeId,
      type,
      page,
      pageSize,
    },
  });

  if (!employeeId) {
    return response;
  }

  // Filtrar por colaborador e tipo
  const empId = String(employeeId).trim();
  const filteredDeliveries = response.deliveries.filter((delivery) => {
    const deliveryEmpId = String(delivery.tb_epi).trim();
    const typeMatch =
      type === 'all' ||
      (type === 'epi' && delivery.what === 1) ||
      (type === 'uniform' && delivery.what === 2);

    return deliveryEmpId === empId && typeMatch;
  });

  return {
    deliveries: filteredDeliveries,
    total: filteredDeliveries.length,
  };
};

/**
 * Cria uma nova entrega de EPI/Fardamento
 * @param {Object} data - Dados da entrega
 * @param {string} data.pntb_epi - ID do colaborador
 * @param {number} data.pntt_epiwhat - Tipo de equipamento
 * @param {string} data.pndata - Data da entrega (YYYY-MM-DD)
 * @param {number} data.pnquantity - Quantidade
 * @param {string} data.pndim - Tamanho/Dimensão
 * @param {string} data.pnmemo - Observações
 * @returns {Promise<Object>}
 */
export const createDelivery = async (data) => {
  const response = await api.post('/delivery', {
    ...data,
    pntb_epi: String(data.pntb_epi).trim(),
  });
  return response;
};

/**
 * Atualiza uma entrega existente
 * @param {number} pk - ID da entrega
 * @param {Object} data - Dados a atualizar
 * @returns {Promise<Object>}
 */
export const updateDelivery = async (pk, data) => {
  const response = await api.put(`/delivery/${pk}`, {
    ...data,
    pndata: data.pndata,
    pnquantity: data.pnquantity,
    pndim: data.pndim || '',
    pnmemo: data.pnmemo || '',
  });
  return response;
};

/**
 * Anula/Retorna uma entrega
 * @param {number} pk - ID da entrega
 * @param {Object} data - Dados da anulação
 * @param {string} data.pndata - Data da anulação
 * @param {string} data.pnmemo - Motivo da anulação
 * @returns {Promise<Object>}
 */
export const returnDelivery = async (pk, data) => {
  const response = await api.put(`/delivery/${pk}/return`, {
    pndata: data.pndata || new Date().toISOString().split('T')[0],
    pnmemo: data.pnmemo || '',
  });
  return response;
};

/**
 * Busca dados base do módulo EPI (colaboradores e tipos)
 * @returns {Promise<{epi_list: Array, epi_what_types: Array, epi_shoe_types: Array}>}
 */
export const getEpiData = async () => {
  const response = await api.get('/epi/data');
  return response;
};

/**
 * Busca lista de colaboradores EPI
 * @returns {Promise<Array>}
 */
export const getEpiList = async () => {
  const response = await api.get('/epi/list');
  return response;
};

/**
 * Atualiza preferências de tamanhos de um colaborador
 * @param {string} userId - ID do colaborador
 * @param {Object} data - Preferências de tamanhos
 * @returns {Promise<Object>}
 */
export const updatePreferences = async (userId, data) => {
  const response = await api.put(`/preferences/${String(userId).trim()}`, data);
  return response;
};

/**
 * Cria um novo colaborador EPI
 * @param {Object} data - Dados do colaborador
 * @returns {Promise<Object>}
 */
export const createEmployee = async (data) => {
  const response = await api.post('/epi', data);
  return response;
};

/**
 * Formata data para o formato ISO (YYYY-MM-DD)
 * @param {Date|string} date - Data a formatar
 * @returns {string}
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Retorna a data atual no formato ISO
 * @returns {string}
 */
export const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Mapeamento de tipos de equipamento para campos de preferência
 */
export const SIZE_FIELD_MAP = {
  BOTA: 'boot',
  SAPATO: 'shoe',
  GALOCHAS: 'galoshes',
  'BOTA SOLDA': 'welderboot',
  'T-SHIRT': 'tshirt',
  SWEAT: 'sweatshirt',
  'CAS REFLET': 'reflectivejacket',
  'CAS POLAR': 'polarjacket',
  'FATO MACACO': 'monkeysuit',
  CALÇAS: 'pants',
  AVENTAL: 'apron',
  BATA: 'gown',
};

/**
 * Obtém o tamanho preferido de um colaborador para um tipo de equipamento
 * @param {Object} employee - Dados do colaborador
 * @param {string} itemTypeName - Nome do tipo de equipamento
 * @returns {string}
 */
export const getPreferredSize = (employee, itemTypeName) => {
  if (!employee) return '';
  const sizeField = SIZE_FIELD_MAP[itemTypeName];
  return sizeField ? employee[sizeField] || '' : '';
};

export default {
  getDeliveries,
  createDelivery,
  updateDelivery,
  returnDelivery,
  getEpiData,
  getEpiList,
  updatePreferences,
  createEmployee,
  formatDate,
  getCurrentDate,
  getPreferredSize,
  SIZE_FIELD_MAP,
};
