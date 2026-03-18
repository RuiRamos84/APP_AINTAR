import React, { useState, useMemo } from 'react';
import {
  Box,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  CircularProgress,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Alert,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  WaterDrop as ETARIcon,
  ElectricBolt as EEIcon,
  AccountTree as RedeIcon,
  Inbox as CaixaIcon,
  MyLocation as GpsIcon,
  Map as MapIcon,
  PinDrop as PinIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { fetchMetaData } from '@/services/metadataService';
import { toast } from 'sonner';
import LocationPickerDialog from './LocationPickerDialog';

// ──────────────────────────────────────────────
// Mapeamento de ações disponíveis por tipo
// ──────────────────────────────────────────────
const ACTIONS_BY_TYPE = {
  ETAR: [100, 102, 104, 105, 6], // Limpeza lamas, Reparação, Vedação, Desmatação, Visita técnica
  EE: [100, 102, 104, 105, 6],
  CAIXA: [101, 106, 102], // Desobstrução, Rep. tampa, Reparação
  REDE: [102, 101], // Reparação, Desobstrução
};

// PK fixo de "instalação genérica" para REDE e CAIXA (PKs negativos na tb_instalacao)
const FIXED_PK = { REDE: -1, CAIXA: -2 };

// Tipos de instalação com label e ícone
const INST_TYPES = [
  { key: 'ETAR', label: 'ETAR', color: 'success', Icon: ETARIcon },
  { key: 'EE', label: 'EE', color: 'primary', Icon: EEIcon },
  { key: 'REDE', label: 'Rede', color: 'warning', Icon: RedeIcon },
  { key: 'CAIXA', label: 'Caixa', color: 'error', Icon: CaixaIcon },
];

const getMeta = (raw) => raw?.data ?? raw ?? {};

// ──────────────────────────────────────────────
// Sub-componente: seletor de localização GPS
// ──────────────────────────────────────────────
const LocationSelector = ({ clat, clong, onLocationChange }) => {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const hasCoords = clat !== '' && clong !== '';

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada neste dispositivo.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationChange(
          pos.coords.latitude.toFixed(6),
          pos.coords.longitude.toFixed(6)
        );
        setGpsLoading(false);
        toast.info('Localização GPS obtida. Confirme a posição no mapa.');
        setMapOpen(true); // abrir mapa automáticamente para confirmação
      },
      (err) => {
        const messages = {
          1: 'Permissão de localização negada.',
          2: 'Posição indisponível. Tente novamente.',
          3: 'Tempo limite excedido ao obter localização.',
        };
        toast.error(messages[err.code] || 'Erro ao obter localização GPS.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleMapConfirm = ({ lat, lng }) => {
    onLocationChange(String(lat), String(lng));
  };

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PinIcon color={hasCoords ? 'success' : 'action'} fontSize="small" />
            <Typography variant="subtitle2" color={hasCoords ? 'success.main' : 'text.secondary'}>
              {hasCoords ? 'Localização definida' : 'Localização obrigatória'}
            </Typography>
          </Stack>

          {/* Botões de ação */}
          <Stack direction="row" spacing={1}>
            <Button
              variant={hasCoords ? 'outlined' : 'contained'}
              color="primary"
              size="small"
              startIcon={gpsLoading ? <CircularProgress size={14} /> : <GpsIcon />}
              onClick={handleUseGps}
              disabled={gpsLoading}
              sx={{ flex: 1 }}
            >
              {gpsLoading ? 'A obter...' : 'Usar GPS'}
            </Button>
            <Button
              variant={hasCoords ? 'outlined' : 'contained'}
              color="warning"
              size="small"
              startIcon={<MapIcon />}
              onClick={() => setMapOpen(true)}
              sx={{ flex: 1 }}
            >
              {hasCoords ? 'Ajustar no mapa' : 'Selecionar no mapa'}
            </Button>
            {hasCoords && (
              <Tooltip title="Limpar localização">
                <IconButton size="small" onClick={() => onLocationChange('', '')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          {/* Coordenadas actuais */}
          {hasCoords && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                icon={<GpsIcon />}
                label={`Lat: ${parseFloat(clat).toFixed(5)}`}
                size="small"
                color="success"
                variant="outlined"
              />
              <Chip
                label={`Long: ${parseFloat(clong).toFixed(5)}`}
                size="small"
                color="success"
                variant="outlined"
              />
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* Diálogo de mapa */}
      <LocationPickerDialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        onConfirm={handleMapConfirm}
        initialLat={clat}
        initialLng={clong}
      />
    </>
  );
};

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────
const DirectTaskForm = ({ onSubmit, onCancel, fixedInstType = null, fixedPk = null }) => {
  // If fixedInstType provided, start with that type already selected
  const [instType, setInstType] = useState(fixedInstType || '');
  const [selectedAssociate, setSelectedAssociate] = useState('');
  // If fixedPk provided, pre-fill the installation
  const [pkInstalacao, setPkInstalacao] = useState(fixedPk ? String(fixedPk) : '');
  const [ttAccao, setTtAccao] = useState('');
  const [pkOperador, setPkOperador] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [memo, setMemo] = useState('');
  const [clat, setClat] = useState('');
  const [clong, setClong] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: rawMeta, isLoading: metaLoading } = useQuery({
    queryKey: ['metadata'],
    queryFn: fetchMetaData,
    staleTime: 1000 * 60 * 60,
  });
  const metaData = getMeta(rawMeta);

  // Listas diretas do metaData
  const etarList = useMemo(() => metaData?.etar || [], [metaData]);
  const eeList = useMemo(() => metaData?.ee || [], [metaData]);
  const allActions = useMemo(() => metaData?.operacaoaccao || [], [metaData]);
  const operators = useMemo(() => metaData?.who || [], [metaData]);

  // Lista de instalações consoante o tipo selecionado
  const installationList = useMemo(() => {
    if (instType === 'ETAR') return etarList;
    if (instType === 'EE') return eeList;
    return [];
  }, [instType, etarList, eeList]);

  // Municípios/associados únicos para o 1º nível de agrupamento
  const associateList = useMemo(() => {
    const seen = new Set();
    return installationList
      .map((i) => i.ts_entity)
      .filter((a) => a && !seen.has(a) && seen.add(a))
      .sort((a, b) => a.localeCompare(b, 'pt'));
  }, [installationList]);

  // Instalações filtradas pelo associado selecionado
  const filteredInstallations = useMemo(() => {
    if (!selectedAssociate) return [];
    return installationList.filter((i) => i.ts_entity === selectedAssociate);
  }, [installationList, selectedAssociate]);

  // Filtrar ações permitidas para o tipo escolhido
  const filteredActions = useMemo(() => {
    if (!instType) return [];
    const allowed = ACTIONS_BY_TYPE[instType] || [];
    return allActions.filter((a) => allowed.includes(a.pk));
  }, [instType, allActions]);

  const needsInstPicker = instType === 'ETAR' || instType === 'EE';
  const needsCoords = instType === 'REDE' || instType === 'CAIXA';

  const handleTypeChange = (_, newType) => {
    if (!newType || fixedInstType) return; // ignorar se fixed
    setInstType(newType);
    setSelectedAssociate('');
    setPkInstalacao('');
    setTtAccao('');
    setClat('');
    setClong('');
  };

  const isValid = () => {
    if (!instType || !ttAccao || !pkOperador || !data) return false;
    if (needsInstPicker && !pkInstalacao) return false;
    if (needsCoords && (!clat || !clong)) return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid()) return;

    // fixedPk has priority; then picker selection; then FIXED_PK for REDE/CAIXA
    const pk_instalacao = fixedPk
      ? parseInt(fixedPk, 10)
      : needsInstPicker
        ? parseInt(pkInstalacao, 10)
        : FIXED_PK[instType];

    setSaving(true);
    try {
      await onSubmit({
        data,
        pk_instalacao,
        pk_operador: parseInt(pkOperador, 10),
        tt_operacaoaccao: parseInt(ttAccao, 10),
        memo: memo.trim() || undefined,
        ...(needsCoords && clat && clong
          ? { clat: parseFloat(clat), clong: parseFloat(clong) }
          : {}),
      });
      // sucesso — o modal é fechado pelo parent
    } catch (err) {
      // erro já notificado pela mutation (onError) — o modal permanece aberto
    } finally {
      setSaving(false);
    }
  };

  if (metaLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* ── Tipo de instalação (oculto quando fixedInstType) ── */}
        {!fixedInstType && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Tipo de instalação
            </Typography>
            <ToggleButtonGroup
              value={instType}
              exclusive
              onChange={handleTypeChange}
              fullWidth
              size="small"
            >
              {INST_TYPES.map(({ key, label, color, Icon }) => (
                <ToggleButton
                  key={key}
                  value={key}
                  color={color}
                  sx={{ gap: 0.75, fontWeight: 600 }}
                >
                  <Icon fontSize="small" />
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        )}

        {/* ── Localização GPS (REDE / CAIXA) ── */}
        {needsCoords && (
          <LocationSelector
            clat={clat}
            clong={clong}
            onLocationChange={(lat, lng) => {
              setClat(lat);
              setClong(lng);
            }}
          />
        )}

        {instType && (
          <Grid container spacing={2}>
            {/* ── Instalação: dois selects encadeados (município → instalação) ── */}
            {needsInstPicker && !fixedPk && (
              <>
                <Grid size={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Município</InputLabel>
                    <Select
                      value={selectedAssociate}
                      onChange={(e) => {
                        setSelectedAssociate(e.target.value);
                        setPkInstalacao('');
                        setTtAccao('');
                      }}
                      label="Município"
                    >
                      {associateList.map((a) => (
                        <MenuItem key={a} value={a}>
                          {a}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {selectedAssociate && (
                  <Grid size={12}>
                    <FormControl fullWidth required>
                      <InputLabel>Instalação ({instType})</InputLabel>
                      <Select
                        value={pkInstalacao}
                        onChange={(e) => {
                          setPkInstalacao(e.target.value);
                          setTtAccao('');
                        }}
                        label={`Instalação (${instType})`}
                      >
                        {filteredInstallations.map((i) => (
                          <MenuItem key={i.pk} value={i.pk}>
                            {i.nome || i.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </>
            )}

            {/* ── Ação ── */}
            <Grid size={12}>
              <FormControl fullWidth required>
                <InputLabel>Ação</InputLabel>
                <Select value={ttAccao} onChange={(e) => setTtAccao(e.target.value)} label="Ação">
                  {filteredActions.map((a) => (
                    <MenuItem key={a.pk} value={a.pk}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={a.pk} size="small" variant="outlined" sx={{ minWidth: 36 }} />
                        <span>{a.value || a.name}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* ── Data ── */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Data"
                type="date"
                fullWidth
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* ── Operador ── */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Operador</InputLabel>
                <Select
                  value={pkOperador}
                  onChange={(e) => setPkOperador(e.target.value)}
                  label="Operador"
                >
                  {operators.map((o) => (
                    <MenuItem key={o.pk} value={o.pk}>
                      {o.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* ── Observações ── */}
            <Grid size={12}>
              <TextField
                label="Observações (opcional)"
                fullWidth
                multiline
                rows={3}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Descreva os detalhes da operação..."
              />
            </Grid>
          </Grid>
        )}

        {/* ── Botões ── */}
        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving || !isValid()}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {saving ? 'A registar...' : 'Registar Operação'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default DirectTaskForm;
