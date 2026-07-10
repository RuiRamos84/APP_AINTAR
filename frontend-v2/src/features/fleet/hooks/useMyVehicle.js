import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import notification from '@/core/services/notification';
import { getMyVehicle, reportBreakdown } from '../services/vehicleService';
import { VEHICLES_QUERY_KEY } from './useVehicles';

export const MY_VEHICLE_QUERY_KEY = ['my-vehicle'];

export const useMyVehicle = () => {
  const queryClient = useQueryClient();

  const myVehicleQuery = useQuery({
    queryKey: MY_VEHICLE_QUERY_KEY,
    queryFn: async () => {
      const response = await getMyVehicle();
      return response?.data || response || { source: null, vehicle: null };
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (myVehicleQuery.isError) {
      notification.error(`Falha ao carregar a viatura atual: ${myVehicleQuery.error?.message}`);
    }
  }, [myVehicleQuery.isError, myVehicleQuery.error]);

  const reportMutation = useMutation({
    mutationFn: reportBreakdown,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_VEHICLE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
      notification.success('Avaria reportada com sucesso.');
    },
    onError: (error) => notification.apiError(error, 'Erro ao reportar avaria.'),
  });

  return {
    source: myVehicleQuery.data?.source ?? null,
    vehicle: myVehicleQuery.data?.vehicle ?? null,
    isLoading: myVehicleQuery.isLoading,
    isError: myVehicleQuery.isError,

    reportIssue: reportMutation.mutateAsync,
    isReporting: reportMutation.isPending,
  };
};
