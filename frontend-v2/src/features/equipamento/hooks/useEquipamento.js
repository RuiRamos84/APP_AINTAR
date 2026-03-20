import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getEquipamentos,
  getEquipamentosByInstalacao,
  createEquipamento,
  updateEquipamento,
  deleteEquipamento,
} from '../services/equipamentoService';

const KEY_ALL = ['equipamentos'];
const keyByInstalacao = (pk) => ['equipamentos', 'instalacao', pk];

export const useEquipamentos = () => {
  return useQuery({
    queryKey: KEY_ALL,
    queryFn: getEquipamentos,
    staleTime: 5 * 60 * 1000,
  });
};

export const useEquipamentosByInstalacao = (tbInstalacao) => {
  return useQuery({
    queryKey: keyByInstalacao(tbInstalacao),
    queryFn: () => getEquipamentosByInstalacao(tbInstalacao),
    enabled: !!tbInstalacao,
    staleTime: 5 * 60 * 1000,
  });
};

export const useEquipamentoMutations = (tbInstalacao) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: KEY_ALL });
    if (tbInstalacao) {
      queryClient.invalidateQueries({ queryKey: keyByInstalacao(tbInstalacao) });
    }
  };

  const createMutation = useMutation({
    mutationFn: createEquipamento,
    onSuccess: () => {
      invalidate();
      toast.success('Equipamento registado com sucesso!');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Erro ao registar equipamento');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ pk, formData }) => updateEquipamento(pk, formData),
    onSuccess: () => {
      invalidate();
      toast.success('Equipamento atualizado com sucesso!');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar equipamento');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEquipamento,
    onSuccess: () => {
      invalidate();
      toast.success('Equipamento eliminado.');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Erro ao eliminar equipamento');
    },
  });

  return {
    create: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    remove: deleteMutation.mutateAsync,
    isRemoving: deleteMutation.isPending,
  };
};
