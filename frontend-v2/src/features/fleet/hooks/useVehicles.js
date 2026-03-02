import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import {
  getVehicles,
  createVehicle,
  updateVehicle,
} from '../services/vehicleService';

export const VEHICLES_QUERY_KEY = ['vehicles'];

export const useVehicles = () => {
  const queryClient = useQueryClient();

  const vehiclesQuery = useQuery({
    queryKey: VEHICLES_QUERY_KEY,
    queryFn: async () => {
      const response = await getVehicles();
      const rawData = response?.vehicle || response?.data?.vehicle || [];
return rawData.map(v => ({ ...v, id: v.pk }));
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // onError foi removido do useQuery no React Query v5 — usar useEffect
  useEffect(() => {
    if (vehiclesQuery.isError) {
      toast.error(`Falha ao carregar veículos: ${vehiclesQuery.error?.message}`);
    }
  }, [vehiclesQuery.isError, vehiclesQuery.error]);

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
      toast.success('Veículo registado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao registar veículo: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
      toast.success('Veículo atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar veículo: ${error.message}`);
    },
  });

  return {
    vehicles: vehiclesQuery.data || [],
    isLoading: vehiclesQuery.isLoading,
    isError: vehiclesQuery.isError,
    error: vehiclesQuery.error,

    addVehicle: createMutation.mutateAsync,
    isAdding: createMutation.isPending,

    editVehicle: updateMutation.mutateAsync,
    isEditing: updateMutation.isPending,
  };
};
