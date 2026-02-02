/**
 * Status Utilities - Gestão de estados/status de documentos
 * Utiliza metadados dinâmicos com fallback para valores padrão
 */

/**
 * Nomes padrão dos status (fallback quando metadados não disponíveis)
 */
const DEFAULT_STATUS_NAMES = {
  '-1': 'ANULADO',
  '0': 'CONCLUIDO',
  '1': 'ENTRADA',
  '2': 'PARA VALIDAÇÃO',
  '4': 'PARA TRATAMENTO',
  '5': 'ANÁLISE EXTERNA',
  '6': 'PEDIDO DE ELEMENTOS',
  '7': 'EMISSÃO DE OFÍCIO',
  '8': 'PARA PAVIMENTAÇÃO',
  '9': 'PARA AVALIAÇÃO NO TERRENO',
  '10': 'PARA EXECUÇÃO',
  '11': 'PARA ORÇAMENTAÇÃO',
  '12': 'PARA COBRANÇA',
  '13': 'PARA ACEITAÇÃO DE ORÇAMENTO',
  '100': 'PARA PAGAMENTO DE PAVIMENTAÇÃO',
};

/**
 * Mapeamento de cores MUI para cada status
 */
const STATUS_COLOR_MAP = {
  '-1': 'error',     // ANULADO
  '0': 'success',    // CONCLUIDO
  '1': 'grey',       // ENTRADA
  '2': 'primary',    // PARA VALIDAÇÃO
  '4': 'primary',    // PARA TRATAMENTO
  '5': 'warning',    // ANÁLISE EXTERNA
  '6': 'secondary',  // PEDIDO DE ELEMENTOS
  '7': 'info',       // EMISSÃO DE OFÍCIO
  '8': 'primary',    // PARA PAVIMENTAÇÃO
  '9': 'warning',    // PARA AVALIAÇÃO NO TERRENO
  '10': 'secondary', // PARA EXECUÇÃO
  '11': 'info',      // PARA ORÇAMENTAÇÃO
  '12': 'primary',   // PARA COBRANÇA
  '13': 'warning',   // PARA ACEITAÇÃO DE ORÇAMENTO
  '100': 'info',     // PARA PAGAMENTO DE PAVIMENTAÇÃO
};

/**
 * Ordem de visualização (Kanban, sorting)
 */
const STATUS_ORDER_MAP = {
  '-1': 999, // ANULADO (final)
  '0': 998,  // CONCLUIDO (penúltimo)
  '1': 1,    // ENTRADA
  '2': 2,    // PARA VALIDAÇÃO
  '4': 3,    // PARA TRATAMENTO
  '5': 4,    // ANÁLISE EXTERNA
  '6': 5,    // PEDIDO DE ELEMENTOS
  '7': 6,    // EMISSÃO DE OFÍCIO
  '8': 7,    // PARA PAVIMENTAÇÃO
  '9': 8,    // PARA AVALIAÇÃO NO TERRENO
  '10': 9,   // PARA EXECUÇÃO
  '11': 10,  // PARA ORÇAMENTAÇÃO
  '12': 11,  // PARA COBRANÇA
  '13': 12,  // PARA ACEITAÇÃO DE ORÇAMENTO
  '100': 13, // PARA PAGAMENTO DE PAVIMENTAÇÃO
};

/** IDs de status que representam documentos fechados */
const CLOSED_STATUS_IDS = [-1, 0];

/**
 * Obtém o nome do status a partir dos metadados
 * @param {number|string} statusId - Código do status (campo 'what')
 * @param {Array} statusMetadata - Array 'what' dos metadados
 * @returns {string}
 */
export const getStatusName = (statusId, statusMetadata) => {
  if (statusMetadata && Array.isArray(statusMetadata)) {
    const status = statusMetadata.find((s) => s.pk === statusId);
    if (status) return status.step;
  }
  return DEFAULT_STATUS_NAMES[String(statusId)] || `Status ${statusId}`;
};

/**
 * Obtém a cor MUI para um status
 * @param {number|string} statusId
 * @returns {string} Nome da cor MUI (success, error, primary, etc.)
 */
export const getStatusColor = (statusId) => {
  if (statusId === undefined || statusId === null) return 'grey';
  return STATUS_COLOR_MAP[String(statusId)] || 'grey';
};

/**
 * Obtém o valor CSS da cor para um status
 * @param {number|string} statusId
 * @param {Object} theme - MUI theme
 * @returns {string} Valor CSS da cor
 */
export const getStatusColorValue = (statusId, theme) => {
  if (!theme) return '#9e9e9e';

  const colorName = getStatusColor(statusId);

  switch (colorName) {
    case 'error': return theme.palette.error.main;
    case 'success': return theme.palette.success.main;
    case 'primary': return theme.palette.primary.main;
    case 'secondary': return theme.palette.secondary.main;
    case 'warning': return theme.palette.warning.main;
    case 'info': return theme.palette.info.main;
    case 'grey': return theme.palette.grey[500];
    default: return theme.palette.grey[500];
  }
};

/**
 * Obtém a ordem de visualização para um status
 * @param {number|string} statusId
 * @returns {number}
 */
export const getStatusOrder = (statusId) => {
  return STATUS_ORDER_MAP[String(statusId)] || 500;
};

/**
 * Constrói um mapa completo de status para Kanban/agrupamento
 * @param {Array} statusMetadata - Array 'what' dos metadados
 * @param {Object} theme - MUI theme
 * @returns {Object} Mapa { statusId: { name, color, order, items: [] } }
 */
export const getStatusMap = (statusMetadata, theme) => {
  const statusMap = {};

  if (statusMetadata && Array.isArray(statusMetadata)) {
    statusMetadata.forEach((status) => {
      const statusId = String(status.pk);
      statusMap[statusId] = {
        name: status.step,
        color: getStatusColorValue(statusId, theme),
        order: getStatusOrder(statusId),
        items: [],
      };
    });
  } else {
    Object.keys(DEFAULT_STATUS_NAMES).forEach((statusId) => {
      statusMap[statusId] = {
        name: DEFAULT_STATUS_NAMES[statusId],
        color: getStatusColorValue(statusId, theme),
        order: getStatusOrder(statusId),
        items: [],
      };
    });
  }

  return statusMap;
};

/**
 * Agrupa documentos por status
 * @param {Array} documents
 * @param {Array} statusMetadata - Array 'what' dos metadados
 * @param {Object} theme - MUI theme
 * @returns {Object} Documentos agrupados por status
 */
export const groupDocumentsByStatus = (documents, statusMetadata, theme) => {
  if (!Array.isArray(documents)) return {};

  const statusMap = getStatusMap(statusMetadata, theme);

  documents.forEach((doc) => {
    const statusId = String(doc.what);

    if (!statusMap[statusId]) {
      statusMap[statusId] = {
        name: getStatusName(doc.what, statusMetadata),
        color: getStatusColorValue(statusId, theme),
        order: getStatusOrder(statusId),
        items: [],
      };
    }

    statusMap[statusId].items.push(doc);
  });

  return statusMap;
};

/**
 * Verifica se um documento está fechado (não pode ser modificado)
 * @param {Object} document
 * @returns {boolean}
 */
export const isDocumentClosed = (document) => {
  if (!document) return false;
  return CLOSED_STATUS_IDS.includes(Number(document.what));
};
