import { useState, useMemo } from 'react';
import {
  Box, Stack, Typography, Chip, FormControl, Select, MenuItem, Paper,
  List, ListItem, ListItemText, Alert, CircularProgress, Divider,
} from '@mui/material';
import { Warning as AlertaIcon, Map as MapIcon } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useSearch } from '@/shared/hooks';
import { usePontoAlertas } from '../hooks/usePontoLocais';
import { useLocais } from '../hooks/usePontoLocais';
import { useRhLookups } from '../hooks/useRhLookups';
import { RH_COLOR as COLOR, fmtDate, fmtTime } from '../utils/rhUtils';

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

const now = new Date();
const ISO = (d) => d.toISOString().slice(0, 10);

const PontoMapaPage = () => {
  const [userFk, setUserFk]         = useState('');
  const [dataInicio, setDataInicio] = useState(ISO(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [dataFim, setDataFim]       = useState(ISO(now));

  const params = useMemo(() => ({
    ...(userFk ? { user_fk: userFk } : {}),
    data_inicio: dataInicio,
    data_fim: dataFim,
  }), [userFk, dataInicio, dataFim]);

  const { alertas, isLoading } = usePontoAlertas(params);
  const { locais } = useLocais();
  const { colaboradores } = useRhLookups().lookups ? { colaboradores: [] } : { colaboradores: [] };

  // Collaborator list from locais hook's adjacent data — use useRhLookups instead
  const { lookups } = useRhLookups();
  const colabs = lookups?.colaboradores || [];

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
    >
      {/* Filtros */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select value={userFk} onChange={e => setUserFk(e.target.value)} displayEmpty>
            <MenuItem value="">— Todos os colaboradores —</MenuItem>
            {colabs.map(c => <MenuItem key={c.pk} value={c.pk}>{c.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">De</Typography>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 14 }} />
          <Typography variant="body2" color="text.secondary">até</Typography>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 14 }} />
        </Stack>
        {alertas.length > 0 && (
          <Chip
            icon={<AlertaIcon />}
            label={`${alertas.length} alerta${alertas.length !== 1 ? 's' : ''}`}
            color="error" variant="filled"
          />
        )}
      </Stack>

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

              {/* Locais predefinidos — círculos */}
              {locais.filter(l => l.ativo).map(l => (
                <Circle
                  key={l.pk}
                  center={[l.latitude, l.longitude]}
                  radius={l.raio_metros}
                  pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.1 }}
                >
                  <Popup>
                    <strong>{l.nome}</strong><br />
                    Raio: {l.raio_metros}m
                  </Popup>
                </Circle>
              ))}

              {/* Alertas — marcadores vermelhos */}
              {alertas.filter(a => a.latitude && a.longitude).map(a => (
                <Marker key={a.pk} position={[a.latitude, a.longitude]} icon={alertaIcon}>
                  <Popup>
                    <strong>{a.colaborador_nome}</strong><br />
                    {fmtDate(a.data)} — {a.evento_descr}<br />
                    {fmtTime(a.ts_registo)}<br />
                    Distância: {a.distancia_metros}m<br />
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
                    <ListItem>
                      <ListItemText
                        primary={
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: '65%' }}>
                              {a.colaborador_nome}
                            </Typography>
                            <Chip
                              label={`${a.distancia_metros}m`}
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
                    </ListItem>
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
