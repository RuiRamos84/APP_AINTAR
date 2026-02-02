import React, { useMemo } from 'react';
import { Alert, AlertTitle, Box, Chip, Typography, Grid } from '@mui/material';
import {
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  PriorityHigh as PriorityIcon,
} from '@mui/icons-material';

/**
 * Alert banner showing statistics about late/overdue documents
 * @param {{ documents: Array }} props
 */
const LateDocumentsAlert = ({ documents }) => {
  const stats = useMemo(() => {
    if (!documents || documents.length === 0) return null;

    const days = documents.map((doc) => parseInt(doc.days) || 0);
    const total = documents.length;

    return {
      total,
      averageDays: Math.round(days.reduce((sum, d) => sum + d, 0) / total),
      maxDays: Math.max(...days),
      minDays: Math.min(...days),
      critical: documents.filter((doc) => parseInt(doc.days) > 365).length,
      urgent: documents.filter((doc) => parseInt(doc.days) > 180).length,
      high: documents.filter((doc) => parseInt(doc.days) > 90).length,
      medium: documents.filter((doc) => parseInt(doc.days) > 60).length,
      overYearPct: Math.round(
        (documents.filter((doc) => parseInt(doc.days) > 365).length / total) * 100
      ),
    };
  }, [documents]);

  if (!stats) {
    return (
      <Alert severity="success" sx={{ mb: 2 }}>
        <AlertTitle>Sem atrasos</AlertTitle>
        Não há documentos em atraso no momento.
      </Alert>
    );
  }

  const severity = stats.critical > 0 ? 'error' : stats.urgent > 0 ? 'warning' : 'info';

  return (
    <Box sx={{ mb: 2 }}>
      <Alert severity={severity}>
        <AlertTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {stats.critical > 0 ? <PriorityIcon /> : <WarningIcon />}
            <strong>Relatório de Documentos em Atraso</strong>
          </Box>
        </AlertTitle>

        <Typography variant="body2" sx={{ mb: 2 }}>
          Foram encontrados <strong>{stats.total}</strong> documentos com mais de 30 dias de atraso.
        </Typography>

        {/* Stats Grid */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" color="error.main" fontWeight="bold">
                {stats.maxDays}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Máximo de dias
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" color="warning.main" fontWeight="bold">
                {stats.averageDays}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Média de dias
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" color="info.main" fontWeight="bold">
                {stats.minDays}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Mínimo de dias
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" color="secondary.main" fontWeight="bold">
                {stats.overYearPct}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Mais de 1 ano
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Severity Chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {stats.critical > 0 && (
            <Chip
              icon={<PriorityIcon />}
              label={`${stats.critical} Críticos (>1 ano)`}
              color="error"
              variant="filled"
              size="small"
            />
          )}
          {stats.urgent > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${stats.urgent} Urgentes (>6 meses)`}
              color="error"
              variant="outlined"
              size="small"
            />
          )}
          {stats.high > 0 && (
            <Chip
              icon={<TrendingUpIcon />}
              label={`${stats.high} Altos (>3 meses)`}
              color="warning"
              size="small"
            />
          )}
          {stats.medium > 0 && (
            <Chip
              icon={<ScheduleIcon />}
              label={`${stats.medium} Médios (>2 meses)`}
              color="info"
              variant="outlined"
              size="small"
            />
          )}
        </Box>

        {/* Severity Distribution Bar */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Distribuição por Severidade
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              height: 10,
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'grey.200',
              mt: 0.5,
            }}
          >
            <Box
              sx={{
                width: `${(stats.critical / stats.total) * 100}%`,
                bgcolor: 'error.dark',
                transition: 'width 1s ease-out',
              }}
            />
            <Box
              sx={{
                width: `${(Math.max(0, stats.urgent - stats.critical) / stats.total) * 100}%`,
                bgcolor: 'error.main',
                transition: 'width 1s ease-out',
              }}
            />
            <Box
              sx={{
                width: `${(Math.max(0, stats.high - stats.urgent) / stats.total) * 100}%`,
                bgcolor: 'warning.main',
                transition: 'width 1s ease-out',
              }}
            />
            <Box
              sx={{
                width: `${(Math.max(0, stats.medium - stats.high) / stats.total) * 100}%`,
                bgcolor: 'info.main',
                transition: 'width 1s ease-out',
              }}
            />
          </Box>
        </Box>
      </Alert>
    </Box>
  );
};

export default LateDocumentsAlert;
