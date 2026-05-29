import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import notification from '@/core/services/notification';
import { getStockOut, createStockOut, updateStockOut, deleteStockOut } from '../services/stockService';
import { STOCK_CURRENT_KEY } from './useStockCurrent';

export const STOCK_OUT_KEY = ['stock', 'out'];

export const useStockOut = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: STOCK_OUT_KEY,
    queryFn: async () => {
      const res = await getStockOut();
      return res?.stockout ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (query.isError) notification.error('Erro ao carregar saídas de stock.');
  }, [query.isError]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: STOCK_OUT_KEY });
    qc.invalidateQueries({ queryKey: STOCK_CURRENT_KEY });
  };

  const createMutation = useMutation({
    mutationFn: createStockOut,
    onSuccess: () => { invalidate(); notification.success('Saída registada com sucesso!'); },
    onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao registar saída.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ pk, data }) => updateStockOut(pk, data),
    onSuccess: () => { invalidate(); notification.success('Saída atualizada com sucesso!'); },
    onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao atualizar saída.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (pk) => deleteStockOut(pk),
    onSuccess: () => { invalidate(); notification.success('Saída eliminada.'); },
    onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao eliminar saída.'),
  });

  return {
    stockOut: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    addStockOut: createMutation.mutateAsync,
    isAdding: createMutation.isPending,
    editStockOut: updateMutation.mutateAsync,
    isEditing: updateMutation.isPending,
    removeStockOut: deleteMutation.mutateAsync,
    isRemoving: deleteMutation.isPending,
  };
};
