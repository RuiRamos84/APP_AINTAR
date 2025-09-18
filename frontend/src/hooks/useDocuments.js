import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDocuments } from '../services/documentService';

/**
 * Hook para gerir a busca e filtragem de documentos com paginação.
 */
export const useDocuments = (initialPage = 1, pageSize = 15) => {
    const [page, setPage] = useState(initialPage);
    const [filters, setFilters] = useState({ searchTerm: '' });
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // Efeito para debounce da pesquisa
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(filters.searchTerm);
            setPage(1); // Resetar para a primeira página ao pesquisar
        }, 500); // 500ms de delay

        return () => {
            clearTimeout(handler);
        };
    }, [filters.searchTerm]);

    const queryKey = ['documents', page, debouncedSearchTerm]; // A queryKey agora inclui a página e o termo de pesquisa

    const { data, isLoading, isError, error, isPreviousData } = useQuery({
        queryKey,
        queryFn: () => getDocuments({ page, pageSize, searchTerm: debouncedSearchTerm }),
        keepPreviousData: true, // Essencial para uma boa experiência de paginação
        staleTime: 1000 * 60 * 2, // Cache de 2 minutos
    });

    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    return {
        documents: data?.documents || [],
        totalPages: data?.totalPages || 1,
        isLoading,
        isError,
        error,
        page,
        setPage,
        filters,
        handleFilterChange,
        isFetching: isPreviousData, // Para mostrar um indicador de loading subtil
    };
};