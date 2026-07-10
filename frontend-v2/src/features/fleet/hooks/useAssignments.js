import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import notification from '@/core/services/notification';
import {
  getVehicleAssignments,
  createAssignment,
  updateAssignment,
  endVehicleAssign,
} from '../services/vehicleService';
import { VEHICLES_QUERY_KEY } from './useVehicles';
import { MY_VEHICLE_QUERY_KEY } from './useMyVehicle';

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
      notification.error(`Falha ao carregar atribuições: ${assignmentsQuery.error?.message}`);
    }
  }, [assignmentsQuery.isError, assignmentsQuery.error]);

  const createMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      // Uma nova atribuição muda vbl_vehicle.current_assignee (AvailabilityStrip/
      // dropdown de reservas) e pode fazer aparecer a tab "A Minha Viatura" para
      // quem acabou de ser atribuído — sem isto só aparecia depois de F5 manual.
      queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_VEHICLE_QUERY_KEY });
      notification.success('Veículo atribuído com sucesso!');
    },
    onError: (error) => {
      notification.error(`Erro ao atribuir veículo: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_QUERY_KEY });
      notification.success('Atribuição atualizada com sucesso!');
    },
    onError: (error) => {
      notification.error(`Erro ao atualizar atribuição: ${error.message}`);
    },
  });

  const returnToPoolMutation = useMutation({
    // "Devolver à pool" insere uma NOVA linha já com end_date preenchido — nunca
    // UPDATE (fbf_vehicle_assign bloqueia-o de propósito) nem ts_client=null
    // (rejeitado por constraint, ts_client é sempre obrigatório).
    mutationFn: (tbVehicle) => endVehicleAssign(tbVehicle),
    onSuccess: () => {
      // Devolver à pool também muda vbl_vehicle.current_assignee e pode fazer
      // desaparecer a tab "A Minha Viatura" de quem a tinha — sem isto ficava
      // tudo em cache até a página ser recarregada manualmente.
      queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_VEHICLE_QUERY_KEY });
      notification.success('Viatura devolvida à pool.');
    },
    onError: (error) => {
      notification.error(`Erro ao devolver viatura à pool: ${error.message}`);
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

    returnToPool: returnToPoolMutation.mutateAsync,
    isReturning: returnToPoolMutation.isPending,
  };
};
