/**
 * QuickFilters - Filtros rápidos para tarefas
 * Alinhado com backend real (sem datas - não suportadas)
 */

import { useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  InputAdornment,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';

// Context
import { useMetadata } from '@/core/contexts/MetadataContext';

/**
 * QuickFilters Component
 * @param {boolean} isAdmin - Se o utilizador é admin (mostra filtro de cliente)
 */
export const QuickFilters = ({ filters = {}, onChange, onReset, isAdmin = false }) => {
  const theme = useTheme();
  const { metadata } = useMetadata();

  const [localFilters, setLocalFilters] = useState({
    search: filters.search || '',
    status: filters.status || 'all',
    priority: filters.priority || 'all',
    assignedTo: filters.assignedTo || 'all',
    client: filters.client || 'all',
  });

  // Handle mudança de filtro
  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onChange?.(newFilters);
  };

  // Handle reset
  const handleReset = () => {
    const resetFilters = {
      search: '',
      status: 'all',
      priority: 'all',
      assignedTo: 'all',
      client: 'all',
    };
    setLocalFilters(resetFilters);
    onChange?.(resetFilters);
    onReset?.();
  };

  // Verificar se há filtros ativos
  const hasActiveFilters =
    localFilters.search ||
    localFilters.status !== 'all' ||
    localFilters.priority !== 'all' ||
    localFilters.assignedTo !== 'all' ||
    localFilters.client !== 'all';

  // Obter nome do cliente selecionado
  const getClientName = (clientId) => {
    const client = metadata.associates?.find((c) => String(c.pk) === String(clientId));
    return client?.name || clientId;
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        bgcolor: alpha(theme.palette.primary.main, 0.02),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        borderRadius: 2,
      }}
    >
      <Stack spacing={2}>
        {/* Linha 1: Pesquisa */}
        <TextField
          fullWidth
          placeholder="Pesquisar tarefas..."
          value={localFilters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: localFilters.search && (
              <InputAdornment position="end">
                <Button
                  size="small"
                  onClick={() => handleFilterChange('search', '')}
                  sx={{ minWidth: 'auto', p: 0.5 }}
                >
                  <ClearIcon fontSize="small" />
                </Button>
              </InputAdornment>
            ),
          }}
          size="small"
        />

        {/* Linha 2: Filtros principais */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {/* Status */}
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={localFilters.status}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="pending">Por Fazer</MenuItem>
              <MenuItem value="in_progress">Em Progresso</MenuItem>
              <MenuItem value="completed">Concluídas</MenuItem>
              <MenuItem value="cancelled">Canceladas</MenuItem>
            </Select>
          </FormControl>

          {/* Prioridade */}
          <FormControl fullWidth size="small">
            <InputLabel>Prioridade</InputLabel>
            <Select
              value={localFilters.priority}
              label="Prioridade"
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <MenuItem value="all">Todas</MenuItem>
              <MenuItem value="urgente">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>🔴</span> Urgente
                </Box>
              </MenuItem>
              <MenuItem value="alta">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>🟠</span> Alta
                </Box>
              </MenuItem>
              <MenuItem value="media">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>🟡</span> Média
                </Box>
              </MenuItem>
              <MenuItem value="baixa">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>🟢</span> Baixa
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Atribuído a */}
          <FormControl fullWidth size="small">
            <InputLabel>Atribuído a</InputLabel>
            <Select
              value={localFilters.assignedTo}
              label="Atribuído a"
              onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="me">Atribuídas a mim</MenuItem>
            </Select>
          </FormControl>

          {/* Cliente (só admin) */}
          {isAdmin && metadata.associates?.length > 0 && (
            <FormControl fullWidth size="small">
              <InputLabel>Cliente</InputLabel>
              <Select
                value={localFilters.client}
                label="Cliente"
                onChange={(e) => handleFilterChange('client', e.target.value)}
                startAdornment={
                  localFilters.client !== 'all' ? (
                    <PersonIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} />
                  ) : null
                }
              >
                <MenuItem value="all">Todos os clientes</MenuItem>
                {metadata.associates.map((client) => (
                  <MenuItem key={client.pk} value={client.pk}>
                    {client.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>

        {/* Filtros ativos e ações */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={1}
        >
          {/* Badges de filtros ativos */}
          {hasActiveFilters && (
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
              {localFilters.status !== 'all' && (
                <Chip
                  label={`Status: ${localFilters.status}`}
                  size="small"
                  onDelete={() => handleFilterChange('status', 'all')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {localFilters.priority !== 'all' && (
                <Chip
                  label={`Prioridade: ${localFilters.priority}`}
                  size="small"
                  onDelete={() => handleFilterChange('priority', 'all')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {localFilters.assignedTo === 'me' && (
                <Chip
                  label="Minhas tarefas"
                  size="small"
                  onDelete={() => handleFilterChange('assignedTo', 'all')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {localFilters.client !== 'all' && (
                <Chip
                  icon={<PersonIcon fontSize="small" />}
                  label={`Cliente: ${getClientName(localFilters.client)}`}
                  size="small"
                  onDelete={() => handleFilterChange('client', 'all')}
                  color="secondary"
                  variant="outlined"
                />
              )}
            </Stack>
          )}

          {/* Botão limpar */}
          {hasActiveFilters && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleReset}
              sx={{ ml: 'auto' }}
            >
              Limpar Filtros
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};

QuickFilters.propTypes = {
  filters: PropTypes.object,
  onChange: PropTypes.func,
  onReset: PropTypes.func,
  isAdmin: PropTypes.bool,
};

export default QuickFilters;
