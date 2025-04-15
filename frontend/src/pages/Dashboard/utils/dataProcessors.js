import { DATA_THRESHOLDS } from '../constants';

/**
 * Simplifica dados para gráfico de pizza mostrando apenas os N maiores valores
 * e agrupando o restante como "Outros"
 * 
 * @param {Array} data - Dados originais
 * @param {number} maxItems - Número máximo de itens a mostrar individualmente
 * @returns {Array} Dados simplificados
 */
export const simplifyPieChartData = (data, maxItems = DATA_THRESHOLDS.PIE_CHART) => {
  if (!data || data.length <= maxItems) {
    return data;
  }

  // Ordenar por valor (decrescente)
  const sortedData = [...data].sort((a, b) => (b.val || 0) - (a.val || 0));

  // Pegar os N maiores
  const topItems = sortedData.slice(0, maxItems);

  // Agregar os restantes
  const otherItems = sortedData.slice(maxItems);
  const otherValue = otherItems.reduce((sum, item) => sum + (item.val || 0), 0);

  if (otherValue > 0) {
    topItems.push({
      par: "Outros",
      val: otherValue
    });
  }

  return topItems;
};

/**
 * Simplifica dados para gráfico de barras mostrando apenas os N maiores valores
 * 
 * @param {Array} data - Dados originais
 * @param {number} maxItems - Número máximo de itens a mostrar
 * @returns {Array} Dados simplificados
 */
export const simplifyBarChartData = (data, maxItems = DATA_THRESHOLDS.BAR_CHART) => {
  if (!data || data.length <= maxItems) {
    return data;
  }

  // Ordenar por valor (decrescente)
  return [...data]
    .sort((a, b) => (b.val || b.val1 || 0) - (a.val || a.val1 || 0))
    .slice(0, maxItems);
};

/**
 * Simplifica dados para gráfico de barras complexo filtrando por tipos e concelhos
 * 
 * @param {Array} data - Dados originais
 * @param {number} maxTypes - Número máximo de tipos a mostrar
 * @param {number} maxConcelhos - Número máximo de concelhos a mostrar
 * @returns {Array} Dados simplificados
 */
export const simplifyComplexBarChartData = (data, maxTypes = DATA_THRESHOLDS.MAX_TYPES, maxConcelhos = DATA_THRESHOLDS.MAX_CONCELHOS) => {
  if (!data || data.length === 0) {
    return data;
  }

  // Agregar valores por concelho e tipo
  const concelhoMap = new Map();
  const tipoMap = new Map();

  data.forEach(item => {
    // Contar ocorrências de concelhos
    const concelho = item.par1 || '';
    concelhoMap.set(concelho, (concelhoMap.get(concelho) || 0) + (item.val || 0));

    // Contar ocorrências de tipos
    const tipo = item.par2 || '';
    tipoMap.set(tipo, (tipoMap.get(tipo) || 0) + (item.val || 0));
  });

  // Obter os top concelhos
  const topConcelhos = new Set(
    [...concelhoMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxConcelhos)
      .map(entry => entry[0])
  );

  // Obter os top tipos
  const topTipos = new Set(
    [...tipoMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTypes)
      .map(entry => entry[0])
  );

  // Filtrar dados para incluir apenas os top concelhos e tipos
  return data.filter(item =>
    topConcelhos.has(item.par1 || '') &&
    topTipos.has(item.par2 || '')
  );
};

/**
 * Simplifica dados para gráficos de linhas múltiplas
 * 
 * @param {Array} data - Dados originais
 * @param {number} maxLines - Número máximo de linhas a mostrar
 * @returns {Array} Dados simplificados
 */
export const simplifyMultiLineData = (data, maxLines = DATA_THRESHOLDS.LINE_CHART) => {
  if (!data || data.length <= maxLines) {
    return data;
  }

  // Para multiline, ordenar por valor médio
  const getAvgValue = (item) => {
    const values = [item.val1, item.val2, item.val3, item.val4].filter(v => v !== undefined);
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  return [...data]
    .sort((a, b) => getAvgValue(b) - getAvgValue(a))
    .slice(0, maxLines);
};

/**
 * Prepara dados para visualização TreeMap
 * 
 * @param {Array} data - Dados originais
 * @returns {Array} Dados formatados para TreeMap
 */
export const prepareTreemapData = (data) => {
  if (!data || data.length === 0) {
    return [];
  }

  return data.map(item => ({
    name: item.par || item.par1 || '',
    value: item.val || item.val1 || 0
  }));
};

/**
 * Prepara dados para visualização de Radar
 * 
 * @param {Array} data - Dados originais
 * @returns {Array} Dados formatados para Radar
 */
export const prepareRadarChartData = (data) => {
  if (!data || data.length === 0) {
    return [];
  }

  return data.map(item => ({
    subject: item.par || '',
    val: item.val || 0,
    val1: item.val1 || 0,
    val2: item.val2 || 0,
    val3: item.val3 || 0,
    val4: item.val4 || 0
  }));
};

/**
 * Filtra dados por categoria
 * 
 * @param {Array} data - Dados originais
 * @param {string} categoryField - Campo de categoria
 * @param {string} value - Valor para filtrar
 * @returns {Array} Dados filtrados
 */
export const filterDataByCategory = (data, categoryField, value) => {
  if (!data || data.length === 0 || !value) {
    return data;
  }

  return data.filter(item => item[categoryField] === value);
};