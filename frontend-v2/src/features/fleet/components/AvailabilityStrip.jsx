import React, { useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { EventAvailable as AvailableIcon } from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';

const formatTime = (str) => {
  const d = str ? new Date(str) : null;
  return d && !isNaN(d.getTime())
    ? d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    : null;
};

/**
 * Faixa de disponibilidade "agora" — um cartão por viatura, verde (livre) ou
 * vermelho (em uso até X). Resposta visual imediata à pergunta "que carros
 * estão livres neste momento", sem substituir a tabela detalhada por baixo.
 */
const AvailabilityStrip = ({ vehicles, reservations }) => {
  const theme = useTheme();

  const rows = useMemo(() => {
    return vehicles.map((v) => {
      const active = reservations.find(
        (r) => r.tb_vehicle === v.pk && r.estado_atual === 'Em curso'
      );
      return { vehicle: v, active, assigned: Boolean(v.current_assignee) };
    });
  }, [vehicles, reservations]);

  if (!rows.length) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pr: 1, flexShrink: 0 }}>
        <AvailableIcon fontSize="small" color="action" />
        <Typography variant="subtitle2" color="text.secondary" noWrap>
          Disponibilidade Agora
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', flex: 1, pb: 0.5 }}>
        {rows.map(({ vehicle, active, assigned }) => {
          const color = assigned
            ? theme.palette.grey[600]
            : active
              ? theme.palette.error.main
              : theme.palette.success.main;
          const endTime = active ? formatTime(active.end_time) : null;
          const label = assigned
            ? `Atribuída a ${vehicle.current_assignee}`
            : active
              ? `Em uso até ${endTime}`
              : 'Livre';
          return (
            <Box
              key={vehicle.pk}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                minWidth: 168,
                flexShrink: 0,
                bgcolor: alpha(color, 0.08),
                border: `1px solid ${alpha(color, 0.35)}`,
              }}
            >
              <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} lineHeight={1.3} noWrap>
                  {vehicle.licence}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {label}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default AvailabilityStrip;
