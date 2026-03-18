/**
 * OfficesPage
 * Gestão de expedientes — abertura, fecho e replicação de expedientes
 */

import { useState, useMemo } from 'react';
import {
  Box, Grid, Paper, Typography, TextField, Button, Chip, Stack,
  IconButton, InputAdornment, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Skeleton, Divider, Tooltip,
  useTheme, useMediaQuery, alpha,
} from '@mui/material';
import {
  FolderOpen as OfficeIcon,
  Search as SearchIcon,
  Add as AddIcon,
  LockOpen as OpenIcon,
  Lock as CloseIcon2,
  ContentCopy as ReplicateIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  CalendarToday as DateIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import apiClient from '@/services/api/client';

// ─── Hooks ────────────────────────────────────────────────────────────────────

const useOffices = (filters = {}) =>
  useQuery({
    queryKey: ['offices', filters],
    queryFn: () => apiClient.get('/offices', { params: filters }),
    staleTime: 2 * 60 * 1000,
    select: (res) => res?.offices ?? res?.data ?? [],
    retry: 1,
  });

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS = {
  open:   { label: 'Aberto',  color: 'success' },
  closed: { label: 'Fechado', color: 'default' },
  draft:  { label: 'Rascunho', color: 'warning' },
};

// ─── Action Dialog ────────────────────────────────────────────────────────────

const ActionDialog = ({ open, action, office, onClose, onConfirm }) => {
  const titles = {
    open:      'Abrir Expediente',
    close:     'Fechar Expediente',
    replicate: 'Replicar Expediente',
  };
  const descriptions = {
    open:      'Confirma a abertura deste expediente? Ficará disponível para processamento.',
    close:     'Confirma o fecho deste expediente? Esta ação altera o estado para Fechado.',
    replicate: 'Será criado um novo expediente com base neste. Deseja continuar?',
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>{titles[action] ?? 'Ação'}</Typography>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {office && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {descriptions[action]}
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700}>{office.regnumber ?? `Expediente #${office.pk}`}</Typography>
              <Typography variant="caption" color="text.secondary">{office.description ?? '—'}</Typography>
            </Paper>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          color={action === 'close' ? 'error' : 'primary'}
          onClick={() => onConfirm(action, office)}
        >
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const OfficesPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState({ open: false, action: null, office: null });

  const { data: offices = [], isLoading, isError, refetch } = useOffices();

  const filtered = useMemo(() => {
    if (!search) return offices;
    const s = search.toLowerCase();
    return offices.filter((o) =>
      String(o.pk).includes(s) ||
      o.regnumber?.toLowerCase().includes(s) ||
      o.description?.toLowerCase().includes(s) ||
      o.ts_entity?.toLowerCase().includes(s)
    );
  }, [offices, search]);

  const openDialog = (action, office) => setDialog({ open: true, action, office });
  const closeDialog = () => setDialog({ open: false, action: null, office: null });

  const handleAction = async (action, office) => {
    closeDialog();
    try {
      if (action === 'open')      await apiClient.post(`/offices/${office.pk}/open`);
      if (action === 'close')     await apiClient.post(`/offices/${office.pk}/close`);
      if (action === 'replicate') await apiClient.post(`/offices/${office.pk}/replicate`);
      toast.success('Ação realizada com sucesso!');
      refetch();
    } catch (e) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  // DataGrid columns
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
      field: 'status', headerName: 'Estado', width: 110,
      renderCell: ({ value }) => {
        const s = STATUS[value] ?? STATUS.draft;
        return <Chip label={s.label} size="small" color={s.color} />;
      },
    },
    {
      field: 'actions', headerName: '', width: 130, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Abrir">
            <IconButton size="small" color="success" onClick={() => openDialog('open', row)}>
              <OpenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fechar">
            <IconButton size="small" color="error" onClick={() => openDialog('close', row)}>
              <CloseIcon2 fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Replicar">
            <IconButton size="small" color="info" onClick={() => openDialog('replicate', row)}>
              <ReplicateIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  // Mobile card view
  const renderMobileCard = (office) => {
    const s = STATUS[office.status] ?? STATUS.draft;
    return (
      <Card key={office.pk} variant="outlined">
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              #{office.pk} · {office.regnumber}
            </Typography>
            <Chip label={s.label} size="small" color={s.color} />
          </Box>
          <Typography variant="body2" fontWeight={500}>{office.description || '—'}</Typography>
          <Typography variant="caption" color="text.secondary">
            {office.ts_entity} · {office.created_at ? new Date(office.created_at).toLocaleDateString('pt-PT') : '—'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button size="small" startIcon={<OpenIcon />} color="success" onClick={() => openDialog('open', office)}>Abrir</Button>
            <Button size="small" startIcon={<CloseIcon2 />} color="error" onClick={() => openDialog('close', office)}>Fechar</Button>
            <Button size="small" startIcon={<ReplicateIcon />} color="info" onClick={() => openDialog('replicate', office)}>Replicar</Button>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <ModulePage
      title="Expedientes"
      subtitle="Abertura, fecho e replicação de expedientes administrativos"
      icon={OfficeIcon}
      color="#5c6bc0"
      breadcrumbs={[
        { label: 'Expedientes', path: '/offices-admin' },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Tooltip title="Atualizar">
            <IconButton onClick={refetch}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} size="small">
            Novo Expediente
          </Button>
        </Stack>
      }
    >
      {/* Summary stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total',    value: offices.length,                                       color: 'info' },
          { label: 'Abertos',  value: offices.filter((o) => o.status === 'open').length,    color: 'success' },
          { label: 'Fechados', value: offices.filter((o) => o.status === 'closed').length,  color: 'default' },
          { label: 'Rascunhos', value: offices.filter((o) => o.status === 'draft').length,  color: 'warning' },
        ].map(({ label, value, color }) => (
          <Grid key={label} size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h4" fontWeight={800} color={color !== 'default' ? `${color}.main` : 'text.primary'}>{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search + table */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            size="small" placeholder="Pesquisar expedientes..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ maxWidth: 320 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search
                ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon fontSize="small" /></IconButton></InputAdornment>
                : null,
            }}
          />
        </Box>
        <Divider />

        {isLoading ? (
          <Box sx={{ p: 2 }}><Skeleton variant="rounded" height={300} /></Box>
        ) : isError ? (
          <Alert severity="error" sx={{ m: 2 }}>Erro ao carregar expedientes. Verifique a ligação ao servidor.</Alert>
        ) : offices.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
            <OfficeIcon sx={{ fontSize: 72, opacity: 0.2, mb: 2 }} />
            <Typography variant="h6">Sem expedientes registados</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Crie o primeiro expediente clicando em "Novo Expediente"</Typography>
          </Box>
        ) : isMobile ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            {filtered.map(renderMobileCard)}
          </Stack>
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
      </Paper>

      <ActionDialog
        open={dialog.open}
        action={dialog.action}
        office={dialog.office}
        onClose={closeDialog}
        onConfirm={handleAction}
      />
    </ModulePage>
  );
};

export default OfficesPage;
