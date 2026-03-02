import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import {
  getVehicleAssignments,
  createAssignment,
  updateAssignment,
} from '../services/vehicleService';

export const ASSIGNMENTS_QUERY_KEY = ['vehicle-assignments'];

export const useAssignments = () => {
  const queryClient = useQueryClient();

  const assignmentsQuery = useQuery({
    queryKey: ASSIGNMENTS_QUERY_KEY,
    queryFn: async () => {
      const response = await getVehicleAssignments();
      const rawData = response?.vehicle_assign || response?.data?.vehicle_assign || [];
      return rawData.map((a, idx) => ({ ...a, id: a.pk ?? idx }));
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (assignmentsQuery.isError) {
      toast.error(`Falha ao carregar atribuições: ${assignmentsQuery.error?.message}`);
    }
  }, [assignmentsQuery.isError, assignmentsQuery.error]);

  const createMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_QUERY_KEY });
      toast.success('Veículo atribuído com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atribuir veículo: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_QUERY_KEY });
      toast.success('Atribuição atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar atribuição: ${error.message}`);
    },
  });

  return {
    assignments: assignmentsQuery.data || [],
    isLoading: assignmentsQuery.isLoading,
    isError: assignmentsQuery.isError,

    assignVehicle: createMutation.mutateAsync,
    isAssigning: createMutation.isPending,

    updateAssignment: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
