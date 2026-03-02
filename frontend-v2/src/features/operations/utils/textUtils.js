/**
 * UTILIDADES PARA MANIPULAÇÃO DE TEXTO
 *
 * Funções para normalização, pesquisa e formatação de texto
 * com suporte completo para caracteres especiais e acentos portugueses
 */

/**
 * Normaliza texto removendo acentos e caracteres especiais
 * @param {string} text
 * @returns {string}
 * @example normalizeText('Operação') // 'operacao'
 */
export const normalizeText = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .trim();
};

/**
 * Verifica se um texto contém outro (case-insensitive, accent-insensitive)
 * @param {string} text
 * @param {string} searchTerm
 * @returns {boolean}
 * @example textIncludes('Operação', 'operacao') // true
 */
export const textIncludes = (text, searchTerm) => {
    if (!text || !searchTerm) return false;
    return normalizeText(text).includes(normalizeText(searchTerm));
};

/**
 * Filtra array de objetos por texto em múltiplos campos
 * @param {Array} items
 * @param {string} searchTerm
 * @param {Array<string>} fields
 * @returns {Array}
 */
export const filterByText = (items, searchTerm, fields) => {
    if (!searchTerm || !items || items.length === 0) return items;
    const normalizedSearch = normalizeText(searchTerm);
    return items.filter(item =>
        fields.some(field => {
            const value = item[field];
            if (!value) return false;
            return normalizeText(String(value)).includes(normalizedSearch);
        })
    );
};

/**
 * Compara dois textos ignorando acentos e case
 */
export const textEquals = (text1, text2) =>
    normalizeText(text1) === normalizeText(text2);

/**
 * Ordena array de strings ignorando acentos
 */
export const sortIgnoringAccents = (array, ascending = true) =>
    [...array].sort((a, b) => {
        const normalA = normalizeText(a);
        const normalB = normalizeText(b);
        return ascending ? normalA.localeCompare(normalB) : normalB.localeCompare(normalA);
    });

/**
 * Remove duplicados de array de strings ignorando acentos
 */
export const removeDuplicatesIgnoringAccents = (array) => {
    const seen = new Set();
    return array.filter(item => {
        const normalized = normalizeText(item);
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    });
};
