/**
 * ClientContractsPage
 * Contratos de clientes — consulta e gestão de contratos de serviço
 */

import { useState, useMemo } from 'react';
import {
  Box, Grid, Paper, Typography, TextField, Button, Chip, Stack,
  IconButton, InputAdornment, Card, CardContent, Alert, Skeleton,
  Divider, Tooltip, useTheme, alpha,
} from '@mui/material';
import {
  Description as ContractIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  CalendarToday as DateIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import apiClient from '@/services/api/client';

// ─── Status ───────────────────────────────────────────────────────────────────

const STATUS = {
  active:   { label: 'Ativo',     color: 'success' },
  inactive: { label: 'Inativo',   color: 'default' },
  pending:  { label: 'Pendente',  color: 'warning' },
  expired:  { label: 'Expirado',  color: 'error' },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useContracts = (search) =>
  useQuery({
    queryKey: ['contracts', search],
    queryFn: () => apiClient.get('/clients/contracts', { params: search ? { q: search } : {} }),
    staleTime: 3 * 60 * 1000,
    select: (res) => res?.contracts ?? res?.data ?? [],
    retry: 1,
    enabled: true,
  });

// ─── Componente Principal ─────────────────────────────────────────────────────

const ClientContractsPage = () => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data: contracts = [], isLoading, isError, refetch } = useContracts(debouncedSearch);

  const handleSearch = (value) => {
    setSearch(value);
    clearTimeout(window._contractSearchTimer);
    window._contractSearchTimer = setTimeout(() => setDebouncedSearch(value), 400);
  };

  const filtered = useMemo(() => {
    if (!search) return contracts;
    const s = search.toLowerCase();
    return contracts.filter((c) =>
      String(c.pk).includes(s) ||
      c.contract_number?.toLowerCase().includes(s) ||
      c.ts_entity?.toLowerCase().includes(s) ||
      c.service_type?.toLowerCase().includes(s)
    );
  }, [contracts, search]);

  const columns = [
    { field: 'pk', headerName: 'Nº', width: 80 },
    { field: 'contract_number', headerName: 'Nº Contrato', width: 150 },
    { field: 'ts_entity', headerName: 'Cliente', flex: 1, minWidth: 200 },
    { field: 'service_type', headerName: 'Tipo de Serviço', width: 160 },
    {
      field: 'start_date', headerName: 'Início', width: 110,
      valueFormatter: (v) => v ? new Date(v).toLocaleDateString('pt-PT') : '—',
    },
    {
      field: 'end_date', headerName: 'Término', width: 110,
      valueFormatter: (v) => v ? new Date(v).toLocaleDateString('pt-PT') : '—',
    },
    {
      field: 'amount', headerName: 'Valor', width: 120,
      valueFormatter: (v) => v
        ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)
        : '—',
    },
    {
      field: 'status', headerName: 'Estado', width: 110,
      renderCell: ({ value }) => {
        const s = STATUS[value] ?? STATUS.inactive;
        return <Chip label={s.label} size="small" color={s.color} />;
      },
    },
    {
      field: 'actions', headerName: '', width: 60, sortable: false,
      renderCell: () => (
        <Tooltip title="Ver contrato">
          <IconButton size="small"><ViewIcon fontSize="small" /></IconButton>
        </Tooltip>
      ),
    },
  ];

  const counts = {
    total:    contracts.length,
    active:   contracts.filter((c) => c.status === 'active').length,
    pending:  contracts.filter((c) => c.status === 'pending').length,
    expired:  contracts.filter((c) => c.status === 'expired').length,
  };

  return (
    <ModulePage
      title="Contratos de Clientes"
      subtitle="Consulta e gestão de contratos de prestação de serviços"
      icon={ContractIcon}
      color="#00897b"
      breadcrumbs={[
        { label: 'Pagamentos', path: '/payments' },
        { label: 'Clientes', path: '/clients' },
        { label: 'Contratos', path: '/clients/contracts' },
      ]}
      actions={
        <Tooltip title="Atualizar">
          <IconButton onClick={refetch}><RefreshIcon /></IconButton>
        </Tooltip>
      }
    >
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total',    value: counts.total,   color: 'info' },
          { label: 'Ativos',   value: counts.active,  color: 'success' },
          { label: 'Pendentes', value: counts.pending, color: 'warning' },
          { label: 'Expirados', value: counts.expired, color: 'error' },
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

      {/* Table */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            size="small" placeholder="Pesquisar por cliente, nº contrato, tipo..."
            value={search} onChange={(e) => handleSearch(e.target.value)}
            sx={{ maxWidth: 380 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search
                ? <InputAdornment position="end"><IconButton size="small" onClick={() => handleSearch('')}><CloseIcon fontSize="small" /></IconButton></InputAdornment>
                : null,
            }}
          />
        </Box>
        <Divider />

        {isLoading ? (
          <Box sx={{ p: 2 }}><Skeleton variant="rounded" height={300} /></Box>
        ) : isError ? (
          <Alert severity="error" sx={{ m: 2 }}>Erro ao carregar contratos.</Alert>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
            <ContractIcon sx={{ fontSize: 72, opacity: 0.2, mb: 2 }} />
            <Typography variant="h6">Sem contratos encontrados</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {search ? 'Tente ajustar os termos de pesquisa' : 'Não existem contratos registados'}
            </Typography>
          </Box>
        ) : (
          <DataGrid
            rows={filtered} columns={columns}
            getRowId={(r) => r.pk}
            autoHeight disableRowSelectionOnClick
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            sx={{ border: 0 }}
          />
        )}
      </Paper>
    </ModulePage>
  );
};

export default ClientContractsPage;
