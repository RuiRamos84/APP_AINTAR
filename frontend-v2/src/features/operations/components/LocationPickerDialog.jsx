import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import {
  MyLocation as GpsIcon,
  Close as CloseIcon,
  CheckCircle as ConfirmIcon,
  PinDrop as PinIcon,
} from '@mui/icons-material';
import LocationPickerMap from '@/features/documents/components/forms/LocationPickerMap';

/**
 * Diálogo para selecionar coordenadas GPS.
 * Usa o LocationPickerMap existente + botão de geolocalização do dispositivo.
 *
 * @param {boolean} open - Estado de abertura
 * @param {function} onClose - Fecha sem guardar
 * @param {function} onConfirm - Callback({ lat, lng }) ao confirmar
 * @param {number|string} initialLat - Latitude inicial (opcional)
 * @param {number|string} initialLng - Longitude inicial (opcional)
 */
const LocationPickerDialog = ({ open, onClose, onConfirm, initialLat, initialLng }) => {
  const [lat, setLat] = useState(initialLat || '');
  const [lng, setLng] = useState(initialLng || '');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Sync coords whenever dialog opens (GPS pode ter sido obtido antes de abrir)
  useEffect(() => {
    if (open) {
      setLat(initialLat ? String(initialLat) : '');
      setLng(initialLng ? String(initialLng) : '');
      setGpsError('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasCoords = lat !== '' && lng !== '';

  const handleMapClick = useCallback((newLat, newLng) => {
    setLat(newLat.toFixed(6));
    setLng(newLng.toFixed(6));
    setGpsError('');
  }, []);

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalização não suportada neste dispositivo.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      (err) => {
        const messages = {
          1: 'Permissão de localização negada.',
          2: 'Posição indisponível. Tente novamente.',
          3: 'Tempo limite excedido ao obter localização.',
        };
        setGpsError(messages[err.code] || 'Erro ao obter localização GPS.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirm = () => {
    if (!hasCoords) return;
    onConfirm({ lat: parseFloat(lat), lng: parseFloat(lng) });
    onClose();
  };

  const handleClose = () => {
    setGpsError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PinIcon color="warning" />
          <Typography variant="h6" component="span">Selecionar Localização</Typography>
        </Stack>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          {/* Botão GPS */}
          <Button
            variant="outlined"
            color="primary"
            startIcon={gpsLoading ? <CircularProgress size={16} /> : <GpsIcon />}
            onClick={handleUseGps}
            disabled={gpsLoading}
            fullWidth
          >
            {gpsLoading ? 'A obter localização...' : 'Usar posição atual (GPS)'}
          </Button>

          {gpsError && <Alert severity="warning" sx={{ py: 0.5 }}>{gpsError}</Alert>}

          {/* Mapa */}
          <LocationPickerMap lat={lat} lng={lng} onLocationSelect={handleMapClick} />

          {/* Coordenadas seleccionadas */}
          {hasCoords ? (
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
                p: 1.5,
                bgcolor: 'action.hover',
                borderRadius: 1,
                alignItems: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                Coordenadas seleccionadas:
              </Typography>
              <Chip label={`Lat: ${lat}`} size="small" color="success" variant="outlined" />
              <Chip label={`Long: ${lng}`} size="small" color="success" variant="outlined" />
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              Clique no mapa ou use o GPS para definir a localização.
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">Cancelar</Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<ConfirmIcon />}
          onClick={handleConfirm}
          disabled={!hasCoords}
        >
          Confirmar Localização
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationPickerDialog;
