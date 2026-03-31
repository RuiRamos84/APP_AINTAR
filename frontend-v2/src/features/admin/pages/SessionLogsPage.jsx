/**
 * SessionLogsPage
 * Logs de sessões — paginação server-side + filtros de data/utilizador
 */

import { useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Chip, Stack, IconButton, Button,
  Tooltip, Card, CardContent, useTheme, alpha,
  TextField, FormControlLabel, Switch,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
} from '@mui/material';
import {
  VpnKey as SessionIcon,
  Refresh as RefreshIcon,
  CheckCircle as ActiveIcon,
  Cancel as ExpiredIcon,
  FilterList as FilterIcon,
  PersonOff as KillUserIcon,
  LogoutOutlined as KillAllIcon,
  HourglassDisabled as KillStaleIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data/SearchBar/SearchBar';
import apiClient from '@/services/api/client';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { toast } from 'sonner';

// ─── Utils ────────────────────────────────────────────────────────────────────

const toLocalDate = (isoString) => {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('pt-PT');
};

const fmtDuration = (seconds) => {
  if (!seconds || seconds < 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

const todayISO = () => new Date().toISOString().split('T')[0];
const daysAgoISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useSessionLogs = ({ page, pageSize, username, dateFrom, dateTo, activeOnly }) => {
  const params = new URLSearchParams({
    page:       String(page + 1), // DataGrid é 0-based, backend é 1-based
    per_page:   String(pageSize),
    date_from:  dateFrom,
    date_to:    dateTo,
    ...(username   && { username }),
    ...(activeOnly && { active_only: 'true' }),
  });

  return useQuery({
    queryKey: ['admin', 'session-logs', page, pageSize, username, dateFrom, dateTo, activeOnly],
    queryFn:  () => apiClient.get(`/admin/logs/sessions?${params}`),
    staleTime: 60 * 1000,
    keepPreviousData: true,
  });
};

// ─── Kill sessions confirm dialog ────────────────────────────────────────────

const KILL_MODES = {
  user:  { label: 'Utilizador',            icon: KillUserIcon,  color: 'warning', description: (u) => `Terminar todas as sessões ativas do utilizador "${u}".` },
  all:   { label: 'Todas as sessões',      icon: KillAllIcon,   color: 'error',   description: () => 'Terminar TODAS as sessões ativas (exceto a sua). Use apenas em situações de emergência.' },
  stale: { label: 'Sessões prolongadas',   icon: KillStaleIcon, color: 'warning', description: () => 'Terminar sessões ativas há mais de 8 horas sem actividade.' },
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const SessionLogsPage = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();

  // ── Paginação ──────────────────────────────────────────────────────────────
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 50 });

  // ── Kill dialog ────────────────────────────────────────────────────────────
  const [killDialog, setKillDialog] = useState({ open: false, mode: null, username: null });

  const { mutate: killSessions, isPending: isKilling } = useMutation({
    mutationFn: ({ mode, username }) =>
      apiClient.post('/admin/logs/sessions/kill', { mode, username }),
    onSuccess: (data) => {
      toast.success(data?.message ?? 'Sessões terminadas.');
      setKillDialog({ open: false, mode: null, username: null });
      queryClient.invalidateQueries({ queryKey: ['admin', 'session-logs'] });
    },
    onError: () => toast.error('Erro ao terminar sessões.'),
  });

  const openKill = (mode, username = null) => setKillDialog({ open: true, mode, username });

  // ── Filtros ────────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput]   = useState('');
  const [dateFrom, setDateFrom]         = useState(daysAgoISO(7));
  const [dateTo, setDateTo]             = useState(todayISO());
  const [activeOnly, setActiveOnly]     = useState(false);

  // Debounce na pesquisa para não disparar pedidos a cada tecla
  const username = useDebouncedValue(searchInput, 400);

  // Reset para página 0 ao mudar filtros
  const handleFilterChange = useCallback((setter) => (val) => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setter(val);
  }, []);

  const { data, isLoading, isError, refetch, isFetching } = useSessionLogs({
    page:       paginationModel.page,
    pageSize:   paginationModel.pageSize,
    username,
    dateFrom,
    dateTo,
    activeOnly,
  });

  const sessions = data?.sessions ?? [];
  const total    = data?.total    ?? 0;

  // ── Stats (apenas da página actual, dados do servidor) ─────────────────────
  const activeSessions = sessions.filter((s) => s.active).length;

  // ── Colunas ────────────────────────────────────────────────────────────────
  const columns = [
    { field: 'username',   headerName: 'Utilizador',  width: 160 },
    {
      field: 'startdate', headerName: 'Login', width: 160,
      valueFormatter: (v) => toLocalDate(v),
    },
    {
      field: 'stopdate', headerName: 'Logout', width: 160,
      valueFormatter: (v) => toLocalDate(v),
    },
    {
      field: 'duration_seconds', headerName: 'Duração', width: 100,
      valueFormatter: (v) => fmtDuration(v),
    },
    {
      field: 'profile', headerName: 'Perfil', width: 80,
      valueFormatter: (v) => v ?? '—',
    },
    {
      field: 'active', headerName: 'Estado', width: 110,
      renderCell: ({ value }) => (
        <Chip
          label={value ? 'Ativa' : 'Expirada'}
          size="small"
          color={value ? 'success' : 'default'}
          icon={value
            ? <ActiveIcon  sx={{ fontSize: '14px !important' }} />
            : <ExpiredIcon sx={{ fontSize: '14px !important' }} />}
        />
      ),
    },
    {
      field: '_actions', headerName: '', width: 110, sortable: false,
      renderCell: ({ row }) => row.active ? (
        <Tooltip title={`Terminar todas as sessões de "${row.username}"`}>
          <Button
            size="small" variant="outlined" color="warning"
            startIcon={<KillUserIcon sx={{ fontSize: '14px !important' }} />}
            onClick={(e) => { e.stopPropagation(); openKill('user', row.username); }}
            sx={{ fontSize: '0.7rem', py: 0.25 }}
          >
            Terminar
          </Button>
        </Tooltip>
      ) : null,
    },
  ];

  return (
    <ModulePage
      title="Logs de Sessões"
      subtitle={`${total.toLocaleString('pt-PT')} registos · ${dateFrom} → ${dateTo}`}
      icon={SessionIcon}
      color="#f44336"
      breadcrumbs={[{ label: 'Logs de Sessões' }]}
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Terminar sessões prolongadas (> 8h)">
            <Button
              size="small" variant="outlined" color="warning"
              startIcon={<KillStaleIcon />}
              onClick={() => openKill('stale')}
            >
              Limpeza
            </Button>
          </Tooltip>
          <Tooltip title="Terminar TODAS as sessões ativas">
            <Button
              size="small" variant="outlined" color="error"
              startIcon={<KillAllIcon />}
              onClick={() => openKill('all')}
            >
              Terminar todas
            </Button>
          </Tooltip>
          <Tooltip title="Atualizar">
            <IconButton onClick={refetch} disabled={isFetching}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      }
    >
      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total (período)',   value: total,           color: 'info' },
          { label: 'Ativas (página)',   value: activeSessions,  color: 'success' },
          { label: 'Página atual',      value: `${paginationModel.page + 1} / ${Math.max(1, Math.ceil(total / paginationModel.pageSize))}`, color: 'primary' },
        ].map(({ label, value, color }) => (
          <Card key={label} variant="outlined" sx={{ flex: 1, bgcolor: alpha(theme.palette[color]?.main || '#000', 0.04) }}>
            <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h4" fontWeight={800} color={`${color}.main`}>{value}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* ── Filtros ────────────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <FilterIcon fontSize="small" color="action" />
            <Typography variant="caption" fontWeight={600} color="text.secondary">Filtros</Typography>
          </Box>
          <SearchBar
            searchTerm={searchInput}
            onSearch={handleFilterChange(setSearchInput)}
            placeholder="Utilizador..."
          />
          <TextField
            type="date"
            label="De"
            size="small"
            value={dateFrom}
            onChange={(e) => handleFilterChange(setDateFrom)(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 155 }}
          />
          <TextField
            type="date"
            label="Até"
            size="small"
            value={dateTo}
            onChange={(e) => handleFilterChange(setDateTo)(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: todayISO() }}
            sx={{ width: 155 }}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={activeOnly}
                onChange={(e) => handleFilterChange(setActiveOnly)(e.target.checked)}
              />
            }
            label={<Typography variant="body2">Só ativas</Typography>}
          />
          {/* Atalhos de período */}
          <Stack direction="row" spacing={0.5}>
            {[
              { label: 'Hoje',    days: 0 },
              { label: '7 dias',  days: 7 },
              { label: '30 dias', days: 30 },
            ].map(({ label, days }) => (
              <Chip
                key={label}
                label={label}
                size="small"
                variant={dateFrom === daysAgoISO(days) && dateTo === todayISO() ? 'filled' : 'outlined'}
                color="primary"
                onClick={() => {
                  handleFilterChange(setDateFrom)(daysAgoISO(days));
                  handleFilterChange(setDateTo)(todayISO());
                }}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      {/* ── Tabela ─────────────────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2 }}>
        <DataGrid
          rows={sessions}
          columns={columns}
          getRowId={(r) => r.pk}
          loading={isLoading || isFetching}
          // Server-side pagination
          paginationMode="server"
          rowCount={total}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[25, 50, 100]}
          disableRowSelectionOnClick
          autoHeight
          initialState={{
            sorting: { sortModel: [{ field: 'startdate', sort: 'desc' }] },
          }}
          sx={{ border: 0 }}
          localeText={{
            noRowsLabel: isError
              ? 'Erro ao carregar logs de sessões.'
              : 'Sem registos para o período selecionado.',
          }}
        />
      </Paper>
      {/* ── Diálogo de confirmação kill ──────────────────────────────────── */}
      {killDialog.mode && (() => {
        const cfg = KILL_MODES[killDialog.mode];
        return (
          <Dialog
            open={killDialog.open}
            onClose={() => !isKilling && setKillDialog({ open: false, mode: null, username: null })}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <cfg.icon color={cfg.color} />
              Terminar sessões — {cfg.label}
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                {cfg.description(killDialog.username)}
              </DialogContentText>
              {killDialog.mode !== 'user' && (
                <Box
                  sx={{ mt: 1.5, p: 1.5, borderRadius: 1, bgcolor: alpha(theme.palette.warning.main, 0.08), border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}` }}
                >
                  <Typography variant="caption" color="warning.dark">
                    Esta ação força o logout imediato. Os utilizadores afetados terão de autenticar-se novamente.
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setKillDialog({ open: false, mode: null, username: null })} disabled={isKilling}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                color={cfg.color}
                disabled={isKilling}
                onClick={() => killSessions({ mode: killDialog.mode, username: killDialog.username })}
              >
                {isKilling ? 'A terminar...' : 'Confirmar'}
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}
    </ModulePage>
  );
};

export default SessionLogsPage;
