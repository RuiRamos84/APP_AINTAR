/**
 * TelemetryPage
 * Monitorização de telemetria — leituras em tempo real de instalações
 */

import { useState } from 'react';
import {
  Box, Grid, Paper, Typography, Chip, Card, CardContent,
  Stack, Divider, LinearProgress, Alert, IconButton,
  Tooltip, useTheme, alpha,
} from '@mui/material';
import {
  Sensors as SensorsIcon,
  CheckCircle as OnlineIcon,
  Cancel as OfflineIcon,
  Warning as AlertIcon,
  Refresh as RefreshIcon,
  WaterDrop as WaterIcon,
  Bolt as EnergyIcon,
  Speed as PressureIcon,
  Thermostat as TempIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import apiClient from '@/services/api/client';

// ─── Status config ────────────────────────────────────────────────────────────

const STATION_STATUS = {
  online:  { label: 'Online',  color: 'success', icon: OnlineIcon },
  offline: { label: 'Offline', color: 'error',   icon: OfflineIcon },
  alert:   { label: 'Alerta',  color: 'warning',  icon: AlertIcon },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useTelemetry = () =>
  useQuery({
    queryKey: ['telemetry', 'stations'],
    queryFn: () => apiClient.get('/telemetry/stations'),
    staleTime: 30 * 1000, // 30s — dados em tempo real
    select: (res) => res?.stations ?? res?.data ?? [],
    retry: 1,
  });

// ─── Sensor Gauge ─────────────────────────────────────────────────────────────

const SensorGauge = ({ label, value, unit, max, color, icon: Icon }) => {
  const theme = useTheme();
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Icon sx={{ fontSize: 14, color: `${color}.main` }} />
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
        <Typography variant="caption" fontWeight={700}>
          {value ?? '—'} {unit}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ height: 6, borderRadius: 3, bgcolor: alpha(theme.palette[color]?.main || '#000', 0.12) }}
      />
    </Box>
  );
};

// ─── Station Card ─────────────────────────────────────────────────────────────

const StationCard = ({ station }) => {
  const theme = useTheme();
  const st = STATION_STATUS[station.status] || STATION_STATUS.offline;
  const StatusIcon = st.icon;

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: station.status === 'alert'
          ? theme.palette.warning.main
          : station.status === 'online'
          ? theme.palette.success.light
          : theme.palette.divider,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 2 },
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>{station.name}</Typography>
            <Typography variant="caption" color="text.secondary">{station.location}</Typography>
          </Box>
          <Chip
            label={st.label}
            size="small"
            color={st.color}
            icon={<StatusIcon sx={{ fontSize: '14px !important' }} />}
          />
        </Box>

        {/* Sensors */}
        <Stack spacing={1.5}>
          {station.level != null && (
            <SensorGauge label="Nível" value={station.level} unit="%" max={100} color="info" icon={WaterIcon} />
          )}
          {station.flow != null && (
            <SensorGauge label="Caudal" value={station.flow} unit="m³/h" max={200} color="primary" icon={PressureIcon} />
          )}
          {station.energy != null && (
            <SensorGauge label="Energia" value={station.energy} unit="kWh" max={500} color="warning" icon={EnergyIcon} />
          )}
          {station.temperature != null && (
            <SensorGauge label="Temperatura" value={station.temperature} unit="°C" max={40} color="error" icon={TempIcon} />
          )}
        </Stack>

        {/* Last update */}
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="caption" color="text.secondary">
          Última leitura: {station.last_reading
            ? new Date(station.last_reading).toLocaleTimeString('pt-PT')
            : '—'}
        </Typography>
      </CardContent>
    </Card>
  );
};

// ─── Mock data (quando API não disponível) ────────────────────────────────────

const MOCK_STATIONS = [
  { pk: 1, name: 'ETAR Norte', location: 'Sector Norte — Vila Real', status: 'online',  level: 72, flow: 45, energy: 210, temperature: 18, last_reading: new Date().toISOString() },
  { pk: 2, name: 'EE Ribeira',  location: 'Ribeira — Setor A',       status: 'alert',   level: 91, flow: 98, energy: 380, temperature: 22, last_reading: new Date().toISOString() },
  { pk: 3, name: 'ETAR Sul',    location: 'Sector Sul — Chaves',      status: 'online',  level: 55, flow: 30, energy: 140, temperature: 17, last_reading: new Date().toISOString() },
  { pk: 4, name: 'EE Central',  location: 'Centro — Montalegre',     status: 'offline', level: null, flow: null, energy: null, temperature: null, last_reading: null },
  { pk: 5, name: 'ETAR Leste',  location: 'Sector Leste — Boticas',  status: 'online',  level: 43, flow: 22, energy: 95, temperature: 16, last_reading: new Date().toISOString() },
  { pk: 6, name: 'EE Poente',   location: 'Poente — Valpaços',       status: 'online',  level: 60, flow: 35, energy: 175, temperature: 19, last_reading: new Date().toISOString() },
];

// ─── Componente Principal ─────────────────────────────────────────────────────

const TelemetryPage = () => {
  const theme = useTheme();
  const [filter, setFilter] = useState('all');
  const { data: stations = [], isLoading, isError, refetch, isFetching } = useTelemetry();

  // Usar dados reais ou mock se API ainda não existe
  const displayStations = stations.length > 0 ? stations : MOCK_STATIONS;

  const filtered = filter === 'all'
    ? displayStations
    : displayStations.filter((s) => s.status === filter);

  const counts = {
    online:  displayStations.filter((s) => s.status === 'online').length,
    offline: displayStations.filter((s) => s.status === 'offline').length,
    alert:   displayStations.filter((s) => s.status === 'alert').length,
  };

  return (
    <ModulePage
      title="Telemetria"
      subtitle="Monitorização em tempo real das instalações"
      icon={SensorsIcon}
      color="#009688"
      breadcrumbs={[
        { label: 'Gestão', path: '/etar' },
        { label: 'Telemetria', path: '/telemetry' },
      ]}
      actions={
        <Tooltip title="Atualizar leituras">
          <IconButton onClick={refetch} disabled={isFetching}>
            <RefreshIcon sx={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
          </IconButton>
        </Tooltip>
      }
    >
      {/* Summary stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { key: 'all',    label: 'Total',   value: displayStations.length, color: 'info' },
          { key: 'online', label: 'Online',  value: counts.online,          color: 'success' },
          { key: 'alert',  label: 'Alertas', value: counts.alert,           color: 'warning' },
          { key: 'offline',label: 'Offline', value: counts.offline,         color: 'error' },
        ].map(({ key, label, value, color }) => (
          <Grid key={key} size={{ xs: 6, sm: 3 }}>
            <Card
              onClick={() => setFilter(key)}
              sx={{
                cursor: 'pointer',
                border: `2px solid ${filter === key ? theme.palette[color].main : 'transparent'}`,
                bgcolor: filter === key ? alpha(theme.palette[color].main, 0.07) : 'background.paper',
                transition: '0.2s',
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h4" fontWeight={800} color={`${color}.main`}>{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Alert banner */}
      {counts.alert > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<AlertIcon />}>
          {counts.alert} estação(ões) com alertas activos — verifique os valores críticos
        </Alert>
      )}

      {/* Stations grid */}
      {isLoading ? (
        <Grid container spacing={2}>
          {[1,2,3,4,5,6].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined"><CardContent><LinearProgress /></CardContent></Card>
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
          <SensorsIcon sx={{ fontSize: 72, opacity: 0.2, mb: 2 }} />
          <Typography variant="h6">Sem estações para o filtro selecionado</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((station) => (
            <Grid key={station.pk} size={{ xs: 12, sm: 6, md: 4 }}>
              <StationCard station={station} />
            </Grid>
          ))}
        </Grid>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ModulePage>
  );
};

export default TelemetryPage;
