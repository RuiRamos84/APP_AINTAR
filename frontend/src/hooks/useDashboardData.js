import { useQuery } from '@tanstack/react-query';
import { getAllDashboardData } from '../services/dashboardService';

/**
 * Hook para buscar e gerir os dados do Dashboard principal.
 * Utiliza React Query para caching, re-fetching em background e gestão de estado.
 *
 * @param {Object} filters - Filtros para aplicar (year, month, etc.)
 * @returns {object} - O estado da query, incluindo `data`, `isLoading`, `error`, e `refetch`.
 */
export const useDashboardData = (filters = {}) => {
    // Normalizar year para o formato esperado
    let normalizedFilters = { ...filters };

    // Se filters for um número (year), converter para objeto
    if (typeof filters === 'number' || typeof filters === 'string') {
        normalizedFilters = { year: filters };
    }

    const {
        data: dashboardData,
        isLoading,
        isError,
        error,
        refetch
    } = useQuery({
        // A queryKey inclui os filtros para que os dados sejam cacheados separadamente
        queryKey: ['dashboardData', normalizedFilters],
        queryFn: () => getAllDashboardData(normalizedFilters),
        staleTime: 1000 * 60 * 15, // Considerar os dados "frescos" por 15 minutos.
        refetchOnWindowFocus: true, // Atualiza os dados quando o utilizador volta à janela.
    });

    return { dashboardData, isLoading, isError, error, refetch };
};