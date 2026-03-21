import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import avalService from '../services/avalService';

export function useAval() {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [evalList, setEvalList] = useState([]);
  const [status, setStatus] = useState({ total: 0, done: 0, remaining: 0 });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(null); // pk da atribuição a submeter

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await avalService.getPeriods();
      const list = Array.isArray(res) ? res : [];
      setPeriods(list);
      // Auto-seleciona o período ativo mais recente
      const active = list.find((p) => p.active === 1) ?? list[0];
      if (active) setSelectedPeriod(active.pk);
    } catch {
      toast.error('Erro ao carregar campanhas de avaliação');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEvalData = useCallback(async (periodPk) => {
    if (!periodPk) return;
    setLoading(true);

    // Status (nunca lança excepção — retorna 0,0,0 se sem atribuições)
    try {
      const stat = await avalService.getStatus(periodPk);
      setStatus(stat ?? { total: 0, done: 0, remaining: 0 });
    } catch {
      setStatus({ total: 0, done: 0, remaining: 0 });
    }

    // Lista (pode lançar excepção se avaliador sem atribuições)
    try {
      const list = await avalService.getList(periodPk);
      setEvalList(Array.isArray(list) ? list : []);
    } catch {
      setEvalList([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  useEffect(() => {
    if (selectedPeriod) fetchEvalData(selectedPeriod);
  }, [selectedPeriod, fetchEvalData]);

  const submitEvaluation = useCallback(
    async (pk, aval_personal, aval_professional) => {
      setSubmitting(pk);
      try {
        await avalService.submit({ pk, aval_personal, aval_professional });
        toast.success('Avaliação submetida com sucesso');
        await fetchEvalData(selectedPeriod);
      } catch (err) {
        toast.error(err?.response?.data?.error ?? 'Erro ao submeter avaliação');
      } finally {
        setSubmitting(null);
      }
    },
    [selectedPeriod, fetchEvalData]
  );

  return {
    periods,
    selectedPeriod,
    setSelectedPeriod,
    evalList,
    status,
    loading,
    submitting,
    submitEvaluation,
  };
}
