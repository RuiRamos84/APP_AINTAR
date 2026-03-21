import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import avalAdminService from '../services/avalAdminService';

export function useAvalAdmin() {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [results, setResults] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Períodos ──────────────────────────────
  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await avalAdminService.getPeriods();
      setPeriods(Array.isArray(res) ? res : []);
    } catch {
      toast.error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }, []);

  const createPeriod = useCallback(
    async (data) => {
      try {
        await avalAdminService.createPeriod(data);
        toast.success('Campanha criada com sucesso');
        await fetchPeriods();
        return true;
      } catch (err) {
        toast.error(err?.response?.data?.error ?? 'Erro ao criar campanha');
        return false;
      }
    },
    [fetchPeriods]
  );

  const togglePeriod = useCallback(
    async (periodPk) => {
      try {
        await avalAdminService.togglePeriod(periodPk);
        await fetchPeriods();
      } catch {
        toast.error('Erro ao atualizar estado da campanha');
      }
    },
    [fetchPeriods]
  );

  // ── Detalhe do período selecionado ────────
  const fetchDetail = useCallback(async (periodPk) => {
    if (!periodPk) return;
    setLoadingDetail(true);
    try {
      const [assign, res] = await Promise.all([
        avalAdminService.getAssignments(periodPk),
        avalAdminService.getResults(periodPk),
      ]);
      setAssignments(Array.isArray(assign) ? assign : []);
      setResults(Array.isArray(res) ? res : []);
    } catch {
      toast.error('Erro ao carregar detalhe da campanha');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // ── Utilizadores (para geração de atribuições) ──
  const fetchUsers = useCallback(async () => {
    try {
      const res = await avalAdminService.getUsers();
      setUsers(Array.isArray(res) ? res : []);
    } catch {
      toast.error('Erro ao carregar utilizadores');
    }
  }, []);

  const generateAssignments = useCallback(
    async (periodPk, userIds) => {
      try {
        const res = await avalAdminService.generateAssignments(periodPk, userIds);
        toast.success(res?.message ?? 'Atribuições geradas');
        await fetchDetail(periodPk);
        return true;
      } catch (err) {
        toast.error(err?.response?.data?.error ?? 'Erro ao gerar atribuições');
        return false;
      }
    },
    [fetchDetail]
  );

  useEffect(() => {
    fetchPeriods();
    fetchUsers();
  }, [fetchPeriods, fetchUsers]);

  useEffect(() => {
    if (selectedPeriod) {
      fetchDetail(selectedPeriod);
      setActiveTab(0);
    }
  }, [selectedPeriod, fetchDetail]);

  return {
    periods,
    selectedPeriod,
    setSelectedPeriod,
    assignments,
    results,
    users,
    activeTab,
    setActiveTab,
    loading,
    loadingDetail,
    createPeriod,
    togglePeriod,
    generateAssignments,
    refetchDetail: () => fetchDetail(selectedPeriod),
  };
}
