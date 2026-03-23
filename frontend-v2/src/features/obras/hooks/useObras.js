import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useObrasStore } from '../store/obrasStore';
import * as svc from '../services/obrasService';
import { fetchMetaData } from '@/services/metadataService';

export const useObras = ({ fetchOnMount = true } = {}) => {
  const {
    obras, meta, loading, error, filters,
    setObras, setMeta, setLoading, setError,
    addObra, updateObraInList, removeObra,
    setFilter, resetFilters,
    getFilteredObras,
  } = useObrasStore();

  // ─── Meta ──────────────────────────────────────────────────────────────────

  const fetchMeta = useCallback(async () => {
    if (meta) return;
    try {
      const res = await fetchMetaData();
      setMeta({
        tipoObra: res?.tipo_obra ?? [],
        despesaobra: res?.despesaobra ?? [],
        urgencia: res?.urgencia ?? [],
        associates: res?.associates ?? [],
        instalacao: res?.instalacao ?? [],
      });
    } catch {
      // meta não crítico
    }
  }, [meta, setMeta]);

  // ─── Obras ─────────────────────────────────────────────────────────────────

  const fetchObras = useCallback(async () => {
    setLoading(true);
    try {
      const { obras: list } = await svc.getObras();
      setObras(list);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao carregar obras';
      setError(msg);
      toast.error(msg);
    }
  }, [setObras, setLoading, setError]);

  const createObra = useCallback(async (data) => {
    try {
      await svc.createObra(data);
      toast.success('Obra criada com sucesso');
      await fetchObras();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao criar obra';
      toast.error(msg);
      throw err;
    }
  }, [fetchObras]);

  const updateObra = useCallback(async (pk, data) => {
    try {
      await svc.updateObra(pk, data);
      await fetchObras();
      toast.success('Obra atualizada com sucesso');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao atualizar obra';
      toast.error(msg);
      throw err;
    }
  }, [fetchObras]);

  const deleteObra = useCallback(async (pk) => {
    try {
      await svc.deleteObra(pk);
      removeObra(pk);
      toast.success('Obra eliminada com sucesso');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao eliminar obra';
      toast.error(msg);
      throw err;
    }
  }, [removeObra]);

  // ─── Despesas ──────────────────────────────────────────────────────────────

  const createDespesa = useCallback(async (data) => {
    try {
      await svc.createDespesa(data);
      toast.success('Despesa registada com sucesso');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao registar despesa';
      toast.error(msg);
      throw err;
    }
  }, []);

  const updateDespesa = useCallback(async (pk, data) => {
    try {
      await svc.updateDespesa(pk, data);
      toast.success('Despesa atualizada com sucesso');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao atualizar despesa';
      toast.error(msg);
      throw err;
    }
  }, []);

  // ─── Mount ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (fetchOnMount) {
      fetchObras();
      fetchMeta();
    }
  }, []); // eslint-disable-line

  return {
    obras, meta, loading, error, filters,
    filteredObras: getFilteredObras(),
    fetchObras, fetchMeta,
    setFilter, resetFilters,
    createObra, updateObra, deleteObra,
    createDespesa, updateDespesa,
    getDespesas: svc.getDespesas,
    getDespesasByInstalacao: svc.getDespesasByInstalacao,
  };
};
