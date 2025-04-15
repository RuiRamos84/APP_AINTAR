import { VIEW_MAP } from '../constants';

/**
 * Obtém o título de uma view com base nos metadados
 * 
 * @param {Object} metaData - Metadados da aplicação
 * @param {string} viewName - Nome da view
 * @returns {string} Título da view
 */
export const getViewTitle = (metaData, viewName) => {
  if (!metaData || !metaData.views) {
    // Fallback para títulos padrão se os metadados não estiverem disponíveis
    return getDefaultViewTitle(viewName);
  }

  const viewId = VIEW_MAP[viewName];
  const view = metaData.views.find(v => v.pk === viewId);

  if (view) {
    return view.name || getDefaultViewTitle(viewName);
  }

  return getDefaultViewTitle(viewName);
};

/**
 * Obtém um título padrão para a view
 * 
 * @param {string} viewName - Nome da view
 * @returns {string} Título padrão
 */
const getDefaultViewTitle = (viewName) => {
  switch (viewName) {
    case 'vbr_document_001':
      return 'Pedidos por Tipo';
    case 'vbr_document_002':
      return 'Pedidos por Concelho';
    case 'vbr_document_003':
      return 'Pedidos por Concelho e Tipo';
    case 'vbr_document_004':
      return 'Pedidos por Estado Corrente';
    case 'vbr_document_005':
      return 'Evolução de Estado dos Pedidos';
    case 'vbr_document_006':
      return 'Distribuição por Técnico';
    case 'vbr_document_007':
      return 'Desempenho por Técnico';
    case 'vbr_document_008':
      return 'Tempo Médio de Resposta (Fechados)';
    case 'vbr_document_009':
      return 'Tempo Médio de Resposta (Todos)';
    default:
      return 'Visualização';
  }
};

/**
 * Obtém os dados de uma view específica
 * 
 * @param {Object} dashboardData - Dados do dashboard
 * @param {string} viewName - Nome da view
 * @returns {Array} Dados da view
 */
export const getChartData = (dashboardData, viewName) => {
  if (!dashboardData || !viewName) {
    return [];
  }

  return dashboardData[viewName] || [];
};

/**
 * Calcula métricas resumidas para o dashboard
 * 
 * @param {Object} dashboardData - Dados do dashboard
 * @returns {Object} Métricas calculadas
 */
export const calculateSummaryMetrics = (dashboardData) => {
  if (!dashboardData) {
    return {
      totalRequests: 0,
      avgResponseTime: 0,
      mostCommonType: 'N/A',
      mostActiveCity: 'N/A'
    };
  }

  // Total de pedidos (a partir dos dados de tipos)
  const typeData = dashboardData.vbr_document_001 || [];
  const totalRequests = typeData.reduce((sum, item) => sum + (item.val || 0), 0);

  // Tempo médio de resposta (a partir dos dados de tempo médio)
  const timeData = dashboardData.vbr_document_008 || [];
  let avgResponseTime = 0;
  if (timeData.length > 0) {
    const totalTime = timeData.reduce((sum, item) => sum + ((item.val4 || 0) * (item.val1 || 1)), 0);
    const totalItems = timeData.reduce((sum, item) => sum + (item.val1 || 1), 0);
    avgResponseTime = totalItems > 0 ? totalTime / totalItems : 0;
  }

  // Tipo mais comum (a partir dos dados de tipos)
  let mostCommonType = 'N/A';
  if (typeData.length > 0) {
    mostCommonType = typeData.reduce((prev, current) =>
      (current.val || 0) > (prev.val || 0) ? current : prev
    ).par || 'N/A';
  }

  // Concelho mais ativo (a partir dos dados de concelhos)
  const cityData = dashboardData.vbr_document_002 || [];
  let mostActiveCity = 'N/A';
  if (cityData.length > 0) {
    mostActiveCity = cityData.reduce((prev, current) =>
      (current.val || 0) > (prev.val || 0) ? current : prev
    ).par || 'N/A';
  }

  return {
    totalRequests,
    avgResponseTime,
    mostCommonType,
    mostActiveCity
  };
};