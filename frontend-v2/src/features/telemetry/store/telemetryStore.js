// features/telemetry/store/telemetryStore.js
import { create } from 'zustand';

export const SENSOR_COLORS = ['#e53935', '#43a047', '#fb8c00', '#9c27b0'];
export const MAX_SENSORS = 4;

const initialFilters = {
  sensorType: '',
  teleparam: '',
  dateFrom: '',
  dateTo: '',
};

export const useTelemetryStore = create((set, get) => ({
  // ── Metadados ──────────────────────────────────────────────────────────────
  sensorTypes: [],
  teleparams: [],

  // ── Sensores disponíveis (resultado da query) ──────────────────────────────
  sensors: [],
  hasSearched: false,

  // ── Seleção de sensores (4 slots) ─────────────────────────────────────────
  selectedSlots: [null, null, null, null], // nome do sensor ou null

  // ── Filtros ────────────────────────────────────────────────────────────────
  filters: initialFilters,

  // ── Vista ─────────────────────────────────────────────────────────────────
  view: 'mapa', // 'mapa' | 'analise'

  // ── Dados de análise ───────────────────────────────────────────────────────
  analysisData: [],
  analysisDay: '',
  analysisHour: 0,

  // ── Loading / Error ────────────────────────────────────────────────────────
  loadingMeta: false,
  loadingSensors: false,
  loadingAnalysis: false,
  error: null,

  // ── Acções ─────────────────────────────────────────────────────────────────

  setSensorTypes: (types) => set({ sensorTypes: types }),
  setTeleparams: (params) => set({ teleparams: params }),
  setSensors: (sensors) => set({ sensors, hasSearched: true }),
  setHasSearched: (v) => set({ hasSearched: v }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
      // Limpar sensores e pesquisa ao alterar filtros
      sensors: [],
      hasSearched: false,
      selectedSlots: [null, null, null, null],
    })),

  resetFilters: () =>
    set({ filters: initialFilters, sensors: [], hasSearched: false, selectedSlots: [null, null, null, null] }),

  setView: (view) => set({ view }),

  // Selecionar sensor num slot específico
  selectSensor: (slotIndex, sensorName) =>
    set((state) => {
      const next = [...state.selectedSlots];
      // Se o sensor já está noutro slot, limpar esse slot
      const existing = next.indexOf(sensorName);
      if (existing !== -1 && existing !== slotIndex) next[existing] = null;
      next[slotIndex] = sensorName || null;
      return { selectedSlots: next };
    }),

  // Selecionar no primeiro slot livre (clique no mapa)
  selectSensorFirstFree: (sensorName) =>
    set((state) => {
      const idx = state.selectedSlots.findIndex((s) => s === null);
      if (idx === -1) return state;
      const next = [...state.selectedSlots];
      next[idx] = sensorName;
      return { selectedSlots: next };
    }),

  deselectSensor: (sensorName) =>
    set((state) => ({
      selectedSlots: state.selectedSlots.map((s) => (s === sensorName ? null : s)),
    })),

  clearSelection: () => set({ selectedSlots: [null, null, null, null] }),

  setAnalysisData: (data) => set({ analysisData: data }),
  setAnalysisWindow: (day, hour) => set({ analysisDay: day, analysisHour: hour }),
  setAnalysisDay: (day) => set({ analysisDay: day }),
  setAnalysisHour: (hour) => set({ analysisHour: hour }),

  setLoading: (key, value) => set({ [key]: value }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // ── Selectores ─────────────────────────────────────────────────────────────

  // Lista de sensores activos com cor associada
  getActiveSensors: () => {
    const { selectedSlots } = get();
    return selectedSlots
      .map((name, i) => (name ? { name, color: SENSOR_COLORS[i] } : null))
      .filter(Boolean);
  },

  // Nome do parâmetro seleccionado (para display)
  getParamLabel: () => {
    const { filters, teleparams } = get();
    return teleparams.find((p) => p.pk === filters.teleparam)?.value || filters.teleparam;
  },

  // Validação do intervalo de datas
  getDateRangeError: () => {
    const { filters } = get();
    const { dateFrom, dateTo } = filters;
    if (!dateFrom || !dateTo) return null;
    const diff = (new Date(dateTo) - new Date(dateFrom)) / 86400000;
    if (diff < 0) return 'A data de início deve ser anterior à data de fim.';
    if (diff > 30) return 'O intervalo máximo é de 30 dias.';
    return null;
  },

  hasEmptySlot: () => get().selectedSlots.some((s) => s === null),
  getSensorNames: () => [...new Set(get().sensors.map((s) => s.name).filter(Boolean))].sort(),
}));
