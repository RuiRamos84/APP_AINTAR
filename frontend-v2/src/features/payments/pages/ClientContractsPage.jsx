/**
 * ClientContractsPage
 * Contratos de clientes — consulta e gestão de contratos de serviço
 */

import { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Card,
  CardContent,
  Skeleton,
  Divider,
  Tooltip,
  useTheme,
  alpha,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Description as ContractIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  NotificationsActive as AlertsIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import useMetaData from '@/core/hooks/useMetaData';
import paymentService from '../services/paymentService';

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS = {
  active: { label: 'Ativo', color: 'success' },
  inactive: { label: 'Inativo', color: 'default' },
  pending: { label: 'Pendente', color: 'warning' },
  expired: { label: 'Expirado', color: 'error' },
};

const emptyContract = {
  ts_entity: '',
  start_date: '',
  stop_date: '',
  family: '',
  tt_contractfrequency: '',
  address: '',
  postal: '',
  door: '',
  floor: '',
  nut1: '',
  nut2: '',
  nut3: '',
  nut4: '',
};

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('pt-PT') : '—');

// ─── Hooks ────────────────────────────────────────────────────────────────────

const useContracts = () =>
  useQuery({
    queryKey: ['contracts'],
    queryFn: () => paymentService.getContracts(),
    staleTime: 3 * 60 * 1000,
    select: (res) => res?.contracts ?? res?.data ?? [],
    retry: 1,
  });

const useContractPayments = (contractPk) =>
  useQuery({
    queryKey: ['contractPayments', contractPk],
    queryFn: () => paymentService.getContractPayments(contractPk),
    select: (res) => res?.payments ?? res?.data ?? [],
    enabled: !!contractPk,
  });

const useContractAlerts = () =>
  useQuery({
    queryKey: ['contractAlerts'],
    queryFn: () => paymentService.getContractAlerts(),
    select: (res) => res?.alerts ?? [],
    staleTime: 0,
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
  const queryClient = useQueryClient();
  const { data: metaData } = useMetaData();

  // ── Pesquisa ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');

  // ── Diálogo 1: NIF ──────────────────────────────────────────────────────────
  const [nifDialogOpen, setNifDialogOpen] = useState(false);
  const [nifInput, setNifInput] = useState('');
  const [nifEntity, setNifEntity] = useState(null);
  const [nifLoading, setNifLoading] = useState(false);
  const [nifError, setNifError] = useState('');

  // ── Diálogo 2: Formulário contrato ──────────────────────────────────────────
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractForm, setContractForm] = useState(emptyContract);
  const [contractSubmitted, setContractSubmitted] = useState(false);

  // ── Modal pagamentos do contrato ────────────────────────────────────────────
  const [selectedContract, setSelectedContract] = useState(null);

  // ── Diálogo faturação ───────────────────────────────────────────────────────
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentToInvoice, setPaymentToInvoice] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState('');

  // ── Diálogo alertas ─────────────────────────────────────────────────────────
  const [alertsDialogOpen, setAlertsDialogOpen] = useState(false);
  const [alertsFilter, setAlertsFilter] = useState('all'); // 'all' | 'overdue' | 'pending'

  // ── Diálogo validação pagamento ─────────────────────────────────────────────
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [paymentToValidate, setPaymentToValidate] = useState(null);
  const [payedDate, setPayedDate] = useState('');

  // ── Dados ───────────────────────────────────────────────────────────────────
  const { data: contracts = [], isLoading, isError, refetch } = useContracts();
  const { data: contractPayments = [], isLoading: isLoadingPayments } = useContractPayments(
    selectedContract?.pk
  );
  const {
    data: alerts = [],
    isLoading: isLoadingAlerts,
    refetch: refetchAlerts,
  } = useContractAlerts();

  const overdueCount = alerts.filter((a) => a.overdue).length;

  const handleOpenAlerts = () => {
    setAlertsDialogOpen(true);
    refetchAlerts();
  };

  // ── Filtro ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return contracts;
    const s = search.toLowerCase();
    return contracts.filter(
      (c) =>
        String(c.pk).includes(s) ||
        c.ts_entity?.toLowerCase().includes(s) ||
        String(c.nipc || '').includes(s) ||
        c.address?.toLowerCase().includes(s) ||
        c.postal?.toLowerCase().includes(s) ||
        c.nut1?.toLowerCase().includes(s) ||
        c.nut2?.toLowerCase().includes(s) ||
        c.nut3?.toLowerCase().includes(s) ||
        c.nut4?.toLowerCase().includes(s)
    );
  }, [contracts, search]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const { mutate: createContract, isPending: isCreating } = useMutation({
    mutationFn: (data) => paymentService.createContract(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setContractDialogOpen(false);
      setContractForm(emptyContract);
      setNifEntity(null);
      setContractSubmitted(false);
      toast.success('Contrato registado com sucesso');
    },
    onError: () => toast.error('Erro ao criar contrato'),
  });

  const { mutate: invoicePayment, isPending: isInvoicing } = useMutation({
    mutationFn: ({ contractPk, paymentPk, invoiceDate }) =>
      paymentService.invoiceContractPayment(contractPk, paymentPk, invoiceDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractPayments', selectedContract?.pk] });
      setInvoiceDialogOpen(false);
      setPaymentToInvoice(null);
      setInvoiceDate('');
      toast.success('Data de faturação registada');
    },
    onError: () => toast.error('Erro ao registar faturação'),
  });

  const { mutate: validatePayment, isPending: isValidating } = useMutation({
    mutationFn: ({ contractPk, paymentPk, payedDate }) =>
      paymentService.validateContractPayment(contractPk, paymentPk, payedDate),
    onSuccess: (_, { paymentPk }) => {
      queryClient.invalidateQueries({ queryKey: ['contractPayments', selectedContract?.pk] });
      // Remoção imediata do alerta sem esperar pelo servidor
      queryClient.setQueryData(['contractAlerts'], (old) => {
        if (!old) return old;
        const alerts = old?.alerts ?? old ?? [];
        const filtered = alerts.filter((a) => a.pk !== paymentPk);
        return Array.isArray(old) ? filtered : { ...old, alerts: filtered };
      });
      setValidateDialogOpen(false);
      setPaymentToValidate(null);
      setPayedDate('');
      toast.success('Pagamento validado');
    },
    onError: () => toast.error('Erro ao validar pagamento'),
  });

  // ── Handlers NIF ────────────────────────────────────────────────────────────
  const resetNifDialog = () => {
    setNifInput('');
    setNifEntity(null);
    setNifError('');
  };

  const handleNifSearch = async () => {
    setNifError('');
    setNifLoading(true);
    try {
      const res = await paymentService.getEntityByNipc(nifInput);
      const entity = res?.entity;
      if (!entity?.pk) {
        setNifError('NIF não encontrado');
        return;
      }
      setNifEntity(entity);
      setContractForm({
        ...emptyContract,
        ts_entity: entity.pk,
        address: entity.address || '',
        postal: entity.postal || '',
        door: entity.door || '',
        floor: entity.floor || '',
        nut1: entity.nut1 || '',
        nut2: entity.nut2 || '',
        nut3: entity.nut3 || '',
        nut4: entity.nut4 || '',
      });
      setNifDialogOpen(false);
      setContractDialogOpen(true);
    } catch {
      setNifError('NIF não encontrado');
    } finally {
      setNifLoading(false);
    }
  };

  // ── Colunas DataGrid ─────────────────────────────────────────────────────────
  const columns = [
    { field: 'pk', headerName: 'Nº', width: 70 },
    { field: 'ts_entity', headerName: 'Cliente', flex: 1, minWidth: 180 },
    { field: 'nipc', headerName: 'NIPC', width: 120 },
    {
      field: 'start_date',
      headerName: 'Início',
      width: 100,
      valueFormatter: (v) => fmtDate(v),
    },
    {
      field: 'stop_date',
      headerName: 'Fim',
      width: 100,
      valueFormatter: (v) => fmtDate(v),
    },
    { field: 'family', headerName: 'Família', width: 80 },
    { field: 'tt_contractfrequency', headerName: 'Frequência', width: 110 },
    { field: 'address', headerName: 'Morada', flex: 1, minWidth: 160 },
    { field: 'postal', headerName: 'Postal', width: 90 },
    { field: 'nut1', headerName: 'Distrito', width: 120, valueFormatter: (v) => v || '—' },
    { field: 'nut2', headerName: 'Município', width: 140, valueFormatter: (v) => v || '—' },
    {
      field: 'nut3',
      headerName: 'Freguesia',
      flex: 1,
      minWidth: 160,
      valueFormatter: (v) => v || '—',
    },
    { field: 'nut4', headerName: 'Localidade', width: 130, valueFormatter: (v) => v || '—' },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: ({ row }) => (
        <Tooltip title="Ver pagamentos">
          <IconButton size="small" onClick={() => setSelectedContract(row)}>
            <CheckCircleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const counts = {
    total: contracts.length,
    active: contracts.filter((c) => getContractStatus(c) === 'active').length,
    pending: contracts.filter((c) => getContractStatus(c) === 'pending').length,
    expired: contracts.filter((c) => getContractStatus(c) === 'expired').length,
  };

  // ── Data fim validation ──────────────────────────────────────────────────────
  const stopDateError =
    contractSubmitted &&
    (!contractForm.stop_date
      ? 'Campo obrigatório'
      : contractForm.start_date && contractForm.stop_date <= contractForm.start_date
        ? 'Deve ser posterior à data de início'
        : '');

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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Atualizar">
            <IconButton onClick={refetch}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Alertas de pagamento">
            <Badge badgeContent={overdueCount} color="error">
              <Button
                variant="outlined"
                size="small"
                startIcon={<AlertsIcon />}
                color={overdueCount > 0 ? 'error' : 'warning'}
                onClick={handleOpenAlerts}
              >
                Alertas
              </Button>
            </Badge>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              resetNifDialog();
              setNifDialogOpen(true);
            }}
          >
            Novo Contrato
          </Button>
        </Box>
      }
    >
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total', value: counts.total, color: 'info' },
          { label: 'Ativos', value: counts.active, color: 'success' },
          { label: 'Pendentes', value: counts.pending, color: 'warning' },
          { label: 'Expirados', value: counts.expired, color: 'error' },
        ].map(({ label, value, color }) => (
          <Grid key={label} size={{ xs: 6, sm: 3 }}>
            <Card
              variant="outlined"
              sx={{ bgcolor: alpha(theme.palette[color]?.main || '#000', 0.04) }}
            >
              <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h4" fontWeight={800} color={`${color}.main`}>
                  {value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabela */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            size="small"
            placeholder="Pesquisar por cliente, NIPC, morada, localização..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ maxWidth: 420 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        </Box>
        <Divider />

        {isLoading && !isError ? (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rounded" height={300} />
          </Box>
        ) : filtered.length === 0 && !isError ? (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
            <ContractIcon sx={{ fontSize: 72, opacity: 0.2, mb: 2 }} />
            <Typography variant="h6">Sem contratos encontrados</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {search ? 'Tente ajustar os termos de pesquisa' : 'Não existem contratos registados'}
            </Typography>
          </Box>
        ) : (
          <DataGrid
            rows={filtered}
            columns={columns}
            getRowId={(r) => r.pk}
            autoHeight
            disableRowSelectionOnClick
            onRowClick={({ row }) => setSelectedContract(row)}
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            sx={{ border: 0, '& .MuiDataGrid-row': { cursor: 'pointer' } }}
          />
        )}
      </Paper>

      {/* ── Diálogo 1: NIF ──────────────────────────────────────────────────── */}
      <Dialog
        open={nifDialogOpen}
        onClose={() => {
          setNifDialogOpen(false);
          resetNifDialog();
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Novo Contrato</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Digite o NIF da entidade para pesquisar.
          </Typography>
          <TextField
            label="NIF"
            value={nifInput}
            autoFocus
            fullWidth
            onChange={(e) => {
              setNifInput(e.target.value.replace(/\D/g, ''));
              setNifError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleNifSearch()}
            inputProps={{ maxLength: 9 }}
            error={!!nifError}
            helperText={nifError || ''}
            InputProps={{ endAdornment: nifLoading ? <CircularProgress size={16} /> : null }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setNifDialogOpen(false);
              resetNifDialog();
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleNifSearch}
            disabled={nifLoading || nifInput.length < 9}
          >
            {nifLoading ? 'A pesquisar...' : 'Pesquisar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo 2: Formulário ────────────────────────────────────────────── */}
      <Dialog
        open={contractDialogOpen}
        onClose={() => {
          setContractDialogOpen(false);
          setContractForm(emptyContract);
          setNifEntity(null);
          setContractSubmitted(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Novo Contrato</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Entidade"
                value={nifEntity?.name || ''}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
                sx={{
                  '& .MuiInputBase-input': { color: 'text.primary', WebkitTextFillColor: 'unset' },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Família"
                type="number"
                fullWidth
                size="small"
                value={contractForm.family}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || (Number(v) >= 1 && Number(v) <= 10))
                    setContractForm((f) => ({ ...f, family: v }));
                }}
                inputProps={{ min: 1, max: 10 }}
                error={contractSubmitted && !contractForm.family}
                helperText={contractSubmitted && !contractForm.family ? 'Campo obrigatório' : ''}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl
                fullWidth
                size="small"
                error={contractSubmitted && !contractForm.tt_contractfrequency}
              >
                <InputLabel>Frequência *</InputLabel>
                <Select
                  value={contractForm.tt_contractfrequency}
                  onChange={(e) =>
                    setContractForm((f) => ({ ...f, tt_contractfrequency: e.target.value }))
                  }
                  label="Frequência *"
                >
                  {(metaData?.contractfrequency || []).map((cf) => (
                    <MenuItem key={cf.pk} value={cf.pk}>
                      {cf.value}
                    </MenuItem>
                  ))}
                </Select>
                {contractSubmitted && !contractForm.tt_contractfrequency && (
                  <FormHelperText>Campo obrigatório</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="date"
                label="Data início *"
                fullWidth
                size="small"
                value={contractForm.start_date}
                onChange={(e) => setContractForm((f) => ({ ...f, start_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                error={contractSubmitted && !contractForm.start_date}
                helperText={
                  contractSubmitted && !contractForm.start_date ? 'Campo obrigatório' : ''
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="date"
                label="Data fim *"
                fullWidth
                size="small"
                value={contractForm.stop_date}
                onChange={(e) => setContractForm((f) => ({ ...f, stop_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: contractForm.start_date || undefined }}
                error={!!stopDateError}
                helperText={stopDateError || ''}
              />
            </Grid>
            {[
              { field: 'address', label: 'Morada', size: { xs: 12, sm: 8 } },
              { field: 'postal', label: 'Código Postal', size: { xs: 12, sm: 4 } },
              { field: 'door', label: 'Porta', size: { xs: 6, sm: 3 } },
              { field: 'floor', label: 'Andar', size: { xs: 6, sm: 3 } },
              { field: 'nut1', label: 'Distrito', size: { xs: 6, sm: 3 } },
              { field: 'nut2', label: 'Município', size: { xs: 6, sm: 3 } },
              { field: 'nut3', label: 'Freguesia', size: { xs: 6, sm: 3 } },
              { field: 'nut4', label: 'Localidade', size: { xs: 6, sm: 3 } },
            ].map(({ field, label, size }) => (
              <Grid key={field} size={size}>
                <TextField
                  label={label}
                  fullWidth
                  size="small"
                  value={contractForm[field]}
                  onChange={(e) => setContractForm((f) => ({ ...f, [field]: e.target.value }))}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setContractDialogOpen(false);
              setContractForm(emptyContract);
              setNifEntity(null);
              setContractSubmitted(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={isCreating}
            onClick={() => {
              setContractSubmitted(true);
              const { ts_entity, start_date, stop_date, family, tt_contractfrequency } =
                contractForm;
              if (!ts_entity || !start_date || !stop_date || !family || !tt_contractfrequency)
                return;
              if (stop_date <= start_date) return;
              createContract(contractForm);
            }}
          >
            {isCreating ? 'A guardar...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Modal pagamentos do contrato ─────────────────────────────────────── */}
      <Dialog
        open={!!selectedContract}
        onClose={() => setSelectedContract(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">{selectedContract?.ts_entity}</Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedContract?.nipc}
            {selectedContract?.email ? ` · ${selectedContract.email}` : ''}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Início</TableCell>
                  <TableCell>Fim</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell>Faturado</TableCell>
                  <TableCell>Pago</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoadingPayments ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : contractPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">
                        Sem pagamentos para este contrato
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  contractPayments.map((cp) => (
                    <TableRow key={cp.pk} hover>
                      <TableCell>{fmtDate(cp.start_date)}</TableCell>
                      <TableCell>{fmtDate(cp.stop_date)}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600}>
                          €{Number(cp.value || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      {/* Faturado */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={cp.presented ? fmtDate(cp.presented) : 'Não'}
                            size="small"
                            color={cp.presented ? 'success' : 'default'}
                          />
                          {!cp.presented && (
                            <Tooltip title="Registar data de faturação">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setPaymentToInvoice(cp);
                                  setInvoiceDate('');
                                  setInvoiceDialogOpen(true);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      {/* Pago */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={cp.payed ? `Pago ${fmtDate(cp.payed)}` : 'Não'}
                            size="small"
                            color={cp.payed ? 'success' : 'error'}
                          />
                          {!cp.payed && (
                            <Tooltip title="Validar pagamento">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => {
                                  setPaymentToValidate(cp);
                                  setPayedDate('');
                                  setValidateDialogOpen(true);
                                }}
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedContract(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo alertas ──────────────────────────────────────────────────── */}
      <Dialog
        open={alertsDialogOpen}
        onClose={() => setAlertsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <AlertsIcon color="warning" />
            <Typography variant="h6">Alertas de Pagamento</Typography>
            {!isLoadingAlerts && (
              <Chip
                label={`${overdueCount} em atraso · ${alerts.length - overdueCount} pendentes`}
                size="small"
                color={overdueCount > 0 ? 'error' : 'warning'}
              />
            )}
            <ToggleButtonGroup
              value={alertsFilter}
              exclusive
              onChange={(_, v) => v && setAlertsFilter(v)}
              size="small"
              sx={{ ml: 'auto' }}
            >
              <ToggleButton value="all">Todos ({alerts.length})</ToggleButton>
              <ToggleButton value="overdue" sx={{ color: 'error.main' }}>
                Em atraso ({overdueCount})
              </ToggleButton>
              <ToggleButton value="pending" sx={{ color: 'warning.main' }}>
                Dentro do prazo ({alerts.length - overdueCount})
              </ToggleButton>
            </ToggleButtonGroup>
            <Tooltip title="Atualizar">
              <IconButton size="small" onClick={refetchAlerts} disabled={isLoadingAlerts}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {isLoadingAlerts ? (
            <Box sx={{ p: 3 }}>
              <Skeleton variant="rounded" height={200} />
            </Box>
          ) : alerts.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6">Sem pagamentos em atraso</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Todos os pagamentos faturados estão dentro do prazo.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Período</TableCell>
                    <TableCell>Faturado em</TableCell>
                    <TableCell>Prazo (30 dias)</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts
                    .filter(
                      (a) =>
                        alertsFilter === 'all' ||
                        (alertsFilter === 'overdue' ? a.overdue : !a.overdue)
                    )
                    .map((a) => (
                      <TableRow
                        key={a.pk}
                        hover
                        sx={{
                          bgcolor: a.overdue ? alpha(theme.palette.error.main, 0.05) : 'inherit',
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {a.ts_entity}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {a.nipc}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{a.email || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          {fmtDate(a.start_date)} → {fmtDate(a.stop_date)}
                        </TableCell>
                        <TableCell>{fmtDate(a.presented)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {a.overdue ? (
                              <WarningIcon fontSize="small" color="error" />
                            ) : (
                              <ScheduleIcon fontSize="small" color="warning" />
                            )}
                            <Typography
                              variant="body2"
                              color={a.overdue ? 'error.main' : 'warning.main'}
                              fontWeight={500}
                            >
                              {fmtDate(a.deadline)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>
                            €{Number(a.value || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={a.overdue ? 'Em atraso' : 'Dentro do prazo'}
                            size="small"
                            color={a.overdue ? 'error' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Registar pagamento">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => {
                                setPaymentToValidate(a);
                                setPayedDate('');
                                setValidateDialogOpen(true);
                              }}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertsDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo faturação ────────────────────────────────────────────────── */}
      <Dialog
        open={invoiceDialogOpen}
        onClose={() => setInvoiceDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Registar Faturação</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Introduza a data de faturação:
          </Typography>
          <TextField
            type="date"
            label="Data de faturação"
            fullWidth
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!invoiceDate || isInvoicing}
            onClick={() =>
              invoicePayment({
                contractPk: selectedContract.pk,
                paymentPk: paymentToInvoice.pk,
                invoiceDate,
              })
            }
          >
            {isInvoicing ? 'A guardar...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo validação pagamento ──────────────────────────────────────── */}
      <Dialog
        open={validateDialogOpen}
        onClose={() => setValidateDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Validar Pagamento</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Introduza a data do pagamento:
          </Typography>
          <TextField
            type="date"
            label="Data do pagamento"
            fullWidth
            value={payedDate}
            onChange={(e) => setPayedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValidateDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!payedDate || isValidating}
            onClick={() =>
              validatePayment({
                contractPk: paymentToValidate.tb_contract ?? selectedContract?.pk,
                paymentPk: paymentToValidate.pk,
                payedDate,
              })
            }
          >
            {isValidating ? 'A guardar...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </ModulePage>
  );
};

export default ClientContractsPage;
