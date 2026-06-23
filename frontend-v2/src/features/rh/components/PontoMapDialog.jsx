import {
  Dialog, DialogTitle, DialogContent, Box, Stack, Typography, IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fmtDate, fmtTime } from '../utils/rhUtils';

// Fix leaflet default icons (webpack/vite issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
const pontoIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});
const localIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

// Mostra a localização GPS de um registo de ponto, com os locais predefinidos como referência
const PontoMapDialog = ({ registo, locais, onClose }) => {
  if (!registo) return null;
  const center = [Number(registo.latitude), Number(registo.longitude)];

  return (
    <Dialog open={!!registo} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {registo.evento_descr}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fmtDate(registo.data)} · {fmtTime(registo.ts_registo)}
              {registo.precisao_metros ? ` · Precisão ±${registo.precisao_metros}m` : ''}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ ml: 1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ height: 380 }}>
          <MapContainer center={center} zoom={16} style={{ height: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {(locais || []).filter(l => l.ativo).map(l => (
              <Circle
                key={`c-${l.pk}`}
                center={[l.latitude, l.longitude]}
                radius={l.raio_metros}
                pathOptions={{ color: '#16a34a', weight: 2, fillColor: '#16a34a', fillOpacity: 0.12 }}
              />
            ))}
            {(locais || []).filter(l => l.ativo).map(l => (
              <Marker key={`m-${l.pk}`} position={[l.latitude, l.longitude]} icon={localIcon}>
                <Popup><strong>{l.nome}</strong><br />Raio: {l.raio_metros}m</Popup>
              </Marker>
            ))}
            <Marker position={center} icon={pontoIcon}>
              <Popup>
                <strong>{registo.evento_descr}</strong><br />
                {fmtDate(registo.data)} {fmtTime(registo.ts_registo)}
              </Popup>
            </Marker>
          </MapContainer>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default PontoMapDialog;
