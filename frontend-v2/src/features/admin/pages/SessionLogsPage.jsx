/**
 * SessionLogsPage
 * Logs de sessões — histórico de logins, logouts e sessões ativas
 */

import { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Chip, Stack,
  IconButton, InputAdornment, Alert, Divider, Tooltip,
  Card, CardContent, useTheme, alpha,
} from '@mui/material';
import {
  VpnKey as SessionIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  CheckCircle as ActiveIcon,
  Cancel as ExpiredIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import apiClient from '@/services/api/client';

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useSessionLogs = () =>
  useQuery({
    queryKey: ['admin', 'session-logs'],
    queryFn: () => apiClient.get('/admin/logs/sessions'),
    staleTime: 60 * 1000,
    select: (res) => res?.sessions ?? res?.data ?? [],
    retry: 1,
  });

// ─── Componente Principal ─────────────────────────────────────────────────────

const SessionLogsPage = () => {
  const theme = useTheme();
  const [search, setSearch] = useState('');

  const { data: sessions = [], isLoading, isError, refetch } = useSessionLogs();

  const filtered = useMemo(() => {
    if (!search) return sessions;
    const s = search.toLowerCase();
    return sessions.filter((sess) =>
      sess.user_name?.toLowerCase().includes(s) ||
      sess.ip?.toLowerCase().includes(s) ||
      sess.device?.toLowerCase().includes(s)
    );
  }, [sessions, search]);

  // Métricas rápidas
  const activeSessions = sessions.filter((s) => s.active);
  const todaySessions = sessions.filter((s) => {
    if (!s.login_at) return false;
    return new Date(s.login_at).toDateString() === new Date().toDateString();
  });

  const columns = [
    { field: 'user_name', headerName: 'Utilizador', width: 160 },
    {
      field: 'login_at', headerName: 'Login', width: 160,
      valueFormatter: (v) => v ? new Date(v).toLocaleString('pt-PT') : '—',
    },
    {
      field: 'logout_at', headerName: 'Logout', width: 160,
      valueFormatter: (v) => v ? new Date(v).toLocaleString('pt-PT') : '—',
    },
    {
      field: 'duration', headerName: 'Duração', width: 100,
      valueFormatter: (v) => v ? `${Math.round(v / 60)} min` : '—',
    },
    { field: 'ip', headerName: 'IP', width: 130 },
    { field: 'device', headerName: 'Dispositivo', flex: 1, minWidth: 140 },
    {
      field: 'active', headerName: 'Estado', width: 100,
      renderCell: ({ value }) => (
        <Chip
          label={value ? 'Ativa' : 'Expirada'}
          size="small"
          color={value ? 'success' : 'default'}
          icon={value
            ? <ActiveIcon sx={{ fontSize: '14px !important' }} />
            : <ExpiredIcon sx={{ fontSize: '14px !important' }} />}
        />
      ),
    },
  ];

  return (
    <ModulePage
      title="Logs de Sessões"
      subtitle="Histórico de autenticações e sessões ativas"
      icon={SessionIcon}
      color="#f44336"
      breadcrumbs={[{ label: 'Logs de Sessões' }]}
      actions={
        <Tooltip title="Atualizar"><IconButton onClick={refetch}><RefreshIcon /></IconButton></Tooltip>
      }
    >
      {/* Stats */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total de Sessões',     value: sessions.length,        color: 'info' },
          { label: 'Sessões Ativas',        value: activeSessions.length,  color: 'success' },
          { label: 'Sessões Hoje',          value: todaySessions.length,   color: 'primary' },
        ].map(({ label, value, color }) => (
          <Card key={label} variant="outlined" sx={{ flex: 1, bgcolor: alpha(theme.palette[color]?.main || '#000', 0.04) }}>
            <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h4" fontWeight={800} color={`${color}.main`}>{value}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Filtro + tabela */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            size="small" placeholder="Utilizador, IP, dispositivo..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ maxWidth: 340 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon fontSize="small" /></IconButton></InputAdornment> : null,
            }}
          />
        </Box>
        <Divider />
        {isError ? (
          <Alert severity="error" sx={{ m: 2 }}>Erro ao carregar logs de sessões.</Alert>
        ) : (
          <DataGrid
            rows={filtered}
            columns={columns}
            getRowId={(r) => r.pk ?? r.id ?? Math.random()}
            loading={isLoading}
            autoHeight
            disableRowSelectionOnClick
            pageSizeOptions={[50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 50 } },
              sorting: { sortModel: [{ field: 'login_at', sort: 'desc' }] },
            }}
            sx={{ border: 0 }}
          />
        )}
      </Paper>
    </ModulePage>
  );
};

export default SessionLogsPage;
