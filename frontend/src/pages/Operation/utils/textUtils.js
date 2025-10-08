/**
 * UTILIDADES PARA MANIPULAÇÃO DE TEXTO
 *
 * Funções para normalização, pesquisa e formatação de texto
 * com suporte completo para caracteres especiais e acentos portugueses
 */

/**
 * Normaliza texto removendo acentos e caracteres especiais
 * Mantém apenas letras, números e espaços
 *
 * @param {string} text - Texto a normalizar
 * @returns {string} - Texto normalizado
 *
 * @example
 * normalizeText('Operação') // 'operacao'
 * normalizeText('São João') // 'sao joao'
 * normalizeText('Criação/Edição') // 'criacaoedicao'
 */
export const normalizeText = (text) => {
  if (!text || typeof text !== 'string') return '';

  return text
    .toLowerCase()
    .normalize('NFD') // Decompõe caracteres com acentos (á -> a + ´)
    .replace(/[\u0300-\u036f]/g, '') // Remove marcas de acento
    .replace(/[^\w\s]/g, '') // Remove caracteres especiais (mantém letras, números, espaços)
    .trim();
};

/**
 * Verifica se um texto contém outro (case-insensitive, accent-insensitive)
 *
 * @param {string} text - Texto onde pesquisar
 * @param {string} searchTerm - Termo a pesquisar
 * @returns {boolean} - true se encontrou
 *
 * @example
 * textIncludes('Operação', 'operacao') // true
 * textIncludes('São João', 'sao joao') // true
 * textIncludes('Manutenção', 'manutencao') // true
 */
export const textIncludes = (text, searchTerm) => {
  if (!text || !searchTerm) return false;
  return normalizeText(text).includes(normalizeText(searchTerm));
};

/**
 * Filtra array de objetos por texto em múltiplos campos
 *
 * @param {Array} items - Array de objetos a filtrar
 * @param {string} searchTerm - Termo de pesquisa
 * @param {Array<string>} fields - Campos do objeto onde pesquisar
 * @returns {Array} - Array filtrado
 *
 * @example
 * const items = [
 *   { nome: 'João', local: 'Coimbra' },
 *   { nome: 'Maria', local: 'São Paulo' }
 * ];
 * filterByText(items, 'joao', ['nome', 'local'])
 * // [{ nome: 'João', local: 'Coimbra' }]
 */
export const filterByText = (items, searchTerm, fields) => {
  if (!searchTerm || !items || items.length === 0) return items;

  const normalizedSearch = normalizeText(searchTerm);

  return items.filter(item => {
    return fields.some(field => {
      const value = item[field];
      if (!value) return false;
      return normalizeText(String(value)).includes(normalizedSearch);
    });
  });
};

/**
 * Destaca (highlight) termo de pesquisa em texto
 *
 * @param {string} text - Texto original
 * @param {string} searchTerm - Termo a destacar
 * @returns {string} - Texto com <mark> tags
 *
 * @example
 * highlightText('Operação de Manutenção', 'manutencao')
 * // 'Operação de <mark>Manutenção</mark>'
 */
export const highlightText = (text, searchTerm) => {
  if (!text || !searchTerm) return text;

  const normalized = normalizeText(searchTerm);
  const regex = new RegExp(`(${normalized.split('').join('\\W*')})`, 'gi');

  return text.replace(regex, '<mark>$1</mark>');
};

/**
 * Compara dois textos ignorando acentos e case
 *
 * @param {string} text1
 * @param {string} text2
 * @returns {boolean}
 */
export const textEquals = (text1, text2) => {
  return normalizeText(text1) === normalizeText(text2);
};

/**
 * Ordena array de strings ignorando acentos
 *
 * @param {Array<string>} array
 * @param {boolean} ascending - true = A-Z, false = Z-A
 * @returns {Array<string>}
 */
export const sortIgnoringAccents = (array, ascending = true) => {
  return [...array].sort((a, b) => {
    const normalA = normalizeText(a);
    const normalB = normalizeText(b);

    if (ascending) {
      return normalA.localeCompare(normalB);
    } else {
      return normalB.localeCompare(normalA);
    }
  });
};

/**
 * Remove duplicados de array de strings ignorando acentos
 *
 * @param {Array<string>} array
 * @returns {Array<string>}
 *
 * @example
 * removeDuplicatesIgnoringAccents(['São Paulo', 'Sao Paulo', 'Coimbra'])
 * // ['São Paulo', 'Coimbra'] (mantém primeira ocorrência)
 */
export const removeDuplicatesIgnoringAccents = (array) => {
  const seen = new Set();
  return array.filter(item => {
    const normalized = normalizeText(item);
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
};
