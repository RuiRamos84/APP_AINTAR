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
        isFetching,
        isError,
        error,
        refetch
    } = useQuery({
        // A queryKey inclui os filtros para que os dados sejam cacheados separadamente
        queryKey: ['dashboardData', normalizedFilters],
        queryFn: () => getAllDashboardData(normalizedFilters),
        staleTime: Infinity,         // Dados nunca ficam obsoletos automaticamente.
        refetchOnWindowFocus: false, // Não atualiza ao voltar à janela.
        refetchOnMount: false,       // Não atualiza ao navegar de volta (usa cache existente).
    });

    return { dashboardData, isLoading, isFetching, isError, error, refetch };
};