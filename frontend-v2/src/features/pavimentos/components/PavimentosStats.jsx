import { Box, Paper, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ListAlt as ListAltIcon,
  Straighten as StraightenIcon,
  SquareFoot as SquareFootIcon,
} from '@mui/icons-material';

// ─── Labels por status ────────────────────────────────────────────────────────

const STATUS_LABELS = {
  pending:   'Pendentes',
  executed:  'Executadas',
  completed: 'Concluídas',
};

const STATUS_COLORS = {
  pending:   'warning.main',
  executed:  'info.main',
  completed: 'success.main',
};

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, unit, color }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        height: '100%',
      }}
    >
      <Box
        sx={{
          bgcolor: `${color}14`,
          color,
          borderRadius: 1.5,
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>
          {label}
        </Typography>
        <Typography variant="h6" fontWeight={700} lineHeight={1.3} color={color}>
          {value}
          {unit && (
            <Typography component="span" variant="caption" color="text.secondary" ml={0.5}>
              {unit}
            </Typography>
          )}
        </Typography>
      </Box>
    </Paper>
  );
}

// ─── PavimentosStats ─────────────────────────────────────────────────────────

/**
 * Linha de cards de estatísticas para um estado de pavimentações.
 *
 * @param {{ stats: { total, totalComprimento, totalArea }, status: string }} props
 */
export default function PavimentosStats({ stats, status }) {
  const statusLabel = STATUS_LABELS[status] ?? '';
  const color       = STATUS_COLORS[status] ?? 'primary.main';

  const fmtNum = (v) =>
    v > 0
      ? new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
      : '0,00';

  return (
    <Grid container spacing={2} sx={{ mb: 2.5 }}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <StatCard
          icon={ListAltIcon}
          label={`Total de registos — ${statusLabel}`}
          value={stats.total}
          unit={stats.total === 1 ? 'registo' : 'registos'}
          color={color}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <StatCard
          icon={StraightenIcon}
          label="Comprimento total"
          value={fmtNum(stats.totalComprimento)}
          unit="m"
          color={color}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <StatCard
          icon={SquareFootIcon}
          label="Área total"
          value={fmtNum(stats.totalArea)}
          unit="m²"
          color={color}
        />
      </Grid>
    </Grid>
  );
}
