import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import notification from '@/core/services/notification';
import {
  getReservations,
  createReservation,
  updateReservation,
  cancelReservation,
  completeReservation,
} from '../services/vehicleService';
import { VEHICLES_QUERY_KEY } from './useVehicles';
import { MY_VEHICLE_QUERY_KEY } from './useMyVehicle';

export const RESERVATIONS_QUERY_KEY = ['vehicle-reservations'];

export const useReservations = (filters = {}) => {
  const queryClient = useQueryClient();

  const reservationsQuery = useQuery({
    queryKey: [...RESERVATIONS_QUERY_KEY, filters],
    queryFn: async () => {
      const response = await getReservations(filters);
      const rawData = response?.vehicle_reservation || response?.data?.vehicle_reservation || [];
      return rawData.map((r) => ({ ...r, id: r.pk }));
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (reservationsQuery.isError) {
      notification.error(`Falha ao carregar reservas: ${reservationsQuery.error?.message}`);
    }
  }, [reservationsQuery.isError, reservationsQuery.error]);

  // Criar/cancelar/concluir uma reserva muda "estado_atual" (Em curso ↔ outros) e
  // pode alterar current_km — isso é lido por useMyVehicle (tab "A Minha Viatura"
  // aparece/desaparece) e useVehicles (AvailabilityStrip, dropdown de reservas,
  // km atual em VehicleList), não só pela própria lista de reservas.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: RESERVATIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: VEHICLES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: MY_VEHICLE_QUERY_KEY });
  };

  const createMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      invalidate();
      notification.success('Reserva criada com sucesso!');
    },
    onError: (error) => notification.apiError(error, 'Erro ao criar reserva.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateReservation(id, data),
    onSuccess: () => {
      invalidate();
      notification.success('Reserva atualizada com sucesso!');
    },
    onError: (error) => notification.apiError(error, 'Erro ao atualizar reserva.'),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => {
      invalidate();
      notification.success('Reserva cancelada.');
    },
    onError: (error) => notification.apiError(error, 'Erro ao cancelar reserva.'),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, km }) => completeReservation(id, km),
    onSuccess: () => {
      invalidate();
      notification.success('Reserva concluída.');
    },
    onError: (error) => notification.apiError(error, 'Erro ao concluir reserva.'),
  });

  return {
    reservations: reservationsQuery.data || [],
    isLoading: reservationsQuery.isLoading,
    isError: reservationsQuery.isError,

    addReservation: createMutation.mutateAsync,
    isAdding: createMutation.isPending,

    editReservation: updateMutation.mutateAsync,
    isEditing: updateMutation.isPending,

    cancelReservation: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,

    completeReservation: completeMutation.mutateAsync,
    isCompleting: completeMutation.isPending,
  };
};
