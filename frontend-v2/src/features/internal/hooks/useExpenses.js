import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import notification from '@/core/services/notification';

/**
 * Hook factory para despesas.
 * Cria um hook React Query reutilizável para cada tipo de despesa.
 *
 * @param {string} queryKey - Chave única para o cache (ex: 'manut-expenses')
 * @param {Function} fetchFn - Função para listar despesas
 * @param {Function} createFn - Função para criar despesa
 * @param {string} label - Label para mensagens de feedback (ex: 'Manutenção')
 */
export const createExpenseHook = (queryKey, fetchFn, createFn, label) => {
  return () => {
    const queryClient = useQueryClient();
    const key = [queryKey];

    const query = useQuery({
      queryKey: key,
      queryFn: async () => {
        const response = await fetchFn();
        const rawData = response?.expenses || [];
        return rawData.map((item, idx) => ({ ...item, id: item.pk ?? idx }));
      },
      staleTime: 5 * 60 * 1000,
      retry: 1,
    });

    useEffect(() => {
      if (query.isError) {
        notification.error(`Falha ao carregar despesas (${label}): ${query.error?.message}`);
      }
    }, [query.isError, query.error]);

    const createMutation = useMutation({
      mutationFn: createFn,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: key });
        notification.success(`Despesa de ${label} registada com sucesso!`);
      },
      onError: (error) => {
        notification.error(`Erro ao registar despesa: ${error.message}`);
      },
    });

    return {
      expenses: query.data || [],
      isLoading: query.isLoading,
      isError: query.isError,
      addExpense: createMutation.mutateAsync,
      isAdding: createMutation.isPending,
    };
  };
};

// ─── Hooks específicos ────────────────────────────────────────────────────────
import {
  getManutExpenses, createManutExpense,
  getEquipExpenses, createEquipExpense,
  getRedeExpenses, createRedeExpense,
  getRamalExpenses, createRamalExpense,
} from '../services/internalService';

export const useManutExpenses = createExpenseHook(
  'manut-expenses', getManutExpenses, createManutExpense, 'Manutenção'
);

export const useEquipExpenses = createExpenseHook(
  'equip-expenses', getEquipExpenses, createEquipExpense, 'Equipamento'
);

export const useRedeExpenses = createExpenseHook(
  'rede-expenses', getRedeExpenses, createRedeExpense, 'Rede'
);

export const useRamalExpenses = createExpenseHook(
  'ramal-expenses', getRamalExpenses, createRamalExpense, 'Ramais'
);
