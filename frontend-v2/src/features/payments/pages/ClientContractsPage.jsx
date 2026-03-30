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
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import DataTable from '@/shared/components/data/DataTable/DataTable';
import apiClient from '@/services/api/client';
import { ContractFormModal } from '../components/ContractFormModal';
import { ContractInvoicesList } from '../components/ContractInvoicesList';
import { usePermissions } from '@/core/contexts/PermissionContext';

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
    queryFn: () => apiClient.get('/clients/contracts', { params: search ? { entity_id: null } : {} }),
    staleTime: 3 * 60 * 1000,
    select: (res) => res?.contracts ?? res?.data ?? [],
    retry: 1,
    enabled: true,
  });

// ─── Util: Derive Status ──────────────────────────────────────────────────────
const getContractStatus = (contract) => {
  const now = new Date();
  if (contract.start_date && new Date(contract.start_date) > now) return 'pending';
  if (contract.stop_date && new Date(contract.stop_date) < now) return 'expired';
  return 'active';
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const ClientContractsPage = () => {
  const theme = useTheme();
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const { data: contracts = [], isLoading, isError, error, refetch } = useContracts(debouncedSearch);

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
      c.ts_entity?.toLowerCase().includes(s) ||
      String(c.nipc).includes(s)
    );
  }, [contracts, search]);

  const columns = [
    { id: 'pk', label: 'Nº Contrato', minWidth: 100 },
    { id: 'ts_entity', label: 'Cliente (Entidade)', minWidth: 250 },
    { id: 'nipc', label: 'NIF', minWidth: 120 },
    { id: 'tt_contractfrequency', label: 'Periodicidade', minWidth: 130 },
    { id: 'family', label: 'N.º Membros', minWidth: 120 },
    {
      id: 'start_date', label: 'Início', minWidth: 110,
      render: (v) => v ? new Date(v).toLocaleDateString('pt-PT') : '—',
    },
    {
      id: 'stop_date', label: 'Término', minWidth: 110,
      render: (v) => v ? new Date(v).toLocaleDateString('pt-PT') : '—',
    },
    {
      id: 'status', label: 'Estado', minWidth: 110,
      render: (_, row) => {
        const derived = getContractStatus(row);
        const s = STATUS[derived];
        return <Chip label={s.label} size="small" color={s.color} />;
      },
    },
  ];

  const counts = {
    total:    contracts.length,
    active:   contracts.filter((c) => getContractStatus(c) === 'active').length,
    pending:  contracts.filter((c) => getContractStatus(c) === 'pending').length,
    expired:  contracts.filter((c) => getContractStatus(c) === 'expired').length,
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
        <Stack direction="row" spacing={1}>
          <Tooltip title="Atualizar">
            <IconButton onClick={refetch}><RefreshIcon /></IconButton>
          </Tooltip>
          {hasPermission('payments.manage') && (
            <Button variant="contained" onClick={() => setFormOpen(true)}>
              Novo Contrato
            </Button>
          )}
        </Stack>
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

        {isLoading && !error ? (
          <Box sx={{ p: 2 }}><Skeleton variant="rounded" height={300} /></Box>
        ) : filtered.length === 0 && !error ? (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
            <ContractIcon sx={{ fontSize: 72, opacity: 0.2, mb: 2 }} />
            <Typography variant="h6">Sem contratos encontrados</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {search ? 'Tente ajustar os termos de pesquisa' : 'Não existem contratos registados'}
            </Typography>
          </Box>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            loading={isLoading}
            error={error}
            paginationMode="client"
            expandable
            renderExpandedRow={(row) => <ContractInvoicesList contract={row} />}
          />
        )}
      </Paper>
      
      {/* Drawer/Modal de Novo Contrato */}
      <ContractFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </ModulePage>
  );
};

export default ClientContractsPage;
