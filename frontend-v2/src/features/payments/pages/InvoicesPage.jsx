/**
 * InvoicesPage
 * Consulta de faturas — integração com documentos e pagamentos
 */

import { useState } from 'react';
import {
  Box, Grid, Paper, Typography, TextField, Button, Chip, Stack,
  InputAdornment, IconButton, Alert, Skeleton, Card, CardContent,
  Divider, Tab, Tabs, Fade, useTheme, alpha,
} from '@mui/material';
import {
  Receipt as ReceiptIcon, Search as SearchIcon,
  Download as DownloadIcon, Visibility as ViewIcon,
  AttachMoney as MoneyIcon, CheckCircle as PaidIcon,
  HourglassEmpty as PendingIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { toast } from 'sonner';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import apiClient from '@/services/api/client';
import { useQuery } from '@tanstack/react-query';

// ─── Hooks ─────────────────────────────────────────────────────────────────

const useInvoices = (filters = {}) =>
  useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => apiClient.get('/payments/invoices', { params: filters }),
    staleTime: 3 * 60 * 1000,
    select: (res) => res?.invoices ?? res?.data ?? [],
    enabled: !!filters._enabled,
  });

const usePendingInvoices = () =>
  useQuery({
    queryKey: ['invoices', 'pending'],
    queryFn: () => apiClient.get('/payments/invoices/pending'),
    staleTime: 2 * 60 * 1000,
    select: (res) => res?.invoices ?? res?.data ?? [],
  });

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS = {
  paid:    { label: 'Paga',     color: 'success', icon: PaidIcon },
  pending: { label: 'Pendente', color: 'warning', icon: PendingIcon },
  overdue: { label: 'Em Atraso', color: 'error',  icon: MoneyIcon },
  issued:  { label: 'Emitida',  color: 'info',    icon: ReceiptIcon },
};

// ─── Stats Card ───────────────────────────────────────────────────────────────

const StatCard = ({ label, value, color, icon: Icon }) => {
  const theme = useTheme();
  return (
    <Card sx={{ bgcolor: alpha(theme.palette[color]?.main || '#000', 0.06), border: `1px solid ${alpha(theme.palette[color]?.main || '#000', 0.2)}` }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: theme.palette[color]?.main, color: 'white' }}>
          <Icon sx={{ fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const InvoicesPage = () => {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');

  const { data: pendingInvoices = [], isLoading: pendingLoading, isError: pendingError } = usePendingInvoices();

  // Columns for DataGrid
  const columns = [
    { field: 'pk', headerName: 'Nº Fatura', width: 110 },
    { field: 'regnumber', headerName: 'Pedido', width: 130 },
    { field: 'ts_entity', headerName: 'Entidade', flex: 1, minWidth: 160 },
    {
      field: 'amount', headerName: 'Valor', width: 120,
      valueFormatter: (v) => v ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v) : '—',
    },
    {
      field: 'created_at', headerName: 'Data', width: 110,
      valueFormatter: (v) => v ? new Date(v).toLocaleDateString('pt-PT') : '—',
    },
    {
      field: 'status', headerName: 'Estado', width: 120,
      renderCell: ({ value }) => {
        const s = STATUS[value] || STATUS.issued;
        return <Chip label={s.label} size="small" color={s.color} />;
      },
    },
    {
      field: 'actions', headerName: '', width: 80, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" title="Ver"><ViewIcon fontSize="small" /></IconButton>
          <IconButton size="small" title="Descarregar"><DownloadIcon fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ];

  // Filter pending invoices
  const filtered = pendingInvoices.filter((inv) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      String(inv.pk).includes(s) ||
      inv.regnumber?.toLowerCase().includes(s) ||
      inv.ts_entity?.toLowerCase().includes(s)
    );
  });

  return (
    <ModulePage
      title="Faturas"
      subtitle="Consulta e gestão de faturas emitidas"
      icon={ReceiptIcon}
      color="#2196f3"
      breadcrumbs={[
        { label: 'Pagamentos', path: '/payments' },
        { label: 'Faturas', path: '/invoices' },
      ]}
    >
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {pendingLoading ? (
          [1,2,3,4].map((i) => <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}><Skeleton variant="rounded" height={80} /></Grid>)
        ) : (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="Total" value={pendingInvoices.length} color="info" icon={ReceiptIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="Pendentes" value={pendingInvoices.filter(i => i.status === 'pending').length} color="warning" icon={PendingIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="Pagas" value={pendingInvoices.filter(i => i.status === 'paid').length} color="success" icon={PaidIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="Em Atraso" value={pendingInvoices.filter(i => i.status === 'overdue').length} color="error" icon={MoneyIcon} />
            </Grid>
          </>
        )}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="Pendentes" />
          <Tab label="Todas as Faturas" />
          <Tab label="Planos de Pagamento" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {/* Search */}
          <TextField
            size="small" placeholder="Pesquisar faturas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2, maxWidth: 320 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon fontSize="small" /></IconButton></InputAdornment> : null,
            }}
          />

          <Fade in key={tab} timeout={200}>
            <Box>
              {tab === 0 && (
                pendingLoading ? <Skeleton variant="rounded" height={300} /> :
                pendingError ? <Alert severity="error">Erro ao carregar faturas</Alert> :
                filtered.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
                    <ReceiptIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                    <Typography variant="h6">Sem faturas pendentes</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>Todas as faturas foram processadas</Typography>
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
                )
              )}
              {tab === 1 && (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
                  <ReceiptIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                  <Typography variant="h6">Histórico de Faturas</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Consulte todas as faturas emitidas no módulo de Pagamentos
                  </Typography>
                  <Button variant="outlined" sx={{ mt: 2 }} href="/payments">
                    Ir para Pagamentos
                  </Button>
                </Box>
              )}
              {tab === 2 && (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
                  <MoneyIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                  <Typography variant="h6">Planos de Pagamento</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>Em desenvolvimento</Typography>
                </Box>
              )}
            </Box>
          </Fade>
        </Box>
      </Paper>
    </ModulePage>
  );
};

export default InvoicesPage;
