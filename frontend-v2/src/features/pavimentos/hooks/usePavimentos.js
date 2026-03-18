/**
 * usePavimentos
 * Hook React Query para gestão de pavimentações
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getPavimentos, advancePavimento } from '../services/pavimentosService';

const STALE = 2 * 60 * 1000; // 2 minutos

export const usePavimentos = (status) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['pavimentos', status],
    queryFn: () => getPavimentos(status),
    staleTime: STALE,
    enabled: !!status,
    placeholderData: (prev) => prev, // mantém dados anteriores durante re-fetches
  });

  const advance = useMutation({
    mutationFn: (pk) => advancePavimento(status, pk),
    onSuccess: () => {
      const labels = { pending: 'executada', executed: 'concluída' };
      toast.success(`Pavimentação marcada como ${labels[status]} com sucesso!`);
      qc.invalidateQueries({ queryKey: ['pavimentos'] });
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    advance: advance.mutate,
    isAdvancing: advance.isPending,
  };
};
