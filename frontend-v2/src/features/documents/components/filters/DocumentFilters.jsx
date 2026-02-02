import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Collapse,
  Badge,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Close as CloseIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { useDocumentsStore } from '../../store/documentsStore';
import { useMetaData } from '@/core/hooks/useMetaData';

/**
 * Collapsible Filter Panel for Documents
 */
const DocumentFilters = ({ open, onToggle }) => {
  const theme = useTheme();
  const { filters, dateRange, setFilters, setDateRange, resetFilters } = useDocumentsStore();
  const { data: metaData } = useMetaData();

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== '') count++;
    if (filters.associate !== '') count++;
    if (filters.type !== '') count++;
    if (filters.notification !== '') count++;
    if (dateRange.startDate) count++;
    if (dateRange.endDate) count++;
    return count;
  }, [filters, dateRange]);

  // Build options from metadata
  const statusOptions = useMemo(() => {
    if (metaData?.what && Array.isArray(metaData.what)) {
      return metaData.what.map((s) => ({ value: s.pk, label: s.step }));
    }
    return [];
  }, [metaData]);

  const associateOptions = useMemo(() => {
    if (metaData?.associates && Array.isArray(metaData.associates)) {
      return metaData.associates.map((a) => ({ value: a.pk, label: a.name || a.associate }));
    }
    return [];
  }, [metaData]);

  const typeOptions = useMemo(() => {
    if (metaData?.types && Array.isArray(metaData.types)) {
      return metaData.types.map((t) => ({ value: t.pk, label: t.type || t.name }));
    }
    return [];
  }, [metaData]);

  const handleFilterChange = (field) => (event) => {
    setFilters({ [field]: event.target.value });
  };

  const handleDateChange = (field) => (event) => {
    setDateRange({ ...dateRange, [field]: event.target.value || null });
  };

  const handleReset = () => {
    resetFilters();
  };

  return (
    <>
      {/* Toggle Button */}
      <Tooltip title={open ? 'Fechar filtros' : 'Abrir filtros'}>
        <IconButton onClick={onToggle} size="small">
          <Badge badgeContent={activeFilterCount} color="primary">
            <FilterListIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Filter Panel */}
      <Collapse in={open} sx={{ width: '100%' }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mt: 1,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
            bgcolor: alpha(theme.palette.background.paper, 0.6),
          }}
        >
          <Grid container spacing={2} alignItems="center">
            {/* Status */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                select
                label="Estado"
                value={filters.status}
                onChange={handleFilterChange('status')}
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderColor: filters.status !== '' ? theme.palette.primary.main : undefined,
                  },
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Associate */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                select
                label="Associado"
                value={filters.associate}
                onChange={handleFilterChange('associate')}
                fullWidth
                size="small"
              >
                <MenuItem value="">Todos</MenuItem>
                {associateOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Document Type */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                select
                label="Tipo"
                value={filters.type}
                onChange={handleFilterChange('type')}
                fullWidth
                size="small"
              >
                <MenuItem value="">Todos</MenuItem>
                {typeOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Notification */}
            <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
              <TextField
                select
                label="Notificação"
                value={filters.notification}
                onChange={handleFilterChange('notification')}
                fullWidth
                size="small"
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="1">Com notificação</MenuItem>
                <MenuItem value="0">Sem notificação</MenuItem>
              </TextField>
            </Grid>

            {/* Date Range - Start */}
            <Grid size={{ xs: 12, sm: 6, md: 1.75 }}>
              <TextField
                type="date"
                label="Data início"
                value={dateRange.startDate || ''}
                onChange={handleDateChange('startDate')}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Date Range - End */}
            <Grid size={{ xs: 12, sm: 6, md: 1.75 }}>
              <TextField
                type="date"
                label="Data fim"
                value={dateRange.endDate || ''}
                onChange={handleDateChange('endDate')}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Actions */}
            <Grid size={{ xs: 12, sm: 12, md: 1 }} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              {activeFilterCount > 0 && (
                <Tooltip title="Limpar filtros">
                  <IconButton onClick={handleReset} size="small" color="error">
                    <ResetIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Fechar filtros">
                <IconButton onClick={onToggle} size="small">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>
    </>
  );
};

export default DocumentFilters;
