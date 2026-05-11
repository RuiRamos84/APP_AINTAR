import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  TextField,
  Box,
  Typography,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  alpha,
  useTheme,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Home as HomeIcon,
  Save as SaveIcon,
  AdminPanelSettings as AdminIcon,
  GpsFixed as GpsIcon,
  Info as InfoIcon,
  MyLocation as MyLocationIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useUpdateDocumentFields } from '../../hooks/useDocuments';
import LocationPickerMap from '../forms/LocationPickerMap';
import AddressForm from '@/shared/components/AddressForm/AddressForm';

/**
 * Modal para editar os campos de localização de um pedido.
 *
 * Permissões:
 *  - Utilizador com pedido em posse (canEditCoords): lat + lng + mapa.
 *  - Admin (isAdmin): lat + lng + mapa + morada completa (address, postal, door, floor, NUTs).
 *  - memo: NÃO editável por esta via.
 */
const EditDocumentModal = ({
  open,
  onClose,
  document,
  isAdmin = false,
  canEditCoords = false,
  onSuccess,
}) => {
  const theme = useTheme();
  const updateFields = useUpdateDocumentFields();

  const [gpsLoading, setGpsLoading] = useState(false);
  const [coordError, setCoordError] = useState('');

  // ── Estado das coordenadas ─────────────────────────────────────────
  const initialCoords = useMemo(() => ({
    glat: document?.glat != null ? String(document.glat) : '',
    glong: document?.glong != null ? String(document.glong) : '',
  }), [document]);

  // ── Estado da morada (só admin) ────────────────────────────────────
  const initialAddress = useMemo(() => ({
    postal: document?.postal || '',
    address: document?.address || '',
    door: document?.door || '',
    floor: document?.floor || '',
    nut1: document?.nut1 || '',
    nut2: document?.nut2 || '',
    nut3: document?.nut3 || '',
    nut4: document?.nut4 || '',
  }), [document]);

  const [coords, setCoords] = useState(initialCoords);
  const [addressValues, setAddressValues] = useState(initialAddress);

  // Sincronizar quando o modal abre
  useEffect(() => {
    if (open) {
      setCoords(initialCoords);
      setAddressValues(initialAddress);
      setCoordError('');
      setGpsLoading(false);
    }
  }, [open, initialCoords, initialAddress]);

  // ── Handlers ───────────────────────────────────────────────────────
  const handleAddressChange = useCallback((field, value) => {
    setAddressValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleMapLocationSelect = useCallback((lat, lng) => {
    setCoords({ glat: String(lat), glong: String(lng) });
    setCoordError('');
  }, []);

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setCoordError('Geolocalização não suportada pelo seu browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ glat: String(pos.coords.latitude), glong: String(pos.coords.longitude) });
        setGpsLoading(false);
        setCoordError('');
      },
      (err) => {
        setGpsLoading(false);
        const msgs = {
          1: 'Permissão de localização negada pelo browser.',
          2: 'Localização indisponível.',
          3: 'Tempo esgotado ao obter localização.',
        };
        setCoordError(msgs[err.code] || 'Erro ao obter localização.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ── Validação e submissão ──────────────────────────────────────────
  const validateCoords = () => {
    const lat = coords.glat.trim();
    const lng = coords.glong.trim();
    if (lat !== '' && isNaN(parseFloat(lat))) {
      setCoordError('A latitude deve ser um número decimal (ex: 41.5512).');
      return false;
    }
    if (lng !== '' && isNaN(parseFloat(lng))) {
      setCoordError('A longitude deve ser um número decimal (ex: -8.4280).');
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateCoords()) return;

    const payload = {};

    // Coordenadas — utilizador com posse OU admin
    ['glat', 'glong'].forEach((f) => {
      const current = document?.[f] != null ? String(document[f]) : '';
      if (coords[f].trim() !== current) {
        payload[f] = coords[f].trim() !== '' ? parseFloat(coords[f]) : null;
      }
    });

    // Morada — só admin
    if (isAdmin) {
      const addrFields = ['postal', 'address', 'door', 'floor', 'nut1', 'nut2', 'nut3', 'nut4'];
      addrFields.forEach((f) => {
        if (addressValues[f] !== (document?.[f] || '')) {
          payload[f] = addressValues[f] || null;
        }
      });
    }

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    updateFields.mutate(
      { id: document.pk, regnumber: document.regnumber, fields: payload },
      { onSuccess: () => { onSuccess?.(); onClose(); } }
    );
  };

  if (!document) return null;

  const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 1.5 } };

  // Badge de perfil
  const profileChip = isAdmin
    ? { label: 'Admin — Coords + Morada', color: 'primary', icon: <AdminIcon sx={{ fontSize: '14px !important' }} /> }
    : { label: 'Edição de coordenadas', color: 'info', icon: <GpsIcon sx={{ fontSize: '14px !important' }} /> };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <Box
        sx={{
          px: 3, py: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.12), display: 'flex', color: 'primary.main' }}>
            <EditIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="bold">Editar Pedido</Typography>
            <Typography variant="caption" color="text.secondary">{document.regnumber}</Typography>
          </Box>
          <Chip
            icon={profileChip.icon}
            label={profileChip.label}
            size="small"
            color={profileChip.color}
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.72rem' }}
          />
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* ══════════════════════════════════════════════════════════════
              COORDENADAS GPS — visível para utilizador com posse E admin
          ══════════════════════════════════════════════════════════════ */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Box sx={{ color: 'info.main', display: 'flex', p: 0.5, borderRadius: 1, bgcolor: alpha(theme.palette.info.main, 0.08) }}>
                <GpsIcon fontSize="small" />
              </Box>
              <Typography variant="subtitle1" fontWeight="bold">Coordenadas GPS</Typography>
              {!isAdmin && (
                <Tooltip title="Enquanto o pedido está em seu cargo, pode atualizar as coordenadas de localização.">
                  <InfoIcon fontSize="small" sx={{ color: 'text.disabled', cursor: 'help' }} />
                </Tooltip>
              )}
            </Box>

            {coordError && (
              <Alert severity="error" sx={{ mb: 1.5, borderRadius: 1.5 }}>{coordError}</Alert>
            )}

            <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Latitude"
                  value={coords.glat}
                  onChange={(e) => { setCoords((p) => ({ ...p, glat: e.target.value })); setCoordError(''); }}
                  fullWidth size="small" placeholder="Ex: 41.5512"
                  inputProps={{ inputMode: 'decimal' }}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Longitude"
                  value={coords.glong}
                  onChange={(e) => { setCoords((p) => ({ ...p, glong: e.target.value })); setCoordError(''); }}
                  fullWidth size="small" placeholder="Ex: -8.4280"
                  inputProps={{ inputMode: 'decimal' }}
                  sx={fieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Button
                  variant="outlined" color="info" fullWidth
                  startIcon={gpsLoading ? <CircularProgress size={16} color="inherit" /> : <MyLocationIcon />}
                  onClick={handleGetCurrentLocation}
                  disabled={gpsLoading}
                  sx={{ borderRadius: 1.5 }}
                >
                  {gpsLoading ? 'A obter...' : 'Localização atual'}
                </Button>
              </Grid>
            </Grid>

            {/* Mapa interativo */}
            <Paper
              variant="outlined"
              sx={{ borderRadius: 2, overflow: 'hidden', borderColor: alpha(theme.palette.info.main, 0.3) }}
            >
              <Box sx={{
                px: 1.5, py: 0.75,
                bgcolor: alpha(theme.palette.info.main, 0.06),
                borderBottom: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
                display: 'flex', alignItems: 'center', gap: 0.5,
              }}>
                <LocationIcon fontSize="small" sx={{ color: 'info.main', fontSize: 16 }} />
                <Typography variant="caption" color="info.main" fontWeight={600}>
                  Clique no mapa para definir ou ajustar a localização
                </Typography>
              </Box>
              <LocationPickerMap
                lat={coords.glat}
                lng={coords.glong}
                onLocationSelect={handleMapLocationSelect}
                height={300}
              />
            </Paper>
          </Box>

          {/* ══════════════════════════════════════════════════════════════
              MORADA — apenas admin
          ══════════════════════════════════════════════════════════════ */}
          {isAdmin && (
            <>
              <Divider>
                <Chip
                  icon={<HomeIcon sx={{ fontSize: '14px !important' }} />}
                  label="Morada (Admin)"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                />
              </Divider>

              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Insere o código postal para lookup automático de rua e divisões administrativas.
                </Typography>

                {/* AddressForm trata o lookup postal + campos morada.
                    showNuts=false porque vamos apresentar os NUTs abaixo de forma customizada. */}
                <AddressForm
                  values={addressValues}
                  onChange={handleAddressChange}
                  errors={{}}
                  showNuts={false}
                />

                {/* ── NUT display customizado ──────────────────────────────
                    NUT4 (Localidade) — chip primário logo após postal code
                    NUT3/NUT2/NUT1 — chips menores no fundo da box
                ─────────────────────────────────────────────────────── */}
                {(addressValues.nut4 || addressValues.nut3 || addressValues.nut2 || addressValues.nut1) && (
                  <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

                    {/* NUT4 — Localidade: destaque imediato após postal */}
                    {addressValues.nut4 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                        <Chip
                          label={addressValues.nut4}
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 700, fontSize: '0.78rem' }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                          Localidade
                        </Typography>
                      </Box>
                    )}

                    {/* NUT3, NUT2, NUT1 — chips menores no fundo */}
                    {(addressValues.nut3 || addressValues.nut2 || addressValues.nut1) && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', pl: 0.25 }}>
                        {[
                          { key: 'nut3', label: 'Freguesia' },
                          { key: 'nut2', label: 'Concelho' },
                          { key: 'nut1', label: 'Distrito' },
                        ].filter(({ key }) => addressValues[key]).map(({ key, label }) => (
                          <Chip
                            key={key}
                            size="small"
                            label={`${label}: ${addressValues[key]}`}
                            variant="outlined"
                            sx={{
                              fontSize: '0.68rem',
                              height: 22,
                              borderColor: alpha(theme.palette.primary.main, 0.35),
                              color: 'text.secondary',
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </>
          )}

        </Box>
      </DialogContent>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <DialogActions sx={{
        px: 3, py: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
        background: alpha(theme.palette.background.default, 0.4),
        gap: 1,
      }}>
        <Button onClick={onClose} color="inherit" disabled={updateFields.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={updateFields.isPending}
          startIcon={updateFields.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          sx={{ minWidth: 160, borderRadius: 1.5 }}
        >
          {updateFields.isPending ? 'A guardar…' : 'Guardar Alterações'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDocumentModal;
