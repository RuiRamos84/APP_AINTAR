import { useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Chip, Box, Divider, Avatar,
  Paper, Grid, CircularProgress,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Edit as EditIcon,
  CheckCircle as OkIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Assignment as AssignIcon,
  Build as BuildIcon,
  EventAvailable as DeliveryIcon,
  Remove as NoneIcon,
} from '@mui/icons-material';
import { useAssignments } from '../hooks/useAssignments';
import { useMaintenances } from '../hooks/useMaintenances';

// ─── helpers ─────────────────────────────────────────────────────────────────

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (str) => {
  const d = parseDate(str);
  return d ? d.toLocaleDateString('pt-PT') : null;
};

const formatCurrency = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(num);
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

// ─── StatusCard (Inspeção / Seguro) ──────────────────────────────────────────

const StatusCard = ({ label, dateStr }) => {
  const d = parseDate(dateStr);
  const days = d ? Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24)) : null;

  let severity = 'default';
  let statusText = 'Sem data registada';
  let Icon = NoneIcon;

  if (days !== null) {
    if (days < 0) {
      severity = 'error';
      statusText = `Expirou há ${Math.abs(days)} dia${Math.abs(days) !== 1 ? 's' : ''}`;
      Icon = ErrorIcon;
    } else if (days === 0) {
      severity = 'error';
      statusText = 'Expira hoje';
      Icon = ErrorIcon;
    } else if (days <= 30) {
      severity = 'warning';
      statusText = `Expira em ${days} dia${days !== 1 ? 's' : ''}`;
      Icon = WarningIcon;
    } else {
      severity = 'success';
      statusText = `Válido por ${days} dias`;
      Icon = OkIcon;
    }
  }

  const colors = {
    error:   { border: 'error.main',   bg: 'error.50',   text: 'error.main'   },
    warning: { border: 'warning.main', bg: 'warning.50', text: 'warning.dark'  },
    success: { border: 'success.main', bg: 'success.50', text: 'success.dark'  },
    default: { border: 'divider',      bg: 'action.hover', text: 'text.disabled' },
  };
  const c = colors[severity];

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, borderColor: c.border, bgcolor: c.bg, borderRadius: 2, height: '100%' }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} mt={0.5} lineHeight={1.2}>
        {formatDate(dateStr) ?? '—'}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
        <Icon sx={{ fontSize: 14, color: c.text }} />
        <Typography variant="caption" color={c.text} fontWeight={500}>
          {statusText}
        </Typography>
      </Box>
    </Paper>
  );
};

// ─── VehicleOverviewModal ─────────────────────────────────────────────────────

const VehicleOverviewModal = ({ open, onClose, vehicle, onEdit }) => {
  const { assignments, isLoading: loadingA } = useAssignments();
  const { maintenances, isLoading: loadingM } = useMaintenances();

  const vehicleAssignments = useMemo(() =>
    assignments
      .filter(a => a.licence === vehicle?.licence)
      .sort((a, b) => (parseDate(b.data)?.getTime() ?? 0) - (parseDate(a.data)?.getTime() ?? 0)),
    [assignments, vehicle?.licence]
  );

  const vehicleMaintenances = useMemo(() =>
    maintenances
      .filter(m => m.licence === vehicle?.licence)
      .sort((a, b) => (parseDate(b.data)?.getTime() ?? 0) - (parseDate(a.data)?.getTime() ?? 0)),
    [maintenances, vehicle?.licence]
  );

  const totalCost = useMemo(() =>
    vehicleMaintenances.reduce((sum, m) => {
      const p = parseFloat(m.price);
      return sum + (isNaN(p) ? 0 : p);
    }, 0),
    [vehicleMaintenances]
  );

  if (!vehicle) return null;

  const isLoading = loadingA || loadingM;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* ── Cabeçalho ── */}
      <DialogTitle sx={{ pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: 2, flexShrink: 0,
            bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CarIcon sx={{ color: 'white', fontSize: 26 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                {vehicle.brand} {vehicle.model}
              </Typography>
              <Chip
                label={vehicle.licence}
                size="small" color="primary" variant="outlined"
                sx={{ fontWeight: 700, letterSpacing: 1.2 }}
              />
            </Box>
            {vehicle.delivery && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                <DeliveryIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Entregue em {formatDate(vehicle.delivery)}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {/* ── Estado das datas ── */}
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid size={6}>
            <StatusCard label="Inspeção" dateStr={vehicle.inspection_date} />
          </Grid>
          <Grid size={6}>
            <StatusCard label="Seguro" dateStr={vehicle.insurance_date} />
          </Grid>
        </Grid>

        {/* ── Atividade ── */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {/* Atribuições */}
            <Grid size={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                <AssignIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
                  Atribuições
                </Typography>
                <Chip label={vehicleAssignments.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
              </Box>
              {vehicleAssignments.length === 0 ? (
                <Typography variant="body2" color="text.disabled">Sem registos</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {vehicleAssignments.slice(0, 3).map((a, i) => (
                    <Box key={a.pk ?? i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.6rem', bgcolor: 'secondary.main', flexShrink: 0 }}>
                        {getInitials(a.ts_client)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" noWrap lineHeight={1.2}>{a.ts_client || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatDate(a.data)}</Typography>
                      </Box>
                    </Box>
                  ))}
                  {vehicleAssignments.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{vehicleAssignments.length - 3} mais
                    </Typography>
                  )}
                </Box>
              )}
            </Grid>

            {/* Manutenções */}
            <Grid size={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                <BuildIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
                  Manutenções
                </Typography>
                <Chip label={vehicleMaintenances.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
              </Box>
              {vehicleMaintenances.length === 0 ? (
                <Typography variant="body2" color="text.disabled">Sem registos</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {vehicleMaintenances.slice(0, 3).map((m, i) => (
                    <Box key={m.pk ?? i}>
                      <Typography variant="body2" lineHeight={1.2} noWrap>
                        {m.tt_maintenancetype || 'Manutenção'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">{formatDate(m.data)}</Typography>
                        {m.price && (
                          <Typography variant="caption" color="text.secondary">
                            · {formatCurrency(m.price)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                  {vehicleMaintenances.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{vehicleMaintenances.length - 3} mais
                    </Typography>
                  )}
                  {totalCost > 0 && (
                    <Typography variant="caption" fontWeight={700} color="primary.main">
                      Total: {formatCurrency(totalCost)}
                    </Typography>
                  )}
                </Box>
              )}
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined" size="small">Fechar</Button>
        <Box sx={{ flex: 1 }} />
        <Button
          onClick={() => { onClose(); onEdit(vehicle); }}
          variant="contained"
          size="small"
          startIcon={<EditIcon />}
        >
          Editar Veículo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VehicleOverviewModal;
