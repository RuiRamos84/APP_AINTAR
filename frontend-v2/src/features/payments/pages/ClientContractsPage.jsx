/**
 * ClientContractsPage
 * Contratos de clientes — consulta e gestão de contratos de serviço
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  IconButton,
  Card,
  CardContent,
  Skeleton,
  Tooltip,
  useTheme,
  alpha,
  Badge,
  Alert,
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
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  NotificationsActive as AlertsIcon,
} from '@mui/icons-material';
import { SearchBar } from '@/shared/components/data/SearchBar/SearchBar';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/notification';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import useMetaData from '@/core/hooks/useMetaData';
import paymentService from '../services/paymentService';
import EntitySearchField from '@/features/entities/components/fields/EntitySearchField';
import { EntityForm } from '@/features/entities/components/EntityForm';
import { useEntityStore } from '@/features/entities/store/entityStore';

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

  // ── Entity store (para abrir EntityForm em criação/edição) ──────────────────
  const { openCreateModal, openModal, createModalOpen, modalOpen } = useEntityStore();

  // ── Diálogo 1: NIF ──────────────────────────────────────────────────────────
  const [nifDialogOpen, setNifDialogOpen] = useState(false);
  const [nifInput, setNifInput] = useState('');
  const [nifEntity, setNifEntity] = useState(null);       // entidade encontrada
  const [nifSearchStatus, setNifSearchStatus] = useState(null); // null | 'loading' | 'success' | 'not_found' | 'error'
  const [waitingForEntity, setWaitingForEntity] = useState(false);

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
      notification.success('Contrato registado com sucesso');
    },
    onError: (err) => notification.apiError(err, 'Erro ao criar contrato.'),
  });

  const { mutate: invoicePayment, isPending: isInvoicing } = useMutation({
    mutationFn: ({ contractPk, paymentPk, invoiceDate }) =>
      paymentService.invoiceContractPayment(contractPk, paymentPk, invoiceDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractPayments', selectedContract?.pk] });
      setInvoiceDialogOpen(false);
      setPaymentToInvoice(null);
      setInvoiceDate('');
      notification.success('Data de faturação registada');
    },
    onError: (err) => notification.apiError(err, 'Erro ao registar faturação.'),
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
      notification.success('Pagamento validado');
    },
    onError: (err) => notification.apiError(err, 'Erro ao validar pagamento.'),
  });

  // ── Helpers NIF ─────────────────────────────────────────────────────────────
  const REQUIRED_FOR_CONTRACT = ['address', 'postal'];
  const FIELD_LABELS = { address: 'Morada', postal: 'Código Postal' };

  const getEntityCompleteness = (entity) => {
    const missing = REQUIRED_FOR_CONTRACT.filter(
      (f) => !entity[f] || String(entity[f]).trim() === ''
    );
    return { isComplete: missing.length === 0, missing };
  };

  const applyEntityToForm = (entity) => {
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
  };

  const resetNifDialog = () => {
    setNifInput('');
    setNifEntity(null);
    setNifSearchStatus(null);
    setWaitingForEntity(false);
  };

  // Callback do EntitySearchField
  const handleEntityFound = (entity) => setNifEntity(entity);

  // Continuar para o formulário de contrato
  const handleProceedWithContract = () => {
    if (nifEntity) applyEntityToForm(nifEntity);
  };

  // Abrir EntityForm em modo criação
  const handleCreateEntity = () => {
    setWaitingForEntity(true);
    openCreateModal({ nipc: nifInput });
  };

  // Abrir EntityForm em modo edição
  const handleUpdateEntity = () => {
    setWaitingForEntity(true);
    openModal(nifEntity);
  };

  // Depois de EntityForm fechar, re-buscar entidade e avançar automaticamente
  useEffect(() => {
    if (!waitingForEntity) return;
    if (createModalOpen || modalOpen) return;

    const refetch = async () => {
      try {
        const res = await paymentService.getEntityByNipc(nifInput);
        const entity = res?.entity;
        if (entity?.pk) applyEntityToForm(entity);
      } finally {
        setWaitingForEntity(false);
      }
    };
    refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createModalOpen, modalOpen]);

  // ── Colunas DataGrid ─────────────────────────────────────────────────────────
  const columns = [
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
    { field: 'nipc', headerName: 'NIF', width: 110 },
    { field: 'ts_entity', headerName: 'Cliente', flex: 1, minWidth: 180 },
    { field: 'family', headerName: 'Agregado', width: 90 },
    { field: 'tt_contractfrequency', headerName: 'Frequência', width: 110 },
    { field: 'postal', headerName: 'Código Postal', width: 110 },
    { field: 'address', headerName: 'Morada', flex: 1, minWidth: 160 },
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
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <SearchBar searchTerm={search} onSearch={setSearch} />
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
            onClick={() => { resetNifDialog(); setNifDialogOpen(true); }}
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
        onClose={() => { setNifDialogOpen(false); resetNifDialog(); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Novo Contrato</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <EntitySearchField
            value={nifInput}
            onChange={(e) => setNifInput(e.target.value.replace(/\D/g, ''))}
            onEntityFound={handleEntityFound}
            onSearchStatusChange={setNifSearchStatus}
            label="NIF da Entidade"
          />

          {/* Entidade encontrada */}
          {nifSearchStatus === 'success' && nifEntity && (() => {
            const { isComplete, missing } = getEntityCompleteness(nifEntity);
            return (
              <Alert
                severity={isComplete ? 'success' : 'warning'}
                sx={{ alignItems: 'flex-start' }}
              >
                <Typography variant="subtitle2" fontWeight={600}>
                  {nifEntity.name}
                </Typography>
                <Typography variant="body2">
                  NIF: {nifEntity.nipc}
                  {nifEntity.address ? ` · ${nifEntity.address}` : ''}
                  {nifEntity.postal ? `, ${nifEntity.postal}` : ''}
                </Typography>
                {!isComplete && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Dados em falta:{' '}
                    <strong>{missing.map((f) => FIELD_LABELS[f]).join(', ')}</strong>.
                    Recomendamos atualizar antes de criar o contrato.
                  </Typography>
                )}
              </Alert>
            );
          })()}

          {/* NIF não encontrado */}
          {nifSearchStatus === 'not_found' && (
            <Alert severity="info">
              Nenhuma entidade com NIF <strong>{nifInput}</strong> encontrada.
              Pode criar uma nova entidade.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 3, pb: 2 }}>
          <Button onClick={() => { setNifDialogOpen(false); resetNifDialog(); }}>
            Cancelar
          </Button>
          <Box sx={{ flex: 1 }} />
          {nifSearchStatus === 'not_found' && (
            <Button variant="outlined" onClick={handleCreateEntity}>
              Criar Entidade
            </Button>
          )}
          {nifSearchStatus === 'success' && nifEntity && !getEntityCompleteness(nifEntity).isComplete && (
            <Button variant="outlined" color="warning" onClick={handleUpdateEntity}>
              Atualizar Entidade
            </Button>
          )}
          {nifSearchStatus === 'success' && nifEntity && (
            <Button variant="contained" onClick={handleProceedWithContract}>
              Continuar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* EntityForm — responde ao useEntityStore (criação/edição de entidades) */}
      <EntityForm />

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

            {/* ── Identificação ─────────────────────────────────────────────── */}
            <Grid size={12}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Identificação
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Entidade"
                value={nifEntity?.name || ''}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
                sx={{ '& .MuiInputBase-input': { color: 'text.primary', WebkitTextFillColor: 'unset' } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <TextField
                label="Agregado *"
                type="number"
                fullWidth
                size="small"
                value={contractForm.family}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || (Number(v) >= 1 && Number(v) <= 20))
                    setContractForm((f) => ({ ...f, family: v }));
                }}
                inputProps={{ min: 1, max: 20 }}
                error={contractSubmitted && !contractForm.family}
                helperText={contractSubmitted && !contractForm.family ? 'Obrigatório' : ''}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <FormControl fullWidth size="small" error={contractSubmitted && !contractForm.tt_contractfrequency}>
                <InputLabel>Frequência *</InputLabel>
                <Select
                  value={contractForm.tt_contractfrequency}
                  onChange={(e) => setContractForm((f) => ({ ...f, tt_contractfrequency: e.target.value }))}
                  label="Frequência *"
                >
                  {(metaData?.contractfrequency || []).map((cf) => (
                    <MenuItem key={cf.pk} value={cf.pk}>{cf.value}</MenuItem>
                  ))}
                </Select>
                {contractSubmitted && !contractForm.tt_contractfrequency && (
                  <FormHelperText>Obrigatório</FormHelperText>
                )}
              </FormControl>
            </Grid>

            {/* ── Período ───────────────────────────────────────────────────── */}
            <Grid size={12}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Período
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 6 }}>
              <TextField
                type="date"
                label="Data início *"
                fullWidth
                size="small"
                value={contractForm.start_date}
                onChange={(e) => setContractForm((f) => ({ ...f, start_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                error={contractSubmitted && !contractForm.start_date}
                helperText={contractSubmitted && !contractForm.start_date ? 'Obrigatório' : ''}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6 }}>
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

            {/* ── Morada ────────────────────────────────────────────────────── */}
            <Grid size={12}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Morada
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="Código Postal"
                fullWidth
                size="small"
                value={contractForm.postal}
                onChange={(e) => setContractForm((f) => ({ ...f, postal: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                label="Rua / Morada"
                fullWidth
                size="small"
                value={contractForm.address}
                onChange={(e) => setContractForm((f) => ({ ...f, address: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <TextField
                label="Porta"
                fullWidth
                size="small"
                value={contractForm.door}
                onChange={(e) => setContractForm((f) => ({ ...f, door: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <TextField
                label="Andar"
                fullWidth
                size="small"
                value={contractForm.floor}
                onChange={(e) => setContractForm((f) => ({ ...f, floor: e.target.value }))}
              />
            </Grid>

            {/* ── Localização administrativa ────────────────────────────────── */}
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="Localidade"
                fullWidth
                size="small"
                value={contractForm.nut4}
                onChange={(e) => setContractForm((f) => ({ ...f, nut4: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="Freguesia"
                fullWidth
                size="small"
                value={contractForm.nut3}
                onChange={(e) => setContractForm((f) => ({ ...f, nut3: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="Município"
                fullWidth
                size="small"
                value={contractForm.nut2}
                onChange={(e) => setContractForm((f) => ({ ...f, nut2: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="Distrito"
                fullWidth
                size="small"
                value={contractForm.nut1}
                onChange={(e) => setContractForm((f) => ({ ...f, nut1: e.target.value }))}
              />
            </Grid>

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
