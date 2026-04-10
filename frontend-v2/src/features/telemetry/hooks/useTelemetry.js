// features/telemetry/hooks/useTelemetry.js
import { useCallback, useEffect, useRef, useState } from 'react';
import notification from '@/core/services/notification';
import { useTelemetryStore } from '../store/telemetryStore';
import * as telemetryService from '../services/telemetryService';

/**
 * Hook central de telemetria.
 * Encapsula toda a lógica de fetch, debounce e navegação temporal.
 */
export function useTelemetry() {
  const store = useTelemetryStore();
  const [isDebouncing, setIsDebouncing] = useState(false);
  const isFirstRender = useRef(true);
  const searchingRef = useRef(false);
  const lastAnalysisParams = useRef(null);

  // ── Carregar metadados (tipos de sensor e parâmetros) na montagem ──────────
  useEffect(() => {
    const loadMeta = async () => {
      store.setLoading('loadingMeta', true);
      try {
        const [paramsRes, typesRes] = await Promise.all([
          telemetryService.getTeleparams(),
          telemetryService.getSensorTypes(),
        ]);
        store.setTeleparams(paramsRes?.data ?? []);
        store.setSensorTypes(typesRes?.data ?? []);
      } catch {
        // Silencioso — os dropdowns ficarão vazios mas não bloqueiam o uso
      } finally {
        store.setLoading('loadingMeta', false);
      }
    };
    loadMeta();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pesquisa de sensores ───────────────────────────────────────────────────
  const fetchSensors = useCallback(async () => {
    if (searchingRef.current) return;
    searchingRef.current = true;
    store.setLoading('loadingSensors', true);
    store.clearError();
    try {
      const { filters } = store;
      const res = await telemetryService.querySensors(
        filters.sensorType || null,
        filters.teleparam || null,
        filters.dateFrom || null,
        filters.dateTo || null,
      );
      store.setSensors(res?.data ?? []);
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Erro desconhecido';
      store.setError(`Erro ao carregar sensores: ${msg}`);
      notification.error('Erro ao carregar sensores.');
    } finally {
      store.setLoading('loadingSensors', false);
      searchingRef.current = false;
    }
  }, [store]);

  // ── Debounce automático ao alterar filtros completos ──────────────────────
  const { filters } = store;
  const dateRangeError = store.getDateRangeError();

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!filters.teleparam || !filters.dateFrom || !filters.dateTo || dateRangeError) {
      setIsDebouncing(false);
      return;
    }
    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setIsDebouncing(false);
      fetchSensors();
    }, 600);
    return () => {
      clearTimeout(timer);
      setIsDebouncing(false);
    };
  }, [filters.sensorType, filters.teleparam, filters.dateFrom, filters.dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carregar dados de análise ─────────────────────────────────────────────
  const fetchAnalysisData = useCallback(
    async (sensorPks, paramPk, dateFrom, dateTo, { resetWindow = true } = {}) => {
      if (!paramPk || sensorPks.length === 0) return;
      lastAnalysisParams.current = { sensorPks, paramPk, dateFrom, dateTo };
      if (resetWindow) store.setAnalysisData([]);
      store.setLoading('loadingAnalysis', true);
      try {
        const res = await telemetryService.queryData(sensorPks, paramPk, dateFrom, dateTo);
        const data = res?.data ?? [];

        if (data.length > 0) {
          const oldest = data.reduce(
            (min, r) => (new Date(r.data) < new Date(min.data) ? r : min),
            data[0],
          );
          const first = new Date(oldest.data);
          if (resetWindow || !store.analysisDay) {
            store.setAnalysisWindow(first.toISOString().slice(0, 10), first.getHours());
          }
        }
        store.setAnalysisData(data);
      } catch (err) {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Erro desconhecido';
        notification.error(`Erro ao carregar dados: ${msg}`);
      } finally {
        store.setLoading('loadingAnalysis', false);
      }
    },
    [store],
  );

  // ── Refresh (repete a última query) ──────────────────────────────────────
  const refresh = useCallback(async () => {
    if (store.view === 'analise' && lastAnalysisParams.current) {
      const { sensorPks, paramPk, dateFrom, dateTo } = lastAnalysisParams.current;
      await fetchAnalysisData(sensorPks, paramPk, dateFrom, dateTo, { resetWindow: false });
    } else if (store.hasSearched) {
      await fetchSensors();
    }
  }, [store.view, store.hasSearched, fetchSensors, fetchAnalysisData]);

  // ── Navegar na janela temporal ────────────────────────────────────────────
  const navigateHour = useCallback(
    (direction) => {
      let h = store.analysisHour + direction;
      const d = new Date((store.analysisDay || new Date().toISOString().slice(0, 10)) + 'T00:00:00');
      if (h > 23) { h = 0; d.setDate(d.getDate() + 1); }
      if (h < 0) { h = 23; d.setDate(d.getDate() - 1); }
      store.setAnalysisWindow(d.toISOString().slice(0, 10), h);
    },
    [store],
  );

  const navigateDay = useCallback(
    (direction) => {
      const d = new Date((store.analysisDay || new Date().toISOString().slice(0, 10)) + 'T00:00:00');
      d.setDate(d.getDate() + direction);
      store.setAnalysisDay(d.toISOString().slice(0, 10));
    },
    [store],
  );

  // ── Ir para análise ───────────────────────────────────────────────────────
  const goToAnalysis = useCallback(async () => {
    const activeSensors = store.getActiveSensors();
    const sensorPks = activeSensors
      .map(({ name }) => store.sensors.find((s) => s.name === name)?.pk)
      .filter(Boolean);
    await fetchAnalysisData(sensorPks, filters.teleparam, filters.dateFrom, filters.dateTo);
    store.setView('analise');
  }, [store, filters, fetchAnalysisData]);

  return {
    fetchSensors,
    fetchAnalysisData,
    refresh,
    navigateHour,
    navigateDay,
    goToAnalysis,
    isDebouncing,
    dateRangeError,
  };
}
