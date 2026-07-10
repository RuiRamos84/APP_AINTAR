import React, { useState } from 'react';
import { Box, Paper, Typography, Chip, Avatar, Button, Stack, CircularProgress } from '@mui/material';
import {
  DirectionsCar as CarIcon,
  ReportProblem as ReportIcon,
  Speed as SpeedIcon,
  EventAvailable as ReservationIcon,
  Badge as AssignmentIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { EmptyState } from '@/shared/components/feedback';
import { useMyVehicle } from '../hooks/useMyVehicle';
import BreakdownReportModal from './BreakdownReportModal.jsx';

const formatKm = (km) => (km != null ? `${km.toLocaleString('pt-PT')} km` : '—');

const sourceInfo = {
  reservation: { label: 'Reserva em curso', icon: ReservationIcon, color: 'primary' },
  assignment: { label: 'Atribuição própria', icon: AssignmentIcon, color: 'secondary' },
};

const MyVehicleTab = () => {
  const theme = useTheme();
  const { source, vehicle, isLoading, isError } = useMyVehicle();
  const [reportOpen, setReportOpen] = useState(false);

  const info = source ? sourceInfo[source] : null;
  const SourceIcon = info?.icon;

  return (
    <Box>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : isError || !vehicle ? (
        <EmptyState
          title="Sem viatura de momento"
          description="Não tem nenhuma viatura atribuída nem nenhuma reserva em curso."
        />
      ) : (
        <Paper
          variant="outlined"
          sx={{ p: 3, borderRadius: 2, maxWidth: 480 }}
        >
          <Stack spacing={2.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                <CarIcon />
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="h6" fontWeight={700} noWrap>
                  {vehicle.brand} {vehicle.model}
                </Typography>
                <Chip label={vehicle.licence} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, letterSpacing: 1.2 }} />
              </Box>
            </Box>

            {info && (
              <Chip
                icon={<SourceIcon fontSize="small" />}
                label={info.label}
                size="small"
                color={info.color}
                sx={{ alignSelf: 'flex-start' }}
              />
            )}

            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: 1.5,
              bgcolor: alpha(theme.palette.info.main, 0.06),
            }}>
              <SpeedIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">Km atual:</Typography>
              <Typography variant="body2" fontWeight={600}>{formatKm(vehicle.current_km)}</Typography>
            </Box>

            <Button
              variant="contained"
              color="warning"
              startIcon={<ReportIcon />}
              onClick={() => setReportOpen(true)}
              fullWidth
            >
              Reportar Avaria
            </Button>
          </Stack>
        </Paper>
      )}

      <BreakdownReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        tbVehicle={vehicle?.tb_vehicle}
      />
    </Box>
  );
};

export default MyVehicleTab;
