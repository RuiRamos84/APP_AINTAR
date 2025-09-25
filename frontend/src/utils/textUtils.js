/**
 * Função para normalizar texto removendo acentos e convertendo para minúsculas
 * @param {string} text - Texto a ser normalizado
 * @returns {string} - Texto normalizado (sem acentos e em minúsculas)
 */
export const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Hook personalizado para pesquisa normalizada em arrays
 * @param {Array} items - Array de itens para pesquisar
 * @param {string} searchTerm - Termo de pesquisa
 * @param {Array|Function} searchFields - Campos para pesquisar ou função personalizada
 * @returns {Array} - Array filtrado
 */
export const useNormalizedSearch = (items, searchTerm, searchFields) => {
    if (!searchTerm?.trim()) return items;

    const normalizedSearch = normalizeText(searchTerm.trim());

    return items.filter(item => {
        if (typeof searchFields === 'function') {
            return searchFields(item, normalizedSearch);
        }

        return searchFields.some(field => {
            const value = item[field];
            if (!value) return false;
            return normalizeText(String(value)).includes(normalizedSearch);
        });
    });
};