import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useEquipamentoStore } from '../store/equipamentoStore';
import * as svc from '../services/equipamentoService';

export const useEquipamentos = ({ fetchOnMount = true } = {}) => {
  const {
    equipamentos, selectedEquipamento, meta, loading, error,
    detailOpen, filters,
    setEquipamentos, setMeta, setSelectedEquipamento, closeDetail,
    addEquipamento, updateEquipamentoInList, removeEquipamento,
    setLoading, setError, setFilter, resetFilters,
    getFilteredEquipamentos,
  } = useEquipamentoStore();

  // ─── Meta ──────────────────────────────────────────────────────────────────

  const fetchMeta = useCallback(async () => {
    if (meta) return;
    try {
      const res = await svc.getMeta();
      setMeta(res);
    } catch {
      // meta não crítico — silencia
    }
  }, [meta, setMeta]);

  // ─── List ──────────────────────────────────────────────────────────────────

  const fetchEquipamentos = useCallback(async () => {
    setLoading(true);
    try {
      const { equipamentos: list } = await svc.getEquipamentos();
      setEquipamentos(list);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao carregar equipamentos';
      setError(msg);
      toast.error(msg);
    }
  }, [setEquipamentos, setLoading, setError]);

  // ─── CRUD Equipamento ──────────────────────────────────────────────────────

  const createEquipamento = useCallback(async (data) => {
    try {
      await svc.createEquipamento(data);
      toast.success('Equipamento criado com sucesso');
      await fetchEquipamentos();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao criar equipamento';
      toast.error(msg);
      throw err;
    }
  }, [fetchEquipamentos]);

  const updateEquipamento = useCallback(async (pk, data) => {
    try {
      await svc.updateEquipamento(pk, data);
      await fetchEquipamentos(); // re-fetch preserva estado/localizacao
      toast.success('Equipamento atualizado com sucesso');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao atualizar equipamento';
      toast.error(msg);
      throw err;
    }
  }, [fetchEquipamentos]);

  const deleteEquipamento = useCallback(async (pk) => {
    try {
      await svc.deleteEquipamento(pk);
      removeEquipamento(pk);
      toast.success('Equipamento eliminado com sucesso');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao eliminar equipamento';
      toast.error(msg);
      throw err;
    }
  }, [removeEquipamento]);

  // ─── Alocações ─────────────────────────────────────────────────────────────

  const createAloc = useCallback(async (equipamentoPk, data) => {
    try {
      await svc.createAloc(equipamentoPk, data);
      toast.success('Alocação registada com sucesso');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao criar alocação';
      toast.error(msg);
      throw err;
    }
  }, []);

  const updateAloc = useCallback(async (equipamentoPk, alocPk, data) => {
    try {
      await svc.updateAloc(equipamentoPk, alocPk, data);
      toast.success('Alocação atualizada com sucesso');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao atualizar alocação';
      toast.error(msg);
      throw err;
    }
  }, []);

  const deleteAloc = useCallback(async (equipamentoPk, alocPk) => {
    try {
      await svc.deleteAloc(equipamentoPk, alocPk);
      toast.success('Alocação eliminada com sucesso');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao eliminar alocação';
      toast.error(msg);
      throw err;
    }
  }, []);

  // ─── Especificações ────────────────────────────────────────────────────────

  const createSpec = useCallback(async (equipamentoPk, data) => {
    try {
      await svc.createSpec(equipamentoPk, data);
      toast.success('Especificação adicionada');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao adicionar especificação';
      toast.error(msg);
      throw err;
    }
  }, []);

  const updateSpec = useCallback(async (equipamentoPk, specPk, data) => {
    try {
      await svc.updateSpec(equipamentoPk, specPk, data);
      toast.success('Especificação atualizada');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao atualizar especificação';
      toast.error(msg);
      throw err;
    }
  }, []);

  const deleteSpec = useCallback(async (equipamentoPk, specPk) => {
    try {
      await svc.deleteSpec(equipamentoPk, specPk);
      toast.success('Especificação eliminada');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao eliminar especificação';
      toast.error(msg);
      throw err;
    }
  }, []);

  // ─── Manutenções ───────────────────────────────────────────────────────────

  const createRepair = useCallback(async (equipamentoPk, data) => {
    try {
      await svc.createRepair(equipamentoPk, data);
      toast.success('Manutenção registada');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao registar manutenção';
      toast.error(msg);
      throw err;
    }
  }, []);

  const updateRepair = useCallback(async (equipamentoPk, repPk, data) => {
    try {
      await svc.updateRepair(equipamentoPk, repPk, data);
      toast.success('Manutenção atualizada');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao atualizar manutenção';
      toast.error(msg);
      throw err;
    }
  }, []);

  const deleteRepair = useCallback(async (equipamentoPk, repPk) => {
    try {
      await svc.deleteRepair(equipamentoPk, repPk);
      toast.success('Manutenção eliminada');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao eliminar manutenção';
      toast.error(msg);
      throw err;
    }
  }, []);

  // ─── Mount ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (fetchOnMount) {
      fetchEquipamentos();
      fetchMeta();
    }
  }, []); // eslint-disable-line

  return {
    // state
    equipamentos, selectedEquipamento, meta, loading, error, detailOpen, filters,
    filteredEquipamentos: getFilteredEquipamentos(),
    // actions
    fetchEquipamentos, fetchMeta,
    setSelectedEquipamento, closeDetail,
    setFilter, resetFilters,
    // equipamento CRUD
    createEquipamento, updateEquipamento, deleteEquipamento,
    // aloc CRUD
    createAloc, updateAloc, deleteAloc,
    // spec CRUD
    createSpec, updateSpec, deleteSpec,
    // repair CRUD
    createRepair, updateRepair, deleteRepair,
    // sub-resource fetchers (acesso direto ao service)
    getAloc: svc.getAloc,
    getSpecs: svc.getSpecs,
    getRepairs: svc.getRepairs,
  };
};
