// hooks/useNormalizedSearch.js
import { useMemo } from 'react';
import { normalizeText } from '../utils/textUtils';

export const useNormalizedSearch = (items, searchTerm, searchFields) => {
    return useMemo(() => {
        if (!searchTerm?.trim()) return items;

        const normalizedSearch = normalizeText(searchTerm.trim());

        return items.filter(item => {
            return searchFields.some(field => {
                const value = item[field];
                if (!value) return false;
                return normalizeText(String(value)).includes(normalizedSearch);
            });
        });
    }, [items, searchTerm, searchFields]);
};