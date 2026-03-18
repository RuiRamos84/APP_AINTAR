import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import {
  getInventoryList,
  createInventory,
  updateInventory,
  deleteInventory,
} from '../services/internalService';

export const INVENTORY_QUERY_KEY = ['inventory'];

export const useInventory = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: INVENTORY_QUERY_KEY,
    queryFn: async () => {
      const response = await getInventoryList();
      const rawData = response?.inventory || [];
      return rawData.map((item, idx) => ({ ...item, id: item.pk ?? idx }));
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (query.isError) {
      toast.error(`Falha ao carregar inventário: ${query.error?.message}`);
    }
  }, [query.isError, query.error]);

  const createMutation = useMutation({
    mutationFn: createInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      toast.success('Item de inventário criado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao criar item: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ pk, data }) => updateInventory(pk, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      toast.success('Item de inventário atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar item: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      toast.success('Item eliminado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao eliminar item: ${error.message}`);
    },
  });

  return {
    inventory: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,

    addItem: createMutation.mutateAsync,
    isAdding: createMutation.isPending,

    editItem: updateMutation.mutateAsync,
    isEditing: updateMutation.isPending,

    deleteItem: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};
