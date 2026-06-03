import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getPendentes, getEquipa, workflowBulk } from '../services/rhService';

const KEYS = {
  pendentes: (p) => ['rh-gestao-pendentes', p],
  equipa:    (p) => ['rh-gestao-equipa', p],
};

export const usePendentes = (params = {}) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEYS.pendentes(params),
    queryFn: () => getPendentes(params),
    staleTime: 60 * 1000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['rh-gestao-pendentes'] });
    // Invalida também as queries individuais para reflectir o estado actualizado
    qc.invalidateQueries({ queryKey: ['rh-ferias'] });
    qc.invalidateQueries({ queryKey: ['rh-faltas'] });
    qc.invalidateQueries({ queryKey: ['rh-ponto-mensal'] });
    qc.invalidateQueries({ queryKey: ['rh-participacoes'] });
  };

  const bulk = useMutation({
    mutationFn: workflowBulk,
    onSuccess: (res) => {
      invalidate();
      const { ok = [], erro = [] } = res || {};
      if (erro.length === 0) {
        toast.success(`${ok.length} item(s) processados com sucesso.`);
      } else {
        toast.warning(`${ok.length} processados, ${erro.length} com erro.`);
      }
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Erro ao processar acção em massa.'),
  });

  return {
    pendentes: Array.isArray(query.data) ? query.data.map(r => ({ ...r, id: `${r.tipo}-${r.pk}` })) : [],
    isLoading: query.isLoading,
    isError:   query.isError,
    workflowBulk: bulk.mutateAsync,
    isBulking:    bulk.isPending,
  };
};

export const useEquipa = (params = {}) => {
  const query = useQuery({
    queryKey: KEYS.equipa(params),
    queryFn: () => getEquipa(params),
    staleTime: 2 * 60 * 1000,
  });

  return {
    equipa:    Array.isArray(query.data) ? query.data.map(r => ({ ...r, id: r.pk })) : [],
    isLoading: query.isLoading,
    isError:   query.isError,
  };
};
