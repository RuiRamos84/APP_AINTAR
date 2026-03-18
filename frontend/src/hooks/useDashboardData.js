import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllDashboardData, clearDashboardCache } from '../services/dashboardService';

/**
 * Hook para buscar e gerir os dados do Dashboard principal.
 * Utiliza React Query para caching, re-fetching em background e gestão de estado.
 *
 * @param {Object} filters - Filtros para aplicar (year, month, etc.)
 * @returns {object} - O estado da query, incluindo `data`, `isLoading`, `error`, e `refetch`.
 */
export const useDashboardData = (filters = {}) => {
    const queryClient = useQueryClient();

    // Normalizar year para o formato esperado
    let normalizedFilters = { ...filters };

    // Se filters for um número (year), converter para objeto
    if (typeof filters === 'number' || typeof filters === 'string') {
        normalizedFilters = { year: filters };
    }

    const {
        data: dashboardData,
        isLoading,
        isFetching,
        isError,
        error,
        refetch
    } = useQuery({
        queryKey: ['dashboardData', normalizedFilters],
        queryFn: () => getAllDashboardData(normalizedFilters),
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    const forceRefetch = async () => {
        await clearDashboardCache();
        queryClient.removeQueries({ queryKey: ['dashboardData'] });
        return refetch();
    };

    return { dashboardData, isLoading, isFetching, isError, error, refetch, forceRefetch };
};