import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Box, Stack, Typography, Chip, TextField, FormControl, Select, MenuItem, Paper,
  List, ListItemButton, ListItemText, Alert, CircularProgress, Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Warning as AlertaIcon, Map as MapIcon } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { usePontoAlertas, useLocais } from '../hooks/usePontoLocais';
import { useRhLookups } from '../hooks/useRhLookups';
import { RH_COLOR as COLOR, fmtDate, fmtTime, fmtDistancia } from '../utils/rhUtils';

// Fix leaflet marker icons (webpack/vite issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const alertaIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const localIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const now = new Date();
const ISO = (d) => d.toISOString().slice(0, 10);

// Centra/aproxima o mapa quando a posição seleccionada muda (sem remontar o MapContainer)
function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 16), { duration: 0.8 });
  }, [position, map]);
  return null;
}

const PontoMapaPage = () => {
  const [userFk, setUserFk]         = useState('');
  const [dataInicio, setDataInicio] = useState(ISO(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [dataFim, setDataFim]       = useState(ISO(now));
  const [selectedPk, setSelectedPk] = useState(null);
  const markerRefs = useRef({});

  const params = useMemo(() => ({
    ...(userFk ? { user_fk: userFk } : {}),
    data_inicio: dataInicio,
    data_fim: dataFim,
  }), [userFk, dataInicio, dataFim]);

  const { alertas, isLoading } = usePontoAlertas(params);
  const { locais } = useLocais();
  const { lookups } = useRhLookups();
  const colabs = lookups?.colaboradores || [];

  // Selecção perdeu-se se o filtro mudou e o alerta já não está na lista
  useEffect(() => {
    if (selectedPk && !alertas.some(a => a.pk === selectedPk)) setSelectedPk(null);
  }, [alertas, selectedPk]);

  const selectedPosition = useMemo(() => {
    const a = alertas.find(x => x.pk === selectedPk);
    return a?.latitude && a?.longitude ? [a.latitude, a.longitude] : null;
  }, [alertas, selectedPk]);

  const handleSelect = useCallback((a) => {
    if (!a.latitude || !a.longitude) return;
    setSelectedPk(a.pk);
    markerRefs.current[a.pk]?.openPopup();
  }, []);

  // Map center: first alerta or Portugal center
  const center = useMemo(() => {
    const first = alertas.find(a => a.latitude && a.longitude);
    return first ? [first.latitude, first.longitude] : [39.5, -8.0];
  }, [alertas]);

  return (
    <ModulePage
      title="Mapa de Ponto"
      subtitle="Registos GPS fora do local predefinido"
      icon={MapIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Mapa de Ponto' }]}
      actions={
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select value={userFk} onChange={e => setUserFk(e.target.value)} displayEmpty>
              <MenuItem value="">— Todos os colaboradores —</MenuItem>
              {colabs.map(c => <MenuItem key={c.pk} value={c.pk}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">De</Typography>
          <TextField
            type="date" size="small" value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <Typography variant="body2" color="text.secondary">até</Typography>
          <TextField
            type="date" size="small" value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          {alertas.length > 0 && (
            <Chip
              icon={<AlertaIcon />}
              label={`${alertas.length} alerta${alertas.length !== 1 ? 's' : ''}`}
              color="error" variant="filled"
            />
          )}
        </Stack>
      }
    >

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ minHeight: 480 }}>
          {/* Mapa */}
          <Box sx={{ flex: 1, borderRadius: 2, overflow: 'hidden', minHeight: 400 }}>
            <MapContainer
              center={center}
              zoom={alertas.length > 0 ? 13 : 7}
              style={{ height: '100%', minHeight: 400 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FlyTo position={selectedPosition} />

              {/* Locais predefinidos — círculos de tolerância */}
              {locais.filter(l => l.ativo).map(l => (
                <Circle
                  key={`circle-${l.pk}`}
                  center={[l.latitude, l.longitude]}
                  radius={l.raio_metros}
                  pathOptions={{ color: '#16a34a', weight: 2, fillColor: '#16a34a', fillOpacity: 0.12 }}
                />
              ))}

              {/* Locais predefinidos — marcadores verdes com popup */}
              {locais.filter(l => l.ativo).map(l => (
                <Marker key={`local-${l.pk}`} position={[l.latitude, l.longitude]} icon={localIcon}>
                  <Popup>
                    <strong>📍 {l.nome}</strong><br />
                    {l.descr && <span>{l.descr}<br /></span>}
                    Raio de tolerância: <strong>{l.raio_metros}m</strong>
                  </Popup>
                </Marker>
              ))}

              {/* Alertas — marcadores vermelhos */}
              {alertas.filter(a => a.latitude && a.longitude).map(a => (
                <Marker
                  key={a.pk}
                  position={[a.latitude, a.longitude]}
                  icon={alertaIcon}
                  ref={(el) => { if (el) markerRefs.current[a.pk] = el; }}
                  eventHandlers={{ click: () => setSelectedPk(a.pk) }}
                >
                  <Popup>
                    <strong>{a.colaborador_nome}</strong><br />
                    {fmtDate(a.data)} — {a.evento_descr}<br />
                    {fmtTime(a.ts_registo)}<br />
                    Distância: {fmtDistancia(a.distancia_metros)}<br />
                    Local: {a.local_nome || '—'} (raio {a.local_raio}m)
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </Box>

          {/* Painel lateral */}
          <Paper variant="outlined" sx={{ width: { xs: '100%', md: 320 }, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'error.main' }}>
              <Typography variant="subtitle2" color="white" fontWeight={700}>
                Registos Fora do Local
              </Typography>
            </Box>
            {alertas.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Alert severity="success" variant="outlined">
                  Sem alertas no período seleccionado.
                </Alert>
              </Box>
            ) : (
              <List dense sx={{ maxHeight: 420, overflowY: 'auto' }}>
                {alertas.map((a, i) => (
                  <Box key={a.pk}>
                    {i > 0 && <Divider />}
                    <ListItemButton
                      selected={a.pk === selectedPk}
                      onClick={() => handleSelect(a)}
                      sx={{
                        '&.Mui-selected': { bgcolor: alpha(COLOR, 0.1) },
                        '&.Mui-selected:hover': { bgcolor: alpha(COLOR, 0.16) },
                        borderLeft: '3px solid',
                        borderLeftColor: a.pk === selectedPk ? COLOR : 'transparent',
                      }}
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: '65%' }}>
                              {a.colaborador_nome}
                            </Typography>
                            <Chip
                              label={fmtDistancia(a.distancia_metros)}
                              size="small" color="error" variant="outlined"
                            />
                          </Stack>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {fmtDate(a.data)} {fmtTime(a.ts_registo)} · {a.evento_descr}
                            {a.local_nome && ` · Devia estar em ${a.local_nome}`}
                          </Typography>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                    </ListItemButton>
                  </Box>
                ))}
              </List>
            )}
          </Paper>
        </Stack>
      )}
    </ModulePage>
  );
};

export default PontoMapaPage;
