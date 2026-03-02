import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import {
  getMaintenances,
  createMaintenance,
  updateMaintenance,
} from '../services/vehicleService';

export const MAINTENANCES_QUERY_KEY = ['vehicle-maintenances'];

export const useMaintenances = () => {
  const queryClient = useQueryClient();

  const maintenancesQuery = useQuery({
    queryKey: MAINTENANCES_QUERY_KEY,
    queryFn: async () => {
      const response = await getMaintenances();
      const rawData = response?.vehicle_maintenance || response?.data?.vehicle_maintenance || [];
      return rawData.map((m, idx) => ({ ...m, id: m.pk ?? idx }));
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (maintenancesQuery.isError) {
      toast.error(`Falha ao carregar manutenções: ${maintenancesQuery.error?.message}`);
    }
  }, [maintenancesQuery.isError, maintenancesQuery.error]);

  const createMutation = useMutation({
    mutationFn: createMaintenance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAINTENANCES_QUERY_KEY });
      toast.success('Registo de manutenção criado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao criar registo de manutenção: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateMaintenance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAINTENANCES_QUERY_KEY });
      toast.success('Registo de manutenção atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar registo de manutenção: ${error.message}`);
    },
  });

  return {
    maintenances: maintenancesQuery.data || [],
    isLoading: maintenancesQuery.isLoading,
    isError: maintenancesQuery.isError,

    addMaintenance: createMutation.mutateAsync,
    isAdding: createMutation.isPending,

    editMaintenance: updateMutation.mutateAsync,
    isEditing: updateMutation.isPending,
  };
};
