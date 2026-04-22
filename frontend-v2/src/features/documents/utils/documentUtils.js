import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

/**
 * Mapeamento de cores MUI para cada status de documento
 * Alinhado com a view vst_document_step$what do backend
 */
const STATUS_COLOR_MAP = {
  '-3': 'success',   // CONCLUIDO POR REPLICAÇÃO
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
 * Nomes padrão dos status (fallback quando metadados não disponíveis)
 */
const DEFAULT_STATUS_NAMES = {
  '-3': 'Concluído por Replicação',
  '-1': 'Anulado',
  '0': 'Concluído',
  '1': 'Entrada',
  '2': 'Para Validação',
  '4': 'Para Tratamento',
  '5': 'Análise Externa',
  '6': 'Pedido de Elementos',
  '7': 'Emissão de Ofício',
  '8': 'Para Pavimentação',
  '9': 'Avaliação no Terreno',
  '10': 'Para Execução',
  '11': 'Para Orçamentação',
  '12': 'Para Cobrança',
  '13': 'Aceitação de Orçamento',
  '100': 'Pag. Pavimentação',
};

/**
 * Get MUI color name for document status
 * @param {number|string} statusId - Document status ID (campo 'what')
 * @returns {string} MUI color name (success, error, primary, etc.)
 */
export const getStatusColor = (statusId) => {
  if (statusId === undefined || statusId === null) return 'default';
  return STATUS_COLOR_MAP[String(statusId)] || 'default';
};

/**
 * Get status label - dinâmico via metadados, com fallback
 * @param {number|string} statusId - Document status ID (campo 'what')
 * @param {Object|Array} metadata - Metadados completos (com .what) ou array 'what' direto
 * @returns {string} Nome legível do status
 */
export const getStatusLabel = (statusId, metadata = null) => {
  if (statusId === undefined || statusId === null) return '—';

  // Suporta receber metadata.what (array) ou metadata completo (objeto com .what)
  const whatArray = Array.isArray(metadata) ? metadata : metadata?.what;

  if (whatArray && Array.isArray(whatArray)) {
    const status = whatArray.find(s => s.pk === parseInt(statusId));
    if (status) return status.step;
  }

  // Fallback para nomes padrão
  return DEFAULT_STATUS_NAMES[String(statusId)] || `Estado ${statusId}`;
};

/**
 * Parse submission date string (handles "YYYY-MM-DD às HH:mm" format from backend)
 * @param {string} dateStr
 * @returns {Date|null}
 */
export const parseDate = (dateStr) => {
    if (!dateStr) return null;
    // Try native parsing first (ISO format, etc.)
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
    // Handle "YYYY-MM-DD às HH:mm" format
    const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})\s+às\s+(\d{2}:\d{2})$/);
    if (match) {
        date = new Date(`${match[1]}T${match[2]}:00`);
        if (!isNaN(date.getTime())) return date;
    }
    return null;
};

/**
 * Format date to PT format
 */
export const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = parseDate(dateStr);
    if (!date) return dateStr;
    return format(date, "d 'de' MMM, yyyy HH:mm", { locale: pt });
};

/**
 * Filter documents helper
 * @param {Array} documents
 * @param {Object} filters - { status, associate, type, notification }
 * @param {string} searchTerm
 * @param {Object} dateRange - { startDate, endDate } (YYYY-MM-DD strings)
 * @param {Object} metaData - metadados para resolver nome do estado
 */
/**
 * Filtros estruturados (dropdowns + intervalo de datas).
 * Pesquisa de texto é gerida separadamente por useSearch (@shared/hooks/useSearch).
 */
export const filterDocuments = (documents, filters, dateRange) => {
    if (!documents || !Array.isArray(documents)) return [];

    return documents.filter(doc => {
        // Status Filter
        if (filters.status !== '' && filters.status != null) {
            if (parseInt(doc.what) !== parseInt(filters.status)) return false;
        }

        // Associate Filter
        if (filters.associate !== '' && filters.associate != null) {
            if (String(doc.ts_associate) !== String(filters.associate)) return false;
        }

        // Document Type Filter
        if (filters.type !== '' && filters.type != null) {
            if (String(doc.tt_type || '') !== String(filters.type)) return false;
        }

        // Notification Filter
        if (filters.notification !== '' && filters.notification != null) {
            const hasNotification = Number(doc.notification) > 0;
            if (filters.notification === '1' && !hasNotification) return false;
            if (filters.notification === '0' && hasNotification) return false;
        }

        // Date Range Filter
        if (dateRange) {
            const docDate = doc.submission ? parseDate(doc.submission) : null;
            if (docDate) {
                if (dateRange.startDate) {
                    const start = new Date(dateRange.startDate);
                    start.setHours(0, 0, 0, 0);
                    if (docDate < start) return false;
                }
                if (dateRange.endDate) {
                    const end = new Date(dateRange.endDate);
                    end.setHours(23, 59, 59, 999);
                    if (docDate > end) return false;
                }
            }
        }

        return true;
    });
};

/**
 * Calcula dias úteis desde uma data (exclui sábados e domingos)
 */
export const getBusinessDaysSince = (dateStr) => {
  if (!dateStr) return { days: 0 };
  const startDate = parseDate(dateStr);
  if (!startDate) return { days: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);

  let businessDays = 0;
  const current = new Date(startDate);
  while (current <= today) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) businessDays++;
    current.setDate(current.getDate() + 1);
  }
  return { days: businessDays };
};

/**
 * Formata dias úteis em texto legível (anos, meses, dias)
 */
export const formatBusinessDays = (total) => {
  if (total <= 0) return '0 dias úteis';
  const anos = Math.floor(total / 252);
  const meses = Math.floor((total % 252) / 21);
  const dias = (total % 252) % 21;
  let r = '';
  if (anos > 0) r += `${anos} ano${anos > 1 ? 's' : ''}`;
  if (meses > 0) r += `${r ? ', ' : ''}${meses} mês${meses > 1 ? 'es' : ''}`;
  if (dias > 0) r += `${r ? ' e ' : ''}${dias} dia${dias !== 1 ? 's' : ''} úteis`;
  return r || '0 dias úteis';
};

/**
 * Determina prazo em dias úteis com base no tipo e urgência do documento
 */
export const getDocumentDeadline = (document) => {
  const tipo = document.tt_type?.toLowerCase() || '';
  if (tipo.includes('limpeza') && tipo.includes('fossa')) {
    return Number(document.urgency) === 1 ? 2 : 10;
  }
  if (tipo.includes('ramal') && tipo.includes('execução')) {
    return document.urgency ? 30 : 60;
  }
  return 60;
};

/**
 * Sort documents helper
 */
export const sortDocuments = (documents, sortConfig) => {
    if (!documents) return [];
    
    return [...documents].sort((a, b) => {
        const aValue = a[sortConfig.field];
        const bValue = b[sortConfig.field];
        
        if (sortConfig.direction === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
};
