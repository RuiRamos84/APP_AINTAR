import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import * as svc from '../services/pavimentosService';

/**
 * usePavimentos
 *
 * Gere o estado de uma lista de pavimentações para um dado status.
 * Inclui pesquisa, estatísticas e ações com feedback ao utilizador.
 *
 * @param {'pending'|'executed'|'completed'} status
 */
export const usePavimentos = (status) => {
  const [allPavimentos, setAllPavimentos] = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [search, setSearch]               = useState('');
  const [actionLoading, setActionLoading] = useState(null); // pk do item em ação, ou null

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPavimentos = useCallback(async () => {
    if (!status) return;
    setLoading(true);
    setError(null);
    try {
      const { pavimentos } = await svc.getPavimentos(status);
      setAllPavimentos(pavimentos);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao carregar pavimentações';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchPavimentos();
  }, [fetchPavimentos]);

  // ─── Ações ──────────────────────────────────────────────────────────────────

  /**
   * Executa uma ação sobre um pavimento.
   * @param {number} pk       - PK do pavimento
   * @param {'execute'|'pay'} acao - Tipo de ação
   * @param {Array} [anexos]  - Lista de { file, comment } para 'pay'
   */
  const executarAcao = useCallback(async (pk, acao, anexos = []) => {
    setActionLoading(pk);
    try {
      if (acao === 'execute') {
        await svc.executarPavimento(pk);
        toast.success('Pavimentação marcada como executada');
      } else if (acao === 'pay') {
        await svc.pagarPavimento(pk);
        // Enviar anexos se existirem
        if (anexos.length > 0) {
          const pav = allPavimentos.find((p) => p.pk === pk);
          const regnumber = pav?.regnumber;
          if (regnumber) {
            const uploads = anexos.map(({ file, comment }) =>
              svc.addAnexo(regnumber, file, comment)
            );
            await Promise.allSettled(uploads);
          }
        }
        toast.success('Pavimentação marcada como concluída e paga');
      }
      await fetchPavimentos();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao processar ação';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  }, [allPavimentos, fetchPavimentos]);

  // ─── Derived state ──────────────────────────────────────────────────────────

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
    pavimentos,   // array filtrado pela pesquisa
    loading,
    error,
    search,
    setSearch,
    actionLoading,
    fetchPavimentos,
    executarAcao,
    stats,        // calculado a partir do conjunto completo (não filtrado)
  };
};

export default usePavimentos;
