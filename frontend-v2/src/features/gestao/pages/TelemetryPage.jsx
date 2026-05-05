import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, CircularProgress,
  Select, MenuItem, FormControl, InputLabel,
  Stack, Alert, IconButton, Tooltip, Button, TextField,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DownloadIcon     from '@mui/icons-material/Download';
import CloseIcon        from '@mui/icons-material/Close';
import RefreshIcon      from '@mui/icons-material/Refresh';
import ArrowBackIcon    from '@mui/icons-material/ArrowBack';
import Sensors          from '@mui/icons-material/Sensors';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import html2canvas from 'html2canvas';
import notification from '@/core/services/notification';
import ModulePage from '@/shared/components/layout/ModulePage';
import SensorMap, { MiniSensorMap } from '../components/SensorMap';
import telemetryService from '../services/telemetryService';

const SENSOR_COLORS = ['#e53935', '#43a047', '#fb8c00', '#9c27b0'];
const PERSIST_KEY   = 'telemetry_analysis_state';

// ── Slot de seleção de sensor ───────────────────────────────────────────────
function SensorSlot({ index, sensorName, color, sensorNames, onSelect, onRemove }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1, display: 'flex', alignItems: 'center', gap: 1,
        borderColor: sensorName ? color : 'divider',
        borderWidth: sensorName ? 2 : 1,
        borderStyle: 'solid',
        bgcolor: sensorName ? `${color}18` : 'background.paper',
        minWidth: 200, maxWidth: 260,
        transition: 'border-color 0.15s',
      }}
    >
      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, flexShrink: 0, opacity: sensorName ? 1 : 0.4 }} />
      {sensorName ? (
        <>
          <Typography variant="body2" fontWeight={500} sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sensorName}
          </Typography>
          <IconButton size="small" onClick={onRemove} sx={{ p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </>
      ) : (
        <Autocomplete
          size="small"
          sx={{ flex: 1 }}
          options={sensorNames}
          value={null}
          onChange={(_, v) => { if (v) onSelect(v); }}
          getOptionLabel={(o) => o}
          renderInput={(params) => (
            <TextField {...params} placeholder={`Sensor ${index + 1}`} size="small" />
          )}
        />
      )}
    </Paper>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function TelemetryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sensors,         setSensors]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [mapTypeFilter,   setMapTypeFilter]   = useState('');
  const [allSensorTypes,  setAllSensorTypes]  = useState([]);
  const [allTeleparams,   setAllTeleparams]   = useState([]);
  const [selectedSensors, setSelectedSensors] = useState([null, null, null, null]);
  const [mapParamFilter,  setMapParamFilter]  = useState('');
  const [dateFrom,        setDateFrom]        = useState('');
  const [dateTo,          setDateTo]          = useState('');
  const [dataCache,       setDataCache]       = useState({});   // { 'yyyy-MM-dd': data[] }
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisDay,     setAnalysisDay]     = useState('');
  const [analysisHour,    setAnalysisHour]    = useState(0);
  const [pendingAnalysis, setPendingAnalysis] = useState(false);
  const [hasSearched,     setHasSearched]     = useState(false);

  const chartRef          = useRef(null);
  const searchingRef      = useRef(false);
  const dataCacheRef      = useRef({});                         // mirror de dataCache sem stale closure
  const analysisScopeRef  = useRef(null);                       // { sensorPks, paramPk } da análise activa
  const prefetchingRef    = useRef(new Set());                  // dias em curso de prefetch

  const view    = searchParams.get('view') || 'mapa';
  const setView = (v) => setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set('view', v); return p; });

  const sensorNames      = [...new Set(sensors.map((s) => s.name).filter(Boolean))].sort();
  const activeSensorList = selectedSensors.map((name, i) => name ? { name, color: SENSOR_COLORS[i] } : null).filter(Boolean);
  const hasEmptySlot     = selectedSensors.some((s) => s === null);
  const mapParamLabel    = allTeleparams.find((p) => p.pk === mapParamFilter)?.value || mapParamFilter;

  const dateRangeError = (() => {
    if (!dateFrom || !dateTo) return null;
    const diff = (new Date(dateTo) - new Date(dateFrom)) / 86400000;
    if (diff < 0) return 'A data de início deve ser anterior à data de fim.';
    if (diff > 30) return 'O intervalo máximo é de 30 dias.';
    return null;
  })();

  // ── Carregar tipos e parâmetros (uma vez) ────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [paramsRes, typesRes] = await Promise.all([
        telemetryService.getTeleparams(),
        telemetryService.getSensorTypes(),
      ]);
      setAllTeleparams(paramsRes?.data || []);
      setAllSensorTypes(typesRes?.data || []);
    } catch {
      // silencioso — dropdowns ficam vazios
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Restaurar estado após refresh ────────────────────────────────────────
  useEffect(() => {
    if (view !== 'analise') return;
    const raw = sessionStorage.getItem(PERSIST_KEY);
    if (!raw) { setView('mapa'); return; }
    try {
      const s = JSON.parse(raw);
      setDateFrom(s.dateFrom || '');
      setDateTo(s.dateTo || '');
      setMapParamFilter(s.mapParamFilter || '');
      setMapTypeFilter(s.mapTypeFilter || '');
      setSelectedSensors([s.sensors?.[0] || null, s.sensors?.[1] || null, s.sensors?.[2] || null, s.sensors?.[3] || null]);
      analysisScopeRef.current = { sensorPks: s.sensorPks || [], paramPk: s.mapParamFilter };
      const day = s.analysisDay || s.dateFrom;
      setAnalysisDay(day);
      setAnalysisHour(s.analysisHour || 0);
      if (s.sensorPks?.length > 0 && s.mapParamFilter) {
        fetchDay(day, s.sensorPks, s.mapParamFilter);
        fetchDay(addDays(day, 2), s.sensorPks, s.mapParamFilter, { silent: true });
      }
      fetchSensors(s.mapTypeFilter || null, s.mapParamFilter || null, s.dateFrom || null, s.dateTo || null);
    } catch { setView('mapa'); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persistir dia/hora actuais para sobreviver a refresh
  useEffect(() => {
    if (!analysisDay) return;
    const raw = sessionStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    try { sessionStorage.setItem(PERSIST_KEY, JSON.stringify({ ...JSON.parse(raw), analysisDay, analysisHour })); } catch {}
  }, [analysisDay, analysisHour]);

  // ── Pesquisa de sensores com filtros ─────────────────────────────────────
  const fetchSensors = useCallback(async (typePk, paramPk, from, to) => {
    setLoading(true);
    try {
      const res = await telemetryService.querySensors(typePk, paramPk, from, to);
      setSensors(res?.data || []);
      setHasSearched(true);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Erro desconhecido';
      notification.error(`Erro ao carregar sensores: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (searchingRef.current) return;
    searchingRef.current = true;
    try {
      await fetchSensors(mapTypeFilter || null, mapParamFilter || null, dateFrom || null, dateTo || null);
    } finally {
      searchingRef.current = false;
    }
  }, [fetchSensors, mapTypeFilter, mapParamFilter, dateFrom, dateTo]);


  // ── Seleção de sensores ───────────────────────────────────────────────────
  const handleSensorSelect = useCallback((name) => {
    setSelectedSensors((prev) => {
      const idx = prev.findIndex((s) => s === null);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = name;
      return next;
    });
  }, []);

  const handleSensorDeselect = useCallback((name) => {
    setSelectedSensors((prev) => prev.map((s) => (s === name ? null : s)));
  }, []);

  const handleSlotChange = useCallback((slotIdx, name) => {
    setSelectedSensors((prev) => {
      const next = [...prev];
      const existingIdx = next.indexOf(name);
      if (existingIdx !== -1 && existingIdx !== slotIdx) next[existingIdx] = null;
      next[slotIdx] = name || null;
      return next;
    });
  }, []);

  // ── Helpers de data local ────────────────────────────────────────────────
  const toLocalDay = (d) => [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');

  const addDays = (dayStr, n) => {
    const d = new Date((dayStr || toLocalDay(new Date())) + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return toLocalDay(d);
  };

  // ── Fetch de um único dia com cache ──────────────────────────────────────
  const fetchDay = useCallback(async (day, sensorPks, paramPk, { silent = false } = {}) => {
    if (dataCacheRef.current[day] !== undefined) return;  // cache hit
    if (prefetchingRef.current.has(day)) return;          // já a fetchar

    // Calcular dia+1 e dia+2 sem depender de closure
    const d1 = new Date(day + 'T00:00:00'); d1.setDate(d1.getDate() + 1);
    const fmt = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    const nextDay   = fmt(d1);
    const d2 = new Date(day + 'T00:00:00'); d2.setDate(d2.getDate() + 2);
    const dayAfter2 = fmt(d2);

    prefetchingRef.current.add(day);
    prefetchingRef.current.add(nextDay);
    if (!silent) setAnalysisLoading(true);
    try {
      // Busca 2 dias de uma vez — suporta navegação hora-a-hora sem re-fetch ao cruzar meia-noite
      const res = await telemetryService.queryData(sensorPks, paramPk, day, dayAfter2);
      const data = res?.data || [];
      const dayData = [], nextDayData = [];
      data.forEach((r) => {
        const rd = new Date(r.data);
        const rDay = fmt(rd);
        if (rDay === nextDay) nextDayData.push(r); else dayData.push(r);
      });
      dataCacheRef.current[day]     = dayData;
      dataCacheRef.current[nextDay] = nextDayData;
      setDataCache((prev) => ({ ...prev, [day]: dayData, [nextDay]: nextDayData }));
    } catch (err) {
      dataCacheRef.current[day] = [];
      setDataCache((prev) => ({ ...prev, [day]: [] }));
      if (!silent) notification.error(`Erro ao carregar dados: ${err?.response?.data?.message || err?.message}`);
    } finally {
      prefetchingRef.current.delete(day);
      prefetchingRef.current.delete(nextDay);
      if (!silent) setAnalysisLoading(false);
    }
  }, []);

  // Quando analysisDay muda: garante dados carregados + pré-carrega dia seguinte
  useEffect(() => {
    if (!analysisDay || !analysisScopeRef.current) return;
    const { sensorPks, paramPk } = analysisScopeRef.current;
    fetchDay(analysisDay, sensorPks, paramPk);
    // Pré-carrega o próximo bloco de 2 dias
    fetchDay(addDays(analysisDay, 2), sensorPks, paramPk, { silent: true });
  }, [analysisDay, fetchDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navegação temporal ───────────────────────────────────────────────────
  const navigateHour = (dir) => {
    let h = analysisHour + dir;
    let day = analysisDay;
    if (h > 23) { h = 0;  day = addDays(analysisDay, 1); }
    if (h < 0)  { h = 23; day = addDays(analysisDay, -1); }
    setAnalysisHour(h);
    setAnalysisDay(day);
  };

  const canNavigatePrev  = analysisDay > dateFrom;
  const canNavigateNext  = analysisDay < dateTo;
  const canNavHourPrev   = !(analysisDay === dateFrom && analysisHour === 0);
  const canNavHourNext   = !(analysisDay === dateTo   && analysisHour === 23);
  const navigateDay = (dir) => setAnalysisDay(addDays(analysisDay, dir));

  // ── Dados do gráfico ─────────────────────────────────────────────────────
  const analysisWindowStart = analysisDay ? new Date(analysisDay + 'T00:00:00').getTime() + analysisHour * 3600000 : null;
  const analysisWindowEnd   = analysisWindowStart ? analysisWindowStart + 24 * 3600000 : null;
  const HOUR_TICKS          = Array.from({ length: 24 }, (_, i) => i * 60);
  // Inclui dados do dia seguinte para cobrir janelas que cruzam meia-noite (hour > 0)
  const currentDayData      = [...(dataCache[analysisDay] || []), ...(dataCache[addDays(analysisDay, 1)] || [])];

  const multiChartData = useMemo(() => {
    if (!analysisWindowStart) return [];
    const dataMap = {};
    currentDayData.forEach((r) => {
      if (r.valuenumb == null) return;
      const val = parseFloat(r.valuenumb);
      if (isNaN(val)) return;
      const ts = new Date(r.data).getTime();
      if (ts < analysisWindowStart || ts >= analysisWindowEnd) return;
      const min = Math.floor((ts - analysisWindowStart) / 60000);
      if (!dataMap[min]) dataMap[min] = { min };
      const sensorName = sensors.find((s) => s.pk === r.pk)?.name || `Sensor ${r.pk}`;
      dataMap[min][sensorName] = val;
    });
    return Object.values(dataMap).sort((a, b) => a.min - b.min);
  }, [currentDayData, analysisWindowStart, analysisWindowEnd, sensors]);

  const tickFormatter    = (v) => `${String((analysisHour + Math.floor(v / 60)) % 24).padStart(2, '0')}:00`;
  const tooltipFormatter = (v) => {
    if (!analysisWindowStart) return v;
    const totalMin = analysisWindowStart / 60000 + v;
    return `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(Math.floor(totalMin % 60)).padStart(2, '0')}`;
  };

  const exportChart = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 });
    const link = document.createElement('a');
    link.download = `telemetria_${mapParamLabel || 'analise'}_${analysisDay}_${String(analysisHour).padStart(2, '0')}h.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const resetFilters = () => {
    setHasSearched(false);
    setSensors([]);
    setSelectedSensors([null, null, null, null]);
  };

  return (
    <ModulePage
      title="Telemetria"
      subtitle={`${sensors.length > 0 ? sensors.length + ' sensor(es)' : 'Monitorização de sensores'}${view === 'analise' && activeSensorList.length > 0 ? ' · ' + activeSensorList.map((s) => s.name).join(', ') : ''}`}
      icon={Sensors}
      color="primary"
      breadcrumbs={[{ label: 'Telemetria' }]}
      actions={
        <Tooltip title="Atualizar">
          <span>
            <IconButton
              onClick={async () => {
                if (view === 'analise' && analysisScopeRef.current && analysisDay) {
                  const { sensorPks, paramPk } = analysisScopeRef.current;
                  // Força re-fetch do dia actual
                  delete dataCacheRef.current[analysisDay];
                  setDataCache((prev) => { const n = { ...prev }; delete n[analysisDay]; return n; });
                  await fetchDay(analysisDay, sensorPks, paramPk);
                } else if (hasSearched) {
                  await handleSearch();
                }
              }}
              disabled={loading || analysisLoading}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      {/* Overlay de loading ao carregar análise */}
      {pendingAnalysis && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 1300,
          bgcolor: 'rgba(0,0,0,0.55)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          <CircularProgress size={56} sx={{ color: '#fff' }} />
          <Typography variant="h6" color="white" fontWeight={500}>A carregar dados...</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {activeSensorList.map((s) => s.name).join(', ')}
          </Typography>
        </Box>
      )}

      {loading && sensors.length === 0 ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>

      ) : view === 'mapa' ? (
        /* ── VISTA MAPA ─────────────────────────────────────────────── */
        <>
          {/* Filtros */}
          <Stack direction="row" spacing={2} mb={2} alignItems="flex-start" flexWrap="wrap" gap={1}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Tipo de sensor</InputLabel>
              <Select
                value={mapTypeFilter}
                label="Tipo de sensor"
                onChange={(e) => { setMapTypeFilter(e.target.value); resetFilters(); }}
              >
                <MenuItem value="">Todos os tipos</MenuItem>
                {allSensorTypes.map((t) => <MenuItem key={t.pk} value={t.pk}>{t.value}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Parâmetro a analisar</InputLabel>
              <Select
                value={mapParamFilter}
                label="Parâmetro a analisar"
                onChange={(e) => { setMapParamFilter(e.target.value); resetFilters(); }}
              >
                <MenuItem value="">Selecionar parâmetro</MenuItem>
                {allTeleparams.map((p) => <MenuItem key={p.pk} value={p.pk}>{p.value}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField
              type="date"
              size="small"
              label="De"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); resetFilters(); }}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
              error={!!dateRangeError}
            />
            <TextField
              type="date"
              size="small"
              label="Até"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); resetFilters(); }}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
              error={!!dateRangeError}
              helperText={dateRangeError || ''}
            />
            <Button
              variant="contained"
              size="small"
              disabled={loading}
              onClick={handleSearch}
              sx={{ height: 40, whiteSpace: 'nowrap' }}
            >
              {loading ? 'A pesquisar...' : 'Pesquisar Sensores'}
            </Button>
          </Stack>

          {/* Slots de seleção de sensor */}
          {hasSearched && (
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" alignItems="center" gap={1}>
              {[0, 1, 2, 3].map((i) => (
                <SensorSlot
                  key={i}
                  index={i}
                  sensorName={selectedSensors[i]}
                  color={SENSOR_COLORS[i]}
                  sensorNames={sensorNames.filter((n) => !selectedSensors.includes(n))}
                  onSelect={(name) => handleSlotChange(i, name)}
                  onRemove={() => handleSlotChange(i, null)}
                />
              ))}
              <Box sx={{ flexGrow: 1 }} />
              <Tooltip title={dateRangeError || (!mapParamFilter ? 'Selecione um parâmetro para analisar' : '')}>
                <span>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={activeSensorList.length === 0 || !mapParamFilter || pendingAnalysis || !!dateRangeError}
                    onClick={async () => {
                      const sensorPks = activeSensorList
                        .map(({ name }) => sensors.find((s) => s.name === name)?.pk)
                        .filter(Boolean);
                      // Reset cache para nova análise
                      dataCacheRef.current = {};
                      setDataCache({});
                      analysisScopeRef.current = { sensorPks, paramPk: mapParamFilter };
                      // Persistir estado para sobreviver a refresh
                      sessionStorage.setItem(PERSIST_KEY, JSON.stringify({
                        dateFrom, dateTo, mapParamFilter, mapTypeFilter,
                        sensors: activeSensorList.map((s) => s.name),
                        sensorPks, analysisDay: dateFrom, analysisHour: 0,
                      }));
                      setPendingAnalysis(true);
                      await fetchDay(dateFrom, sensorPks, mapParamFilter);
                      setAnalysisDay(dateFrom);
                      setAnalysisHour(0);
                      setPendingAnalysis(false);
                      setView('analise');
                      // Pré-carrega o segundo bloco de 2 dias em background
                      fetchDay(addDays(dateFrom, 2), sensorPks, mapParamFilter, { silent: true });
                    }}
                  >
                    Ver Análise
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          )}

          <SensorMap
            sensors={sensors}
            selectedSensors={activeSensorList}
            canSelect={hasEmptySlot}
            isLoading={loading}
            onSensorSelect={handleSensorSelect}
            onSensorDeselect={handleSensorDeselect}
          />
        </>

      ) : (
        /* ── VISTA ANÁLISE ──────────────────────────────────────────── */
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
          {/* Minimapa */}
          <Box sx={{ width: { xs: '100%', md: 460 }, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <MiniSensorMap
              allSensors={sensors}
              selectedSensors={activeSensorList}
              width="100%"
              height={500}
            />
            <Button
              startIcon={<ArrowBackIcon />}
              variant="outlined"
              size="small"
              onClick={() => setView('mapa')}
              sx={{ mt: 1 }}
              fullWidth
            >
              Voltar ao Mapa
            </Button>
          </Box>

          {/* Gráfico */}
          <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 0 }}>
            {/* Chips dos sensores */}
            <Stack direction="row" spacing={0.5} mb={2} flexWrap="wrap" alignItems="center">
              {activeSensorList.map(({ name, color }) => (
                <Chip key={name} label={name} size="small" sx={{ bgcolor: color, color: '#fff', fontWeight: 500 }} />
              ))}
              {mapParamLabel && <Chip label={mapParamLabel} size="small" variant="outlined" />}
              <Box sx={{ flexGrow: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {analysisLoading ? 'A carregar...' : `${currentDayData.length} leitura(s)`}
              </Typography>
            </Stack>

            {/* Controlo de janela temporal */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>{mapParamLabel}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {analysisDay} {String(analysisHour).padStart(2, '0')}:00 — +24h
                </Typography>
              </Box>
              <Stack direction="row" alignItems="center" gap={1}>
                <TextField
                  type="date"
                  size="small"
                  value={analysisDay}
                  onChange={(e) => { setAnalysisDay(e.target.value); setAnalysisHour(0); }}
                  sx={{ width: 160 }}
                />
                <Tooltip title="Exportar gráfico (PNG)">
                  <span>
                    <IconButton size="small" onClick={exportChart} disabled={multiChartData.length === 0}>
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>

            {/* Gráfico de linhas */}
            {analysisLoading ? (
              <Box display="flex" flexDirection="column" alignItems="center" py={6} gap={2}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">A carregar dados...</Typography>
              </Box>
            ) : (
              <Box ref={chartRef}>
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={multiChartData.length > 0 ? multiChartData : [{ min: -1 }]} margin={{ top: 4, right: 24, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="min"
                      type="number"
                      domain={[0, 1380]}
                      ticks={HOUR_TICKS}
                      tickFormatter={tickFormatter}
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={48}
                    />
                    <YAxis tick={{ fontSize: 11 }} width={48} domain={[0, 'auto']} />
                    <RechartsTooltip labelFormatter={tooltipFormatter} />
                    <Legend />
                    {activeSensorList.map(({ name, color }) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5 }}
                        connectNulls={true}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}

            {/* Navegação temporal — sempre visível */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
              <Stack direction="row" alignItems="center" gap={0.5}>
                <IconButton size="small" onClick={() => navigateHour(-1)} disabled={!canNavHourPrev}><ChevronLeftIcon fontSize="small" /></IconButton>
                <Typography variant="caption" color="text.secondary">
                  Horas · {String(analysisHour).padStart(2, '0')}:00
                </Typography>
                <IconButton size="small" onClick={() => navigateHour(1)} disabled={!canNavHourNext}><ChevronRightIcon fontSize="small" /></IconButton>
              </Stack>
              <Stack direction="row" alignItems="center" gap={0.5}>
                <IconButton size="small" onClick={() => navigateDay(-1)} disabled={!canNavigatePrev}><ChevronLeftIcon fontSize="small" /></IconButton>
                <Typography variant="caption" color="text.secondary">
                  Dias · {analysisDay}
                </Typography>
                <IconButton size="small" onClick={() => navigateDay(1)} disabled={!canNavigateNext}><ChevronRightIcon fontSize="small" /></IconButton>
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      )}
    </ModulePage>
  );
}
