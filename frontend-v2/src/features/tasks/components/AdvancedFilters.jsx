/**
 * AdvancedFilters - Drawer de filtros avançados para tarefas
 *
 * Permite filtrar por: data, prioridade, cliente, status
 *
 * @example
 * <AdvancedFilters
 *   open={showFilters}
 *   onClose={() => setShowFilters(false)}
 *   onFilterChange={handleFilterChange}
 *   filters={filters}
 * />
 */

import { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';

import { useMetadata } from '@/core/contexts/MetadataContext';

/**
 * Filtros padrão
 */
const DEFAULT_FILTERS = {
  dateFrom: '',
  dateTo: '',
  priority: '',
  client: '',
  status: '',
  search: '',
};

/**
 * AdvancedFilters Component
 */
export const AdvancedFilters = ({
  open,
  onClose,
  onFilterChange,
  filters: externalFilters,
}) => {
  const { metadata } = useMetadata();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Sincronizar com filtros externos
  useEffect(() => {
    if (externalFilters) {
      setFilters((prev) => ({ ...prev, ...externalFilters }));
    }
  }, [externalFilters]);

  // Contagem de filtros ativos
  const activeFilterCount = Object.values(filters).filter((v) => v !== '').length;

  // Handlers
  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    onFilterChange?.(DEFAULT_FILTERS);
  };

  const handleApply = () => {
    onFilterChange?.(filters);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 360 },
          p: 0,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Filtros Avançados
          </Typography>
          {activeFilterCount > 0 && (
            <Chip
              label={activeFilterCount}
              size="small"
              color="primary"
              sx={{ height: 22, minWidth: 22 }}
            />
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
        <Stack spacing={3}>
          {/* Pesquisa */}
          <TextField
            label="Pesquisar"
            placeholder="Nome da tarefa..."
            fullWidth
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            variant="outlined"
            size="small"
          />

          <Divider />

          {/* Data Inicial */}
          <TextField
            label="Data Início (desde)"
            type="date"
            fullWidth
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />

          {/* Data Final */}
          <TextField
            label="Data Fim (até)"
            type="date"
            fullWidth
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />

          <Divider />

          {/* Prioridade */}
          <FormControl fullWidth size="small">
            <InputLabel>Prioridade</InputLabel>
            <Select
              value={filters.priority}
              label="Prioridade"
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <MenuItem value="">
                <em>Todas</em>
              </MenuItem>
              {metadata.taskPriority?.length > 0 ? (
                metadata.taskPriority.map((priority) => (
                  <MenuItem key={priority.pk} value={priority.pk}>
                    {priority.value}
                  </MenuItem>
                ))
              ) : (
                <>
                  <MenuItem value={1}>Baixa</MenuItem>
                  <MenuItem value={2}>Média</MenuItem>
                  <MenuItem value={3}>Alta</MenuItem>
                  <MenuItem value={4}>Urgente</MenuItem>
                </>
              )}
            </Select>
          </FormControl>

          {/* Status */}
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <MenuItem value="">
                <em>Todos</em>
              </MenuItem>
              {metadata.taskStatus?.length > 0 ? (
                metadata.taskStatus.map((status) => (
                  <MenuItem key={status.pk} value={status.pk}>
                    {status.value}
                  </MenuItem>
                ))
              ) : (
                <>
                  <MenuItem value={1}>Por Fazer</MenuItem>
                  <MenuItem value={2}>Em Progresso</MenuItem>
                  <MenuItem value={3}>Concluída</MenuItem>
                </>
              )}
            </Select>
          </FormControl>

          {/* Cliente */}
          {metadata.associates?.length > 0 && (
            <FormControl fullWidth size="small">
              <InputLabel>Cliente</InputLabel>
              <Select
                value={filters.client}
                label="Cliente"
                onChange={(e) => handleFilterChange('client', e.target.value)}
              >
                <MenuItem value="">
                  <em>Todos</em>
                </MenuItem>
                {metadata.associates.map((client) => (
                  <MenuItem key={client.pk} value={client.pk}>
                    {client.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 2,
        }}
      >
        <Button
          variant="outlined"
          color="error"
          startIcon={<ClearIcon />}
          onClick={handleClearFilters}
          disabled={activeFilterCount === 0}
          sx={{ flex: 1 }}
        >
          Limpar
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          sx={{ flex: 1 }}
        >
          Aplicar
        </Button>
      </Box>
    </Drawer>
  );
};

AdvancedFilters.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onFilterChange: PropTypes.func,
  filters: PropTypes.object,
};

export default AdvancedFilters;
