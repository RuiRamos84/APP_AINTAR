import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDocuments } from '../services/documentService';

/**
 * Hook para gerir busca e filtragem de documentos com paginação
 */
export const useDocuments = (initialPage = 1, pageSize = 15) => {
    const [page, setPage] = useState(initialPage);
    const [filters, setFilters] = useState({ searchTerm: '' });
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // Debounce da pesquisa
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(filters.searchTerm);
            setPage(1); // Reset para primeira página
        }, 300); // Reduzir para 300ms

        return () => clearTimeout(handler);
    }, [filters.searchTerm]);

    const queryKey = ['documents', page, pageSize, debouncedSearchTerm];

    const { data, isLoading, isError, error, isFetching } = useQuery({
        queryKey,
        queryFn: () => getDocuments({ page, pageSize, searchTerm: debouncedSearchTerm }),
        placeholderData: (previousData) => previousData, // Substituir keepPreviousData
        staleTime: 1000 * 60 * 2, // 2 minutos
    });

    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    return {
        documents: data?.documents || [],
        totalPages: data?.totalPages || 1,
        totalCount: data?.totalCount || 0,
        isLoading,
        isError,
        error,
        page,
        setPage,
        filters,
        handleFilterChange,
        isFetching,
    };
};