import { useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/notification';
import { createStockItem, updateStockItem, deleteStockItem } from '../services/stockService';
import { STOCK_META_KEYS } from './useStockMeta';
import { STOCK_CURRENT_KEY } from './useStockCurrent';

export const useStockItemsCrud = () => {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: STOCK_META_KEYS.items });
    qc.invalidateQueries({ queryKey: STOCK_CURRENT_KEY });
  };

  const createMutation = useMutation({
    mutationFn: createStockItem,
    onSuccess: () => { invalidate(); notification.success('Artigo criado com sucesso!'); },
    onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao criar artigo.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ pk, data }) => updateStockItem(pk, data),
    onSuccess: () => { invalidate(); notification.success('Artigo atualizado com sucesso!'); },
    onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao atualizar artigo.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (pk) => deleteStockItem(pk),
    onSuccess: () => { invalidate(); notification.success('Artigo eliminado.'); },
    onError: (e) => notification.error(e?.response?.data?.error || 'Erro ao eliminar artigo.'),
  });

  return {
    addItem: createMutation.mutateAsync,
    isAdding: createMutation.isPending,
    editItem: updateMutation.mutateAsync,
    isEditing: updateMutation.isPending,
    removeItem: deleteMutation.mutateAsync,
    isRemoving: deleteMutation.isPending,
  };
};
