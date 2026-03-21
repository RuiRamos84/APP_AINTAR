import { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Box, Typography, CircularProgress } from '@mui/material';
import SensorsIcon from '@mui/icons-material/Sensors';
import 'leaflet/dist/leaflet.css';

const PORTUGAL_CENTER = [39.5, -8.0];

function FitBounds({ sensors }) {
  const map = useMap();
  useEffect(() => {
    if (sensors.length === 0) return;
    if (sensors.length === 1) {
      map.setView([parseFloat(sensors[0].latitude), parseFloat(sensors[0].longitude)], 13);
      return;
    }
    const bounds = sensors.map((s) => [parseFloat(s.latitude), parseFloat(s.longitude)]);
    map.fitBounds(bounds, { padding: [24, 24] });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function MiniSensorMap({ allSensors = [], selectedSensors = [], width = 200, height = 130 }) {
  const entries = selectedSensors
    .map((entry) => ({ ...entry, sensor: allSensors.find((s) => s.name === entry.name) }))
    .filter((e) => e.sensor && e.sensor.latitude != null && e.sensor.longitude != null);

  if (entries.length === 0) return null;

  const center = [parseFloat(entries[0].sensor.latitude), parseFloat(entries[0].sensor.longitude)];

  return (
    <Box
      sx={{
        width, height, borderRadius: 2, overflow: 'hidden',
        border: '2px solid', borderColor: 'divider',
        position: 'relative', flexShrink: 0,
        '& .leaflet-container': { height: '100%', width: '100%' },
        '& .leaflet-tile': { maxWidth: 'none !important', maxHeight: 'none !important' },
      }}
    >
      <MapContainer
        center={center}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains={['a', 'b', 'c']}
          maxZoom={19}
        />
        {entries.map(({ sensor, color }) => (
          <CircleMarker
            key={sensor.name}
            center={[parseFloat(sensor.latitude), parseFloat(sensor.longitude)]}
            radius={8}
            pathOptions={{ fillColor: color, fillOpacity: 1, color: '#fff', weight: 2 }}
          />
        ))}
        <FitBounds sensors={entries.map((e) => e.sensor)} />
      </MapContainer>
    </Box>
  );
}

function SensorMarker({ sensor, sensorEntry, canSelect, onSelect, onDeselect }) {
  const markerRef = useRef(null);
  const isSelected = !!sensorEntry;
  const markerColor = isSelected ? sensorEntry.color : '#1976d2';

  return (
    <CircleMarker
      ref={markerRef}
      center={[parseFloat(sensor.latitude), parseFloat(sensor.longitude)]}
      radius={isSelected ? 12 : 9}
      pathOptions={{
        fillColor: markerColor,
        fillOpacity: 1,
        color: isSelected ? sensorEntry.color : '#ffffff',
        weight: isSelected ? 3 : 2,
      }}
    >
      <Popup>
        <div style={{ minWidth: 190, fontFamily: 'sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {isSelected && (
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: sensorEntry.color, flexShrink: 0 }} />
            )}
            <strong style={{ fontSize: 14 }}>{sensor.name || '—'}</strong>
          </div>
          <span style={{ color: '#555', fontSize: 12 }}>Tipo: {sensor.tt_sensortype || '—'}</span>
          <br />
          <span style={{ color: '#888', fontSize: 11, display: 'block', margin: '4px 0 8px' }}>
            {parseFloat(sensor.latitude).toFixed(6)}, {parseFloat(sensor.longitude).toFixed(6)}
          </span>
          {isSelected ? (
            <button
              onClick={() => { onDeselect?.(sensor.name); markerRef.current?.closePopup(); }}
              style={{ padding: '6px 12px', background: '#ef5350', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, width: '100%' }}
            >
              ✕ Remover da análise
            </button>
          ) : canSelect ? (
            <button
              onClick={() => { onSelect?.(sensor.name); markerRef.current?.closePopup(); }}
              style={{ padding: '6px 12px', background: '#43a047', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, width: '100%' }}
            >
              ✓ Selecionar para análise
            </button>
          ) : null}
        </div>
      </Popup>
    </CircleMarker>
  );
}

export default function SensorMap({
  sensors = [],
  selectedSensors = [],
  canSelect = false,
  isLoading = false,
  onSensorSelect,
  onSensorDeselect,
}) {
  const validSensors = sensors.filter((s) => s.latitude != null && s.longitude != null);

  const center = validSensors.length > 0
    ? [parseFloat(validSensors[0].latitude), parseFloat(validSensors[0].longitude)]
    : PORTUGAL_CENTER;

  if (validSensors.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: 520, borderRadius: 2,
          border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
        }}
      >
        {isLoading ? (
          <>
            <CircularProgress size={40} sx={{ mb: 1.5 }} />
            <Typography color="text.secondary">A carregar sensores...</Typography>
          </>
        ) : (
          <>
            <SensorsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              Nenhum sensor com coordenadas disponíveis.
            </Typography>
          </>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%', height: 'calc(100vh - 260px)', minHeight: 400,
        borderRadius: 2, overflow: 'hidden',
        border: '1px solid', borderColor: 'divider',
        '& .leaflet-container': { height: '100%', width: '100%' },
        '& .leaflet-tile': { maxWidth: 'none !important', maxHeight: 'none !important' },
      }}
    >
      <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          subdomains={['a', 'b', 'c']}
        />
        {validSensors.map((sensor) => {
          const sensorEntry = selectedSensors.find((s) => s.name === sensor.name) || null;
          return (
            <SensorMarker
              key={sensor.pk || sensor.name}
              sensor={sensor}
              sensorEntry={sensorEntry}
              canSelect={canSelect && !sensorEntry}
              onSelect={onSensorSelect}
              onDeselect={onSensorDeselect}
            />
          );
        })}
      </MapContainer>
    </Box>
  );
}
