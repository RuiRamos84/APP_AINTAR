/**
 * RequestsPage
 * Gestão de pedidos internos — abertura, fecho e replicação
 */

import { useState, useMemo } from 'react';
import {
  Box, Grid, Paper, Typography, TextField, Button, Chip, Stack,
  IconButton, InputAdornment, Card, CardContent, Tabs, Tab,
  Alert, Skeleton, Divider, Tooltip, Fade, useTheme, useMediaQuery, alpha,
} from '@mui/material';
import {
  Assignment as RequestIcon,
  Search as SearchIcon,
  Add as AddIcon,
  CheckCircle as CloseRequestIcon,
  ContentCopy as ReplicateIcon,
  HourglassEmpty as PendingIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import apiClient from '@/services/api/client';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS = {
  open:       { label: 'Aberto',     color: 'info' },
  pending:    { label: 'Pendente',   color: 'warning' },
  closed:     { label: 'Concluído',  color: 'success' },
  cancelled:  { label: 'Cancelado',  color: 'error' },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useRequests = (statusFilter) =>
  useQuery({
    queryKey: ['requests', statusFilter],
    queryFn: () => apiClient.get('/requests', { params: statusFilter ? { status: statusFilter } : {} }),
    staleTime: 2 * 60 * 1000,
    select: (res) => res?.requests ?? res?.data ?? [],
    retry: 1,
  });

// ─── Componente Principal ─────────────────────────────────────────────────────

const RequestsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [tab, setTab]       = useState(0);
  const [search, setSearch] = useState('');

  const statusFilter = [null, 'open', 'pending', 'closed'][tab];
  const { data: requests = [], isLoading, isError, refetch } = useRequests(statusFilter);

  const filtered = useMemo(() => {
    if (!search) return requests;
    const s = search.toLowerCase();
    return requests.filter((r) =>
      String(r.pk).includes(s) ||
      r.regnumber?.toLowerCase().includes(s) ||
      r.description?.toLowerCase().includes(s) ||
      r.ts_entity?.toLowerCase().includes(s)
    );
  }, [requests, search]);

  const handleAction = async (action, request) => {
    try {
      if (action === 'close')     await apiClient.post(`/requests/${request.pk}/close`);
      if (action === 'replicate') await apiClient.post(`/requests/${request.pk}/replicate`);
      toast.success('Ação realizada com sucesso!');
      refetch();
    } catch (e) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  const columns = [
    { field: 'pk', headerName: 'Nº', width: 80 },
    { field: 'regnumber', headerName: 'Referência', width: 140 },
    { field: 'description', headerName: 'Descrição', flex: 1, minWidth: 180 },
    { field: 'ts_entity', headerName: 'Entidade', width: 160 },
    {
      field: 'created_at', headerName: 'Data', width: 110,
      valueFormatter: (v) => v ? new Date(v).toLocaleDateString('pt-PT') : '—',
    },
    {
      field: 'status', headerName: 'Estado', width: 120,
      renderCell: ({ value }) => {
        const s = STATUS[value] ?? STATUS.open;
        return <Chip label={s.label} size="small" color={s.color} />;
      },
    },
    {
      field: 'actions', headerName: '', width: 100, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Concluir">
            <IconButton size="small" color="success" onClick={() => handleAction('close', row)}>
              <CloseRequestIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Replicar">
            <IconButton size="small" color="info" onClick={() => handleAction('replicate', row)}>
              <ReplicateIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const counts = {
    all:     requests.length,
    open:    requests.filter((r) => r.status === 'open').length,
    pending: requests.filter((r) => r.status === 'pending').length,
    closed:  requests.filter((r) => r.status === 'closed').length,
  };

  return (
    <ModulePage
      title="Pedidos"
      subtitle="Gestão e acompanhamento de pedidos de serviço"
      icon={RequestIcon}
      color="#8e24aa"
      breadcrumbs={[
        { label: 'Pedidos', path: '/requests' },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Tooltip title="Atualizar">
            <IconButton onClick={refetch}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} size="small">
            Novo Pedido
          </Button>
        </Stack>
      }
    >
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total',     value: counts.all,     color: 'info' },
          { label: 'Abertos',   value: counts.open,    color: 'primary' },
          { label: 'Pendentes', value: counts.pending,  color: 'warning' },
          { label: 'Concluídos', value: counts.closed,  color: 'success' },
        ].map(({ label, value, color }) => (
          <Grid key={label} size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined" sx={{ bgcolor: alpha(theme.palette[color]?.main || '#000', 0.04) }}>
              <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h4" fontWeight={800} color={`${color}.main`}>{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs + table */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label={`Todos (${counts.all})`} />
          <Tab label={`Abertos (${counts.open})`} />
          <Tab label={`Pendentes (${counts.pending})`} />
          <Tab label={`Concluídos (${counts.closed})`} />
        </Tabs>

        <Box sx={{ p: 2 }}>
          <TextField
            size="small" placeholder="Pesquisar pedidos..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2, maxWidth: 320 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search
                ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon fontSize="small" /></IconButton></InputAdornment>
                : null,
            }}
          />

          <Fade in key={tab} timeout={200}>
            <Box>
              {isLoading ? (
                <Skeleton variant="rounded" height={300} />
              ) : isError ? (
                <Alert severity="error">Erro ao carregar pedidos.</Alert>
              ) : filtered.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
                  <RequestIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                  <Typography variant="h6">Sem pedidos</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>Não existem pedidos para os critérios selecionados</Typography>
                </Box>
              ) : (
                <DataGrid
                  rows={filtered} columns={columns}
                  getRowId={(r) => r.pk}
                  autoHeight disableRowSelectionOnClick
                  pageSizeOptions={[25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                  sx={{ border: 0 }}
                />
              )}
            </Box>
          </Fade>
        </Box>
      </Paper>
    </ModulePage>
  );
};

export default RequestsPage;
