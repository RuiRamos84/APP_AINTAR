import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import notification from '@/core/services/notification';
import { getStockIn, createStockIn, updateStockIn, deleteStockIn } from '../services/stockService';
import { STOCK_CURRENT_KEY } from './useStockCurrent';

export const STOCK_IN_KEY = ['stock', 'in'];

export const useStockIn = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: STOCK_IN_KEY,
    queryFn: async () => {
      const res = await getStockIn();
      return res?.stockin ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (query.isError) notification.error('Erro ao carregar entradas de stock.');
  }, [query.isError]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: STOCK_IN_KEY });
    qc.invalidateQueries({ queryKey: STOCK_CURRENT_KEY });
  };

  const createMutation = useMutation({
    mutationFn: createStockIn,
    onSuccess: () => { invalidate(); notification.success('Entrada registada com sucesso!'); },
    onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao registar entrada.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ pk, data }) => updateStockIn(pk, data),
    onSuccess: () => { invalidate(); notification.success('Entrada atualizada com sucesso!'); },
    onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao atualizar entrada.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (pk) => deleteStockIn(pk),
    onSuccess: () => { invalidate(); notification.success('Entrada eliminada.'); },
    onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao eliminar entrada.'),
  });

  return {
    stockIn: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    addStockIn: createMutation.mutateAsync,
    isAdding: createMutation.isPending,
    editStockIn: updateMutation.mutateAsync,
    isEditing: updateMutation.isPending,
    removeStockIn: deleteMutation.mutateAsync,
    isRemoving: deleteMutation.isPending,
  };
};
