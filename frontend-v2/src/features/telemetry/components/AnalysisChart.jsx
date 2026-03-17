// features/telemetry/components/AnalysisChart.jsx
import { useRef, useMemo } from 'react';
import {
  Box, Paper, Stack, Typography, Chip, TextField,
  IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import html2canvas from 'html2canvas';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { MiniSensorMap } from './SensorMap';

const HOUR_TICKS = Array.from({ length: 24 }, (_, i) => i * 60);

/**
 * Vista de análise multi-sensor:
 * - Mini mapa à esquerda
 * - Gráfico de linha à direita com navegação temporal
 */
function AnalysisChart({
  sensors,
  activeSensors,
  analysisData,
  analysisDay,
  analysisHour,
  paramLabel,
  loading,
  onNavigateHour,
  onNavigateDay,
  onDayChange,
  onBack,
}) {
  const chartRef = useRef(null);

  const windowStart = useMemo(() => {
    if (!analysisDay) return null;
    return new Date(analysisDay + 'T00:00:00').getTime() + analysisHour * 3600000;
  }, [analysisDay, analysisHour]);

  const windowEnd = windowStart ? windowStart + 24 * 3600000 : null;

  // Agrupa as leituras por minuto dentro da janela temporal
  const chartData = useMemo(() => {
    if (analysisData.length === 0 || !windowStart) return [];
    const dataMap = {};
    analysisData.forEach((r) => {
      if (r.valuenumb == null) return;
      const val = parseFloat(r.valuenumb);
      if (isNaN(val)) return;
      const ts = new Date(r.data).getTime();
      if (ts < windowStart || ts >= windowEnd) return;
      const min = Math.floor((ts - windowStart) / 60000);
      if (!dataMap[min]) dataMap[min] = { min };
      const name = sensors.find((s) => s.pk === r.pk)?.name ?? `Sensor ${r.pk}`;
      dataMap[min][name] = val;
    });
    return Object.values(dataMap).sort((a, b) => a.min - b.min);
  }, [analysisData, windowStart, windowEnd, sensors]);

  const tickFormatter = (v) => {
    const h = (analysisHour + Math.floor(v / 60)) % 24;
    return `${String(h).padStart(2, '0')}:00`;
  };

  const tooltipLabelFormatter = (v) => {
    if (!windowStart) return v;
    const totalMin = windowStart / 60000 + v;
    const h = Math.floor(totalMin / 60) % 24;
    const m = Math.floor(totalMin % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const exportChart = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 });
    const link = document.createElement('a');
    link.download = `telemetria_${paramLabel || 'analise'}_${analysisDay}_${String(analysisHour).padStart(2, '0')}h.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
      {/* Coluna esquerda — mini mapa + botão voltar */}
      <Box sx={{ width: { xs: '100%', md: 460 }, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <MiniSensorMap
          allSensors={sensors}
          selectedSensors={activeSensors}
          width="100%"
          height={500}
        />
        <Box
          component="button"
          onClick={onBack}
          sx={{
            mt: 1, display: 'flex', alignItems: 'center', gap: 1,
            justifyContent: 'center', py: 1, px: 2,
            border: '1px solid', borderColor: 'divider', borderRadius: 1,
            bgcolor: 'background.paper', cursor: 'pointer',
            color: 'text.primary', typography: 'body2',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <ArrowBackIcon fontSize="small" />
          Voltar ao Mapa
        </Box>
      </Box>

      {/* Coluna direita — gráfico */}
      <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 0 }}>
        {/* Chips dos sensores e contagem */}
        <Stack direction="row" spacing={0.5} mb={2} flexWrap="wrap" alignItems="center">
          {activeSensors.map(({ name, color }) => (
            <Chip key={name} label={name} size="small" sx={{ bgcolor: color, color: '#fff', fontWeight: 500 }} />
          ))}
          {paramLabel && <Chip label={paramLabel} size="small" variant="outlined" />}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary">
            {loading ? 'A carregar...' : `${analysisData.length} leitura(s)`}
          </Typography>
        </Stack>

        {/* Cabeçalho do gráfico */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600}>{paramLabel}</Typography>
            <Typography variant="caption" color="text.secondary">
              {analysisDay} {String(analysisHour).padStart(2, '0')}:00 — +24h
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" gap={1}>
            <TextField
              type="date"
              size="small"
              value={analysisDay}
              onChange={(e) => onDayChange(e.target.value)}
              sx={{ width: 160 }}
            />
            <Tooltip title="Exportar gráfico (PNG)">
              <span>
                <IconButton size="small" onClick={exportChart} disabled={chartData.length === 0}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Conteúdo */}
        {loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={6} gap={2}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">A carregar dados...</Typography>
          </Box>
        ) : chartData.length === 0 ? (
          <Typography variant="body2" color="text.secondary" py={4} textAlign="center">
            Sem leituras nesta janela temporal.
          </Typography>
        ) : (
          <Box ref={chartRef}>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData} margin={{ top: 4, right: 24, left: 0, bottom: 8 }}>
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
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <RechartsTooltip labelFormatter={tooltipLabelFormatter} />
                <Legend />
                {activeSensors.map(({ name, color }) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            {/* Navegação temporal */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
              <Stack direction="row" alignItems="center" gap={0.5}>
                <IconButton size="small" onClick={() => onNavigateHour(-1)}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Typography variant="caption" color="text.secondary">
                  Horas · {String(analysisHour).padStart(2, '0')}:00
                </Typography>
                <IconButton size="small" onClick={() => onNavigateHour(1)}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Stack direction="row" alignItems="center" gap={0.5}>
                <IconButton size="small" onClick={() => onNavigateDay(-1)}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Typography variant="caption" color="text.secondary">
                  Dias · {analysisDay}
                </Typography>
                <IconButton size="small" onClick={() => onNavigateDay(1)}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}

export default AnalysisChart;
