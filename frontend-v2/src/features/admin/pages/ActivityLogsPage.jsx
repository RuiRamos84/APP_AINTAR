/**
 * ActivityLogsPage
 * Logs de atividade do sistema — auditoria de ações dos utilizadores
 */

import { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Chip, Stack,
  IconButton, Alert, Divider, Tooltip,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
  History as LogIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import apiClient from '@/services/api/client';

// ─── Action type config ───────────────────────────────────────────────────────

const ACTION_CFG = {
  CREATE:  { label: 'Criação',    color: 'success', icon: AddIcon },
  UPDATE:  { label: 'Edição',     color: 'info',    icon: EditIcon },
  DELETE:  { label: 'Eliminação', color: 'error',   icon: DeleteIcon },
  LOGIN:   { label: 'Login',      color: 'primary', icon: LoginIcon },
  LOGOUT:  { label: 'Logout',     color: 'default', icon: LogoutIcon },
  VIEW:    { label: 'Consulta',   color: 'default', icon: PersonIcon },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useLogs = (filters) =>
  useQuery({
    queryKey: ['admin', 'activity-logs', filters],
    queryFn: () => apiClient.get('/admin/logs/activity', { params: filters }),
    staleTime: 60 * 1000,
    select: (res) => res?.logs ?? res?.data ?? [],
    retry: 1,
  });

// ─── Componente Principal ─────────────────────────────────────────────────────

const ActivityLogsPage = () => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filters = useMemo(() => ({
    ...(actionFilter && { action: actionFilter }),
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo && { date_to: dateTo }),
  }), [actionFilter, dateFrom, dateTo]);

  const { data: logs = [], isLoading, isError, refetch } = useLogs(filters);

  const filtered = useSearch(logs, search);

  const columns = [
    {
      field: 'timestamp', headerName: 'Data/Hora', width: 160,
      valueFormatter: (v) => v ? new Date(v).toLocaleString('pt-PT') : '—',
    },
    { field: 'user_name', headerName: 'Utilizador', width: 150 },
    {
      field: 'action', headerName: 'Ação', width: 120,
      renderCell: ({ value }) => {
        const cfg = ACTION_CFG[value] ?? { label: value, color: 'default' };
        return <Chip label={cfg.label} size="small" color={cfg.color} />;
      },
    },
    { field: 'resource', headerName: 'Recurso', flex: 1, minWidth: 160 },
    { field: 'resource_id', headerName: 'ID', width: 80 },
    { field: 'ip', headerName: 'IP', width: 130 },
    {
      field: 'success', headerName: 'Estado', width: 90,
      renderCell: ({ value }) => (
        <Chip label={value ? 'OK' : 'Erro'} size="small" color={value ? 'success' : 'error'} />
      ),
    },
  ];

  const clearFilters = () => {
    setSearch('');
    setActionFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = search || actionFilter || dateFrom || dateTo;

  return (
    <ModulePage
      title="Logs de Atividade"
      subtitle="Auditoria de todas as ações realizadas no sistema"
      icon={LogIcon}
      color="#f44336"
      breadcrumbs={[{ label: 'Logs de Atividade' }]}
      actions={
        <Tooltip title="Atualizar"><IconButton onClick={refetch}><RefreshIcon /></IconButton></Tooltip>
      }
    >
      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" alignItems="center">
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <SearchBar searchTerm={search} onSearch={setSearch} />
          </Box>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Tipo de Ação</InputLabel>
            <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} label="Tipo de Ação">
              <MenuItem value="">Todos</MenuItem>
              {Object.entries(ACTION_CFG).map(([key, cfg]) => (
                <MenuItem key={key} value={key}>{cfg.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" type="date" label="De" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 140 }} />
          <TextField size="small" type="date" label="Até" value={dateTo} onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 140 }} />
          {hasFilters && (
            <Button size="small" startIcon={<CloseIcon />} onClick={clearFilters} color="error" variant="text">
              Limpar
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Tabela */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            {filtered.length} {filtered.length === 1 ? 'registo' : 'registos'}
          </Typography>
          {hasFilters && (
            <Chip label="Filtros ativos" size="small" color="info" variant="outlined" />
          )}
        </Box>
        <Divider />
        {isError || (!isLoading && logs.length === 0) ? (
          <Alert severity="warning" icon={false} sx={{ m: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Funcionalidade em desenvolvimento</Typography>
            <Typography variant="body2" color="text.secondary">
              O registo de auditoria de atividade ainda não está disponível nesta versão.
            </Typography>
          </Alert>
        ) : (
          <DataGrid
            rows={filtered}
            columns={columns}
            getRowId={(r) => r.pk ?? r.id ?? Math.random()}
            loading={isLoading}
            autoHeight
            disableRowSelectionOnClick
            pageSizeOptions={[50, 100, 200]}
            initialState={{ pagination: { paginationModel: { pageSize: 50 } }, sorting: { sortModel: [{ field: 'timestamp', sort: 'desc' }] } }}
            sx={{ border: 0 }}
          />
        )}
      </Paper>
    </ModulePage>
  );
};

export default ActivityLogsPage;
