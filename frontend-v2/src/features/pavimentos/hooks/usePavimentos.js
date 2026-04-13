import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/notification';
import * as svc from '../services/pavimentosService';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const pavKeys = {
  all:       ['pavimentos'],
  list:      (status) => ['pavimentos', status],
};

// ─── usePavimentos ────────────────────────────────────────────────────────────

/**
 * Gere o estado de uma lista de pavimentações para um dado status.
 * Usa React Query para caching e deduplicação de requests.
 *
 * @param {'pending'|'executed'|'completed'} status
 */
export const usePavimentos = (status) => {
  const queryClient = useQueryClient();
  const [search, setSearch]               = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // ─── Fetch via React Query ─────────────────────────────────────────────────

  const { data, isLoading, error } = useQuery({
    queryKey: pavKeys.list(status),
    queryFn:  () => svc.getPavimentos(status).then((r) => r.pavimentos),
    staleTime: 1000 * 60 * 2,  // 2 minutos — dados mudam pouco
    retry: 1,
  });

  const allPavimentos = data ?? [];

  // ─── Ações ────────────────────────────────────────────────────────────────

  const executarAcao = useCallback(async (pk, acao, anexos = []) => {
    setActionLoading(pk);
    try {
      if (acao === 'execute') {
        await svc.executarPavimento(pk);
        notification.success('Pavimentação marcada como executada');
      } else if (acao === 'pay') {
        await svc.pagarPavimento(pk);
        if (anexos.length > 0) {
          const pav = allPavimentos.find((p) => p.pk === pk);
          if (pav?.regnumber) {
            await Promise.allSettled(
              anexos.map(({ file, comment }) => svc.addAnexo(pav.regnumber, file, comment))
            );
          }
        }
        notification.success('Pavimentação marcada como concluída e paga');
      }
      // Invalidar todas as listas para forçar refresh
      queryClient.invalidateQueries({ queryKey: pavKeys.all });
    } catch (err) {
      notification.apiError(err, 'Erro ao processar ação');
    } finally {
      setActionLoading(null);
    }
  }, [allPavimentos, queryClient]);

  // ─── Derived state ────────────────────────────────────────────────────────

  const pavimentos = useMemo(() => {
    if (!search.trim()) return allPavimentos;
    const q = search.toLowerCase();
    return allPavimentos.filter((p) =>
      [p.regnumber, p.entity, p.nut4, p.nut3, p.nut2, p.address, p.phone]
        .some((v) => v?.toString().toLowerCase().includes(q))
    );
  }, [allPavimentos, search]);

  const stats = useMemo(() => ({
    total:            allPavimentos.length,
    totalComprimento: allPavimentos.reduce((s, p) => s + (p.comprimentoTotal || 0), 0),
    totalArea:        allPavimentos.reduce((s, p) => s + (p.areaTotal        || 0), 0),
  }), [allPavimentos]);

  return {
    pavimentos,
    loading: isLoading,
    error,
    search,
    setSearch,
    actionLoading,
    executarAcao,
    stats,
  };
};

export default usePavimentos;
