import { useQuery } from '@tanstack/react-query';
import { getAllDashboardData } from '../services/dashboardService';

/**
 * Hook para buscar e gerir os dados do Dashboard principal.
 * Utiliza React Query para caching, re-fetching em background e gestão de estado.
 *
 * @param {number|null} year - O ano para o qual filtrar os dados.
 * @returns {object} - O estado da query, incluindo `data`, `isLoading`, `error`, e `refetch`.
 */
export const useDashboardData = (year = null) => {
    const {
        data: dashboardData,
        isLoading,
        isError,
        error,
        refetch
    } = useQuery({
        // A queryKey inclui o ano para que os dados de cada ano sejam cacheados separadamente.
        queryKey: ['dashboardData', year],
        queryFn: () => getAllDashboardData(year),
        staleTime: 1000 * 60 * 15, // Considerar os dados "frescos" por 15 minutos.
        refetchOnWindowFocus: true, // Atualiza os dados quando o utilizador volta à janela.
    });

    return { dashboardData, isLoading, isError, error, refetch };
};