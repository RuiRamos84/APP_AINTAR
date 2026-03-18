import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLandingData, clearDashboardCache } from '../services/dashboardService';

export const useLandingData = () => {
    const queryClient = useQueryClient();

    const {
        data: landingData,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ['dashboardLanding'],
        queryFn: getLandingData,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    const forceRefetch = async () => {
        await clearDashboardCache();
        queryClient.removeQueries({ queryKey: ['dashboardLanding'] });
        return refetch();
    };

    return { landingData, isLoading, isFetching, isError, error, refetch, forceRefetch };
};
