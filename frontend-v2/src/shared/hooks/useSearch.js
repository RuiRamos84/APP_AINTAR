import { useDeferredValue, useMemo, useRef } from 'react';

/**
 * Pesquisa dinâmica em todos os campos primitivos de um array de objetos.
 * Não requer enumeração de colunas — funciona automaticamente com qualquer schema.
 * Inclui useDeferredValue internamente para não bloquear o render em cada tecla.
 *
 * @param {Array} data - Array de objetos a pesquisar
 * @param {string} searchTerm - Termo de pesquisa (case-insensitive)
 * @param {Object} [options]
 * @param {Function} [options.extraText] - fn(item) => string — texto adicional a incluir
 *   na pesquisa para campos que precisam de resolução (ex: ID numérico → label legível).
 *   Pode ser definida inline sem necessidade de useMemo/useCallback.
 * @param {string[]} [options.exclude] - Chaves a excluir da pesquisa automática
 * @returns {Array} Resultados filtrados
 *
 * @example — uso básico
 * const results = useSearch(entities, searchTerm);
 *
 * @example — com resolução de label
 * const results = useSearch(documents, searchTerm, {
 *   extraText: (doc) => getStatusLabel(doc.what, metaData),
 * });
 *
 * @example — com campos excluídos
 * const results = useSearch(items, searchTerm, {
 *   exclude: ['pk', 'notification'],
 * });
 */
export function useSearch(data, searchTerm, { extraText, exclude } = {}) {
    const deferred = useDeferredValue(searchTerm);

    // Refs permitem funções/arrays inline sem forçar recomputação do memo
    const extraTextRef = useRef(extraText);
    extraTextRef.current = extraText;
    const excludeRef = useRef(exclude);
    excludeRef.current = exclude;

    return useMemo(() => {
        if (!Array.isArray(data)) return [];
        const s = deferred?.trim().toLowerCase();
        if (!s) return data;

        const excludeSet = new Set(excludeRef.current || []);

        return data.filter(item => {
            // Texto extra (ex: label de estado resolvido a partir de ID numérico)
            const extra = extraTextRef.current?.(item);
            if (extra && String(extra).toLowerCase().includes(s)) return true;

            // Pesquisa dinâmica — todos os campos primitivos sem enumeração manual
            return Object.entries(item).some(([key, val]) => {
                if (excludeSet.has(key)) return false;
                if (val === null || val === undefined || val === '' || typeof val === 'boolean' || typeof val === 'object') return false;
                return String(val).toLowerCase().includes(s);
            });
        });
    }, [data, deferred]); // eslint-disable-line react-hooks/exhaustive-deps
}
