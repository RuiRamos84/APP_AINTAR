// features/telemetry/pages/TelemetryPage.jsx
import { useState } from 'react';
import {
  Box, Stack, Alert, FormControl, InputLabel, Select,
  MenuItem, TextField, Button, Tooltip, IconButton, CircularProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Router as TelemetryIcon } from '@mui/icons-material';
import ModulePage from '@/shared/components/layout/ModulePage';
import { SensorMap } from '../components/SensorMap';
import SensorSlot from '../components/SensorSlot';
import AnalysisChart from '../components/AnalysisChart';
import { useTelemetryStore, SENSOR_COLORS, MAX_SENSORS } from '../store/telemetryStore';
import { useTelemetry } from '../hooks/useTelemetry';

export default function TelemetryPage() {
  const store = useTelemetryStore();
  const {
    fetchSensors, goToAnalysis, refresh,
    navigateHour, navigateDay,
    isDebouncing, dateRangeError,
  } = useTelemetry();

  // Loading local para o botão "Ver Análise"
  const [pendingAnalysis, setPendingAnalysis] = useState(false);

  const activeSensors = store.getActiveSensors();
  const paramLabel = store.getParamLabel();
  const sensorNames = store.getSensorNames();
  const isLoading = store.loadingSensors || isDebouncing;

  const handleGoToAnalysis = async () => {
    setPendingAnalysis(true);
    await goToAnalysis();
    setPendingAnalysis(false);
  };

  return (
    <ModulePage
      title="Telemetria"
      subtitle={
        store.sensors.length > 0
          ? `${store.sensors.length} sensor(es)${store.view === 'analise' && activeSensors.length > 0
            ? ` · ${activeSensors.map((s) => s.name).join(', ')}`
            : ''}`
          : undefined
      }
      icon={TelemetryIcon}
      color="#1976d2"
      breadcrumbs={[{ label: 'Gestão', path: '/home' }, { label: 'Telemetria' }]}
      actions={
        <Tooltip title="Atualizar">
          <span>
            <IconButton
              onClick={refresh}
              disabled={store.loadingSensors || store.loadingAnalysis}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      {/* Erro */}
      {store.error && (
        <Alert severity="error" onClose={store.clearError} sx={{ mb: 2 }}>
          {store.error}
        </Alert>
      )}

      {/* Overlay de loading ao iniciar análise */}
      {pendingAnalysis && (
        <Box
          sx={{
            position: 'fixed', inset: 0, zIndex: 1300,
            bgcolor: 'rgba(0,0,0,0.55)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 2,
          }}
        >
          <CircularProgress size={56} sx={{ color: '#fff' }} />
          <Box sx={{ color: '#fff', typography: 'h6', fontWeight: 500 }}>
            A carregar dados...
          </Box>
          <Box sx={{ color: 'rgba(255,255,255,0.7)', typography: 'body2' }}>
            {activeSensors.map((s) => s.name).join(', ')}
          </Box>
        </Box>
      )}

      {/* ── VISTA MAPA ──────────────────────────────────────────────────────── */}
      {store.view === 'mapa' && (
        <>
          {/* Filtros */}
          <Stack direction="row" spacing={2} mb={2} alignItems="flex-start" flexWrap="wrap" gap={1}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Tipo de sensor</InputLabel>
              <Select
                value={store.filters.sensorType}
                label="Tipo de sensor"
                onChange={(e) => store.setFilter('sensorType', e.target.value)}
              >
                <MenuItem value="">Todos os tipos</MenuItem>
                {store.sensorTypes.map((t) => (
                  <MenuItem key={t.pk} value={t.pk}>{t.value}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Parâmetro a analisar</InputLabel>
              <Select
                value={store.filters.teleparam}
                label="Parâmetro a analisar"
                onChange={(e) => store.setFilter('teleparam', e.target.value)}
              >
                <MenuItem value="">Selecionar parâmetro</MenuItem>
                {store.teleparams.map((p) => (
                  <MenuItem key={p.pk} value={p.pk}>{p.value}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              type="date"
              size="small"
              label="De"
              value={store.filters.dateFrom}
              onChange={(e) => store.setFilter('dateFrom', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 150 }}
              error={!!dateRangeError}
            />
            <TextField
              type="date"
              size="small"
              label="Até"
              value={store.filters.dateTo}
              onChange={(e) => store.setFilter('dateTo', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 150 }}
              error={!!dateRangeError}
              helperText={dateRangeError ?? ''}
            />
          </Stack>

          {/* Slots de selecção de sensores */}
          {store.hasSearched && (
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" alignItems="center" gap={1}>
              {Array.from({ length: MAX_SENSORS }, (_, i) => (
                <SensorSlot
                  key={i}
                  index={i}
                  sensorName={store.selectedSlots[i]}
                  color={SENSOR_COLORS[i]}
                  sensorNames={sensorNames}
                  onSelect={(name) => store.selectSensor(i, name)}
                  onRemove={() => store.selectSensor(i, null)}
                />
              ))}
              <Box sx={{ flexGrow: 1 }} />
              <Tooltip title={
                dateRangeError ?? (!store.filters.teleparam ? 'Selecione um parâmetro para analisar' : '')
              }>
                <span>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={
                      activeSensors.length === 0 ||
                      !store.filters.teleparam ||
                      pendingAnalysis ||
                      !!dateRangeError
                    }
                    onClick={handleGoToAnalysis}
                  >
                    Ver Análise
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          )}

          {/* Mapa */}
          <SensorMap
            sensors={store.sensors}
            selectedSensors={activeSensors}
            canSelect={store.hasEmptySlot()}
            isLoading={isLoading}
            onSensorSelect={(name) => store.selectSensorFirstFree(name)}
            onSensorDeselect={(name) => store.deselectSensor(name)}
          />
        </>
      )}

      {/* ── VISTA ANÁLISE ───────────────────────────────────────────────────── */}
      {store.view === 'analise' && (
        <AnalysisChart
          sensors={store.sensors}
          activeSensors={activeSensors}
          analysisData={store.analysisData}
          analysisDay={store.analysisDay}
          analysisHour={store.analysisHour}
          paramLabel={paramLabel}
          loading={store.loadingAnalysis}
          onNavigateHour={navigateHour}
          onNavigateDay={navigateDay}
          onDayChange={(day) => store.setAnalysisWindow(day, 0)}
          onBack={() => store.setView('mapa')}
        />
      )}
    </ModulePage>
  );
}
