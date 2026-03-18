import { useState, useMemo } from 'react';

/**
 * Hook reutilizável para ordenação de tabelas.
 * @param {Array} data - array de objetos a ordenar
 * @param {string} initialKey - coluna inicial ('' = sem ordem)
 * @param {'asc'|'desc'} initialDir - direção inicial
 */
export const useSortable = (data, initialKey = '', initialDir = 'asc') => {
    const [sortKey, setSortKey] = useState(initialKey);
    const [sortDir, setSortDir] = useState(initialDir);

    const sorted = useMemo(() => {
        if (!sortKey || !data?.length) return data || [];
        return [...data].sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            const cmp = typeof av === 'string'
                ? av.localeCompare(bv, 'pt', { sensitivity: 'base' })
                : Number(av) - Number(bv);
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [data, sortKey, sortDir]);

    const requestSort = (key) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    return { sorted, sortKey, sortDir, requestSort };
};
