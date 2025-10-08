/**
 * METADATA MAPPER
 *
 * Helpers para mapear PKs para nomes usando os metadados carregados no MetaDataContext.
 * As views agora retornam TANTO PKs (pk_*) quanto nomes (tt_*, tb_*, ts_*).
 *
 * Uso:
 * - Se a view já retorna o nome → usar direto
 * - Se precisar de lookup adicional → usar estas funções
 */

/**
 * Busca valor nos metadados por PK
 * @param {Array} metadata - Array de metadados [{pk, value}, ...]
 * @param {number} pk - PK a buscar
 * @returns {string|null} - Valor encontrado ou null
 */
export const findValueByPk = (metadata, pk) => {
  if (!metadata || !Array.isArray(metadata)) return null;
  const item = metadata.find(m => m.pk === pk);
  return item?.value || item?.name || null;
};

/**
 * Busca PK nos metadados por valor (reverso)
 * @param {Array} metadata - Array de metadados
 * @param {string} value - Valor a buscar
 * @returns {number|null} - PK encontrado ou null
 */
export const findPkByValue = (metadata, value) => {
  if (!metadata || !Array.isArray(metadata)) return null;
  const item = metadata.find(m => m.value === value || m.name === value);
  return item?.pk || null;
};

/**
 * Mapeia múltiplos PKs para valores
 * @param {Array} metadata - Array de metadados
 * @param {Array<number>} pks - Array de PKs
 * @returns {Array<string>} - Array de valores
 */
export const mapPksToValues = (metadata, pks) => {
  if (!metadata || !pks) return [];
  return pks.map(pk => findValueByPk(metadata, pk)).filter(Boolean);
};

/**
 * MAPPERS ESPECÍFICOS PARA OPERAÇÕES
 */

/**
 * Mapeia pk_operacaomodo para nome
 * @param {Object} metaData - Objeto de metadados completo
 * @param {number} pk - PK do modo
 * @returns {string} - Nome do modo ou string vazia
 */
export const getModoNome = (metaData, pk) => {
  return findValueByPk(metaData?.operacamodo, pk) || '';
};

/**
 * Mapeia pk_operacaodia para nome
 * @param {Object} metaData - Objeto de metadados completo
 * @param {number} pk - PK do dia
 * @returns {string} - Nome do dia ou string vazia
 */
export const getDiaNome = (metaData, pk) => {
  return findValueByPk(metaData?.operacaodia, pk) || '';
};

/**
 * Mapeia pk_operacaoaccao para nome
 * @param {Object} metaData - Objeto de metadados completo
 * @param {number} pk - PK da ação
 * @returns {string} - Nome da ação ou string vazia
 */
export const getAccaoNome = (metaData, pk) => {
  return findValueByPk(metaData?.operacaoaccao, pk) || '';
};

/**
 * ENRICHER - Adiciona nomes aos objetos baseado em PKs
 *
 * Útil quando a view retorna apenas PKs e você quer adicionar nomes
 * para exibição no frontend.
 *
 * @param {Object} operacao - Objeto de operação com PKs
 * @param {Object} metaData - Objeto de metadados completo
 * @returns {Object} - Operação com nomes adicionados
 */
export const enrichOperacaoWithNames = (operacao, metaData) => {
  if (!operacao || !metaData) return operacao;

  return {
    ...operacao,
    // Adicionar nomes se não existirem
    tt_operacaomodo: operacao.tt_operacaomodo || getModoNome(metaData, operacao.pk_operacaomodo),
    tt_operacaodia: operacao.tt_operacaodia || getDiaNome(metaData, operacao.pk_operacaodia),
    tt_operacaoaccao: operacao.tt_operacaoaccao || getAccaoNome(metaData, operacao.pk_operacaoaccao),
  };
};

/**
 * BATCH ENRICHER - Adiciona nomes a array de operações
 *
 * @param {Array<Object>} operacoes - Array de operações
 * @param {Object} metaData - Objeto de metadados completo
 * @returns {Array<Object>} - Operações com nomes adicionados
 */
export const enrichOperacoesWithNames = (operacoes, metaData) => {
  if (!operacoes || !Array.isArray(operacoes)) return [];
  return operacoes.map(op => enrichOperacaoWithNames(op, metaData));
};

/**
 * VALIDATOR - Verifica se operação tem dados completos
 *
 * @param {Object} operacao - Objeto de operação
 * @returns {Object} - { valid: boolean, missing: string[] }
 */
export const validateOperacaoData = (operacao) => {
  const missing = [];

  if (!operacao.pk) missing.push('pk');
  if (!operacao.data) missing.push('data');
  if (!operacao.pk_operacaomodo && !operacao.tt_operacaomodo) missing.push('modo');
  if (!operacao.pk_instalacao && !operacao.tb_instalacao) missing.push('instalacao');
  if (!operacao.pk_operacaoaccao && !operacao.tt_operacaoaccao) missing.push('accao');

  return {
    valid: missing.length === 0,
    missing
  };
};

/**
 * FORMATTER - Formata operação para exibição
 *
 * @param {Object} operacao - Objeto de operação (deve ter nomes já resolvidos)
 * @returns {Object} - Objeto formatado para exibição
 */
export const formatOperacaoForDisplay = (operacao) => {
  if (!operacao) return null;

  // Extrair tipo de instalação do nome (ex: "Tábua (ETAR)")
  const instalacaoNome = operacao.tb_instalacao || '';
  const instalacaoTipo = instalacaoNome.includes('(ETAR)') ? 'ETAR' :
                         instalacaoNome.includes('(EE)') ? 'EE' : 'N/A';
  const location = instalacaoNome.replace(' (ETAR)', '').replace(' (EE)', '');

  return {
    id: operacao.pk,
    data: operacao.data,
    modo: operacao.tt_operacaomodo,
    instalacao: instalacaoNome,
    instalacaoTipo,
    location,
    accao: operacao.tt_operacaoaccao,
    tipo: operacao.tt_operacaoaccao_type,
    valuetext: operacao.valuetext,
    valuenumb: operacao.valuenumb,
    completed: Boolean(operacao.valuetext || operacao.valuenumb),
    // Manter PKs para edição
    pk_operacaomodo: operacao.pk_operacaomodo,
    pk_instalacao: operacao.pk_instalacao,
    pk_operacaoaccao: operacao.pk_operacaoaccao
  };
};

/**
 * BATCH FORMATTER
 *
 * @param {Array<Object>} operacoes - Array de operações
 * @returns {Array<Object>} - Operações formatadas
 */
export const formatOperacoesForDisplay = (operacoes) => {
  if (!operacoes || !Array.isArray(operacoes)) return [];
  return operacoes.map(formatOperacaoForDisplay).filter(Boolean);
};

export default {
  findValueByPk,
  findPkByValue,
  mapPksToValues,
  getModoNome,
  getDiaNome,
  getAccaoNome,
  enrichOperacaoWithNames,
  enrichOperacoesWithNames,
  validateOperacaoData,
  formatOperacaoForDisplay,
  formatOperacoesForDisplay
};
