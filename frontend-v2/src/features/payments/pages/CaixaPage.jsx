/**
 * CaixaPage
 * Gestão de Fundo de Caixa — movimentos, saldo cumulativo e resumo financeiro
 *
 * Regras de negócio:
 *  Tipo 1 — Entrada manual           (valor positivo)
 *  Tipo 2 — Receita de pedido        (valor positivo, tb_document obrigatório)
 *  Tipo 3 — Despesa / saída          (valor negativo, ordempagamento obrigatório)
 *  Tipo 4 — Fecho de caixa           (valor negativo, 2 pessoas, rotação)
 *  Tipo 5 — Ponto de controlo        (valor = 0, 2 pessoas, rotação independente)
 *
 * Fluxo para tipos 4 e 5:
 *  1. Utilizador A cria → ts_client2 = NULL (pendente)
 *  2. Utilizador B valida → POST /caixa/<pk>/validar
 *  3. Rotação: próximo criador = último validador; próximo validador = último criador
 */

import { useState, useMemo } from 'react';
import {
  Box, Grid, Paper, Typography, TextField, Button, Chip, Stack,
  Alert, Skeleton, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Tooltip, IconButton, useTheme, alpha,
} from '@mui/material';
import {
  AccountBalanceWallet as CaixaIcon,
  Add as AddIcon,
  Edit as EditIcon,
  TrendingUp as EntradaIcon,
  TrendingDown as SaidaIcon,
  AccountBalance as SaldoIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  CheckCircle as ValidarIcon,
  HourglassEmpty as PendenteIcon,
  FactCheck as ControlIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import apiClient from '@/services/api/client';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { useAuth } from '@/core/contexts/AuthContext';

// ─── Constantes de tipo ───────────────────────────────────────────────────────

const TIPOS_ENTRADA    = [1, 2];
const TIPOS_SAIDA      = [3, 4];
const TIPOS_TWO_PERSON = [4, 5];
const TIPO_FECHO       = 4;
const TIPO_CONTROLO    = 5;

const TIPO_META = {
  2: { docRequired: true,  docLabel: 'Nº Pedido associado' },
  3: { opRequired:  true,  opLabel:  'Ordem de Pagamento associada' },
  4: { isTwoPerson: true,  noValor: false, label: 'fecho de caixa' },
  5: { isTwoPerson: true,  noValor: true,  label: 'ponto de controlo' },
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtCurrency = (v) =>
  v != null
    ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)
    : '—';

const fmtDate = (v) => {
  if (!v) return '—';
  try { return format(typeof v === 'string' ? parseISO(v) : v, 'dd/MM/yyyy', { locale: pt }); }
  catch { return v; }
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

const useCaixa = (filters = {}) =>
  useQuery({
    queryKey: ['caixa', filters],
    queryFn: () => apiClient.get('/caixa', { params: filters }),
    staleTime: 2 * 60 * 1000,
  });

const useTipos = () =>
  useQuery({
    queryKey: ['caixa', 'tipos'],
    queryFn: () => apiClient.get('/caixa/tipos'),
    staleTime: 10 * 60 * 1000,
    select: (res) => res?.tipos ?? [],
  });

const useFechoState = () =>
  useQuery({
    queryKey: ['caixa', 'fecho-state'],
    queryFn: () => apiClient.get('/caixa/fecho-state'),
    staleTime: 30 * 1000,
  });

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, color, icon: Icon, loading }) => {
  const theme = useTheme();
  if (loading) return <Skeleton variant="rounded" height={88} />;
  return (
    <Card sx={{
      bgcolor: alpha(theme.palette[color]?.main || '#000', 0.06),
      border: `1px solid ${alpha(theme.palette[color]?.main || '#000', 0.2)}`,
    }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: theme.palette[color]?.main, color: 'white',
        }}>
          <Icon sx={{ fontSize: 24 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700} lineHeight={1.2}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// ─── Pending Banner ───────────────────────────────────────────────────────────

const PendingBanner = ({ pending, label, icon: Icon, currentUserId, onValidar, validating }) => {
  if (!pending) return null;
  const canValidate = currentUserId !== pending.creator?.pk;

  return (
    <Alert
      severity="warning"
      icon={<Icon />}
      sx={{ mb: 2, alignItems: 'center' }}
      action={
        canValidate && (
          <Button
            color="warning" variant="contained" size="small"
            startIcon={<ValidarIcon />}
            onClick={() => onValidar(pending.pk)}
            disabled={validating}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {validating ? 'A validar…' : 'Validar'}
          </Button>
        )
      }
    >
      <Typography variant="body2" fontWeight={600}>
        {label} pendente de validação
      </Typography>
      <Typography variant="body2">
        Criado por <strong>{pending.creator?.name}</strong> ({pending.creator?.username}).
        {canValidate
          ? ' Clique em "Validar" para confirmar.'
          : ' Aguarda validação por outro utilizador.'}
      </Typography>
    </Alert>
  );
};

// ─── Movement Form Dialog ─────────────────────────────────────────────────────

const FORM_EMPTY = {
  tt_caixamovimento: '',
  data: new Date().toISOString().slice(0, 10),
  valor: '',
  ordempagamento: '',
  tb_document: '',
};

const MovementDialog = ({ open, onClose, initial, tipos, currentUserId, fechoState, onSave, saving }) => {
  const [form, setForm] = useState(initial || FORM_EMPTY);
  useMemo(() => { setForm(initial || FORM_EMPTY); }, [initial]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const tipo      = Number(form.tt_caixamovimento);
  const meta      = TIPO_META[tipo] || {};
  const isSaida   = TIPOS_SAIDA.includes(tipo);
  const isEdit    = !!initial?.pk;

  // Estado de rotação para o tipo selecionado
  const tipoState = useMemo(() => {
    if (tipo === TIPO_FECHO)    return fechoState?.fecho;
    if (tipo === TIPO_CONTROLO) return fechoState?.controlo;
    return null;
  }, [tipo, fechoState]);

  const hasPending  = !!tipoState?.pending;
  const rotacao     = useMemo(() => {
    if (!meta.isTwoPerson || !tipoState?.has_previous || hasPending) return null;
    const isMyTurn = currentUserId === tipoState.next_creator?.pk;
    return { next_creator: tipoState.next_creator, isMyTurn };
  }, [meta.isTwoPerson, tipoState, hasPending, currentUserId]);

  const canSubmit = !meta.isTwoPerson || (!hasPending && (!rotacao || rotacao.isMyTurn));

  const handleSave = () => {
    if (!form.tt_caixamovimento) return toast.error('Selecione o tipo de movimento.');
    if (!meta.noValor && (form.valor === '' || Number(form.valor) <= 0))
      return toast.error('Introduza um valor positivo.');
    if (meta.docRequired && !form.tb_document)
      return toast.error('Pedido associado obrigatório para este tipo de movimento.');
    if (meta.opRequired && !form.ordempagamento)
      return toast.error('Ordem de pagamento obrigatória para este tipo de movimento.');
    if (!canSubmit) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {isEdit ? 'Editar Movimento' : 'Novo Movimento'}
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>

          <TextField
            select fullWidth required
            label="Tipo de Movimento"
            value={form.tt_caixamovimento}
            onChange={set('tt_caixamovimento')}
          >
            {tipos.map((t) => (
              <MenuItem key={t.pk} value={t.pk}>{t.value}</MenuItem>
            ))}
          </TextField>

          {/* Alertas para tipos de dois utilizadores */}
          {meta.isTwoPerson && hasPending && (
            <Alert severity="error">
              Existe um {meta.label} pendente de validação. Valide-o antes de criar um novo.
            </Alert>
          )}

          {meta.isTwoPerson && !hasPending && rotacao && (
            rotacao.isMyTurn ? (
              <Alert severity="info" icon={<InfoIcon />}>
                <Typography variant="body2" fontWeight={600}>É a sua vez de criar o {meta.label}</Typography>
                <Typography variant="body2">
                  Após criar, outro utilizador terá de validar para ficar registado.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="warning">
                <Typography variant="body2" fontWeight={600}>Não é a sua vez</Typography>
                <Typography variant="body2">
                  O próximo {meta.label} deve ser iniciado por{' '}
                  <strong>{rotacao.next_creator?.name}</strong> ({rotacao.next_creator?.username}).
                </Typography>
              </Alert>
            )
          )}

          {meta.isTwoPerson && !hasPending && !tipoState?.has_previous && (
            <Alert severity="info" icon={<InfoIcon />}>
              <Typography variant="body2">
                Primeiro {meta.label} registado. Após criar, outro utilizador terá de o validar.
              </Typography>
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: meta.noValor ? 12 : 6 }}>
              <TextField
                fullWidth required
                label="Data"
                type="date"
                value={form.data}
                onChange={set('data')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Valor: oculto para tipo 5 (ponto de controlo) */}
            {!meta.noValor && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth required
                  label={`Valor (€) — ${isSaida ? 'saída' : 'entrada'}`}
                  type="number"
                  value={form.valor}
                  onChange={set('valor')}
                  helperText="Introduza sempre um valor positivo"
                  inputProps={{ min: 0.01, step: '0.01' }}
                  InputProps={{
                    startAdornment: (
                      <Box component="span" sx={{ mr: 0.5, color: isSaida ? 'error.main' : 'success.main', fontWeight: 700 }}>
                        {isSaida ? '−' : '+'}
                      </Box>
                    ),
                  }}
                />
              </Grid>
            )}
          </Grid>

          {/* Tipo 2: pedido obrigatório */}
          {meta.docRequired && (
            <TextField
              fullWidth required
              label={meta.docLabel}
              value={form.tb_document}
              onChange={set('tb_document')}
              helperText="PK do pedido (número interno)"
            />
          )}

          {/* Tipo 3: OP obrigatória */}
          {meta.opRequired && (
            <TextField
              fullWidth required
              label={meta.opLabel}
              value={form.ordempagamento}
              onChange={set('ordempagamento')}
            />
          )}

          {/* Campos opcionais (para tipos 1, 4, 5) */}
          {!meta.opRequired && !meta.isTwoPerson && (
            <TextField
              fullWidth
              label="Ordem de Pagamento (opcional)"
              value={form.ordempagamento}
              onChange={set('ordempagamento')}
            />
          )}

          {!meta.docRequired && !meta.isTwoPerson && (
            <TextField
              fullWidth
              label="Nº Pedido associado (opcional)"
              value={form.tb_document}
              onChange={set('tb_document')}
            />
          )}

        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !canSubmit}>
          {saving ? 'A guardar…' : isEdit ? 'Guardar Alterações' : 'Registar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const CaixaPage = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissionContext();
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.user_id;

  const canEdit = hasPermission('payments.caixa.edit');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow]   = useState(null);

  const filters = useMemo(() => {
    const f = {};
    if (dateFrom) f.date_from = dateFrom;
    if (dateTo)   f.date_to   = dateTo;
    return f;
  }, [dateFrom, dateTo]);

  const { data, isLoading, isError } = useCaixa(filters);
  const { data: tipos = [] }         = useTipos();
  const { data: fechoState }         = useFechoState();

  const movements = data?.movements ?? [];
  const summary   = data?.summary ?? { saldo: 0, total_entrada: 0, total_saida: 0, count: 0 };

  // ── Mutations ──

  const invalidateCaixa = () => queryClient.invalidateQueries({ queryKey: ['caixa'] });

  const createMut = useMutation({
    mutationFn: (body) => apiClient.post('/caixa', body),
    onSuccess: () => { toast.success('Movimento registado com sucesso.'); invalidateCaixa(); setFormOpen(false); },
    onError: (err) => toast.error(err?.message || 'Erro ao registar movimento.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ pk, ...body }) => apiClient.put(`/caixa/${pk}`, body),
    onSuccess: () => { toast.success('Movimento atualizado com sucesso.'); invalidateCaixa(); setFormOpen(false); setEditRow(null); },
    onError: (err) => toast.error(err?.message || 'Erro ao atualizar movimento.'),
  });

  const validateMut = useMutation({
    mutationFn: (pk) => apiClient.post(`/caixa/${pk}/validar`),
    onSuccess: (_, __, ctx) => { toast.success('Validado com sucesso.'); invalidateCaixa(); },
    onError: (err) => toast.error(err?.message || 'Erro ao validar.'),
  });

  const handleSave = (form) => {
    const tipo = Number(form.tt_caixamovimento);
    const body = {
      tt_caixamovimento: tipo,
      data:              form.data,
      valor:             TIPO_META[tipo]?.noValor ? 0 : parseFloat(form.valor),
      ordempagamento:    form.ordempagamento || null,
      tb_document:       form.tb_document ? Number(form.tb_document) : null,
    };
    if (editRow) updateMut.mutate({ pk: editRow.pk, ...body });
    else         createMut.mutate(body);
  };

  const handleEdit = (row) => {
    setEditRow({
      pk:                row.pk,
      tt_caixamovimento: row.tt_caixamovimento_raw ?? '',
      data:              row.data?.slice(0, 10) ?? '',
      valor:             row.valor != null ? Math.abs(row.valor) : '',
      ordempagamento:    row.ordempagamento ?? '',
      tb_document:       row.tb_document_pk ?? row.tb_document ?? '',
    });
    setFormOpen(true);
  };

  // ── Columns ──

  const columns = [
    {
      field: 'data',
      headerName: 'Data',
      flex: 0.7,
      minWidth: 95,
      headerAlign: 'center',
      align: 'center',
      valueFormatter: (v) => fmtDate(v),
    },
    {
      field: 'tt_caixamovimento',
      headerName: 'Tipo',
      flex: 1.2,
      minWidth: 130,
    },
    {
      field: 'valor',
      headerName: 'Valor',
      flex: 1,
      minWidth: 120,
      headerAlign: 'right',
      align: 'right',
      renderCell: ({ row, value }) => {
        if (row.tt_caixamovimento_raw === TIPO_CONTROLO) {
          return (
            <Chip label="Controlo" size="small" icon={<ControlIcon />}
              color="info" variant="outlined" sx={{ fontSize: 11 }} />
          );
        }
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end', width: '100%' }}>
            {value >= 0
              ? <EntradaIcon sx={{ fontSize: 13, color: 'success.main' }} />
              : <SaidaIcon   sx={{ fontSize: 13, color: 'error.main' }} />}
            <Typography variant="body2" fontWeight={600}
              color={value >= 0 ? 'success.main' : 'error.main'}>
              {fmtCurrency(value)}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'saldo',
      headerName: 'Saldo',
      flex: 1,
      minWidth: 120,
      headerAlign: 'right',
      align: 'right',
      renderCell: ({ value }) => (
        <Typography variant="body2" fontWeight={600}
          color={value >= 0 ? 'text.primary' : 'error.main'}>
          {fmtCurrency(value)}
        </Typography>
      ),
    },
    {
      field: 'ts_client1',
      headerName: 'Registado por',
      flex: 1.5,
      minWidth: 130,
      renderCell: ({ value }) => (
        <Typography variant="body2" noWrap title={value}>{value || '—'}</Typography>
      ),
    },
    {
      field: 'ts_client2',
      headerName: 'Validado por',
      flex: 1.5,
      minWidth: 140,
      renderCell: ({ row }) => {
        const isTwoPerson = TIPOS_TWO_PERSON.includes(row.tt_caixamovimento_raw);
        if (!isTwoPerson) return <Typography variant="body2" color="text.disabled">—</Typography>;
        if (row.is_pending_validation) return (
          <Chip label="Aguarda validação" size="small" color="warning"
            icon={<PendenteIcon />} sx={{ fontSize: 11 }} />
        );
        return (
          <Chip label={row.ts_client2} size="small" color="success"
            icon={<ValidarIcon />} variant="outlined" sx={{ fontSize: 11 }}
            title={row.ts_client2} />
        );
      },
    },
    {
      field: 'tb_document',
      headerName: 'Pedido',
      flex: 0.8,
      minWidth: 110,
      headerAlign: 'center',
      align: 'center',
      renderCell: ({ value }) => value
        ? <Chip label={value} size="small" variant="outlined" sx={{ fontSize: 11 }} />
        : <Typography variant="body2" color="text.disabled">—</Typography>,
    },
    {
      field: 'ordempagamento',
      headerName: 'Ordem Pag.',
      flex: 0.9,
      minWidth: 110,
      renderCell: ({ value }) => (
        <Typography variant="body2" noWrap title={value}>{value || '—'}</Typography>
      ),
    },
    ...(canEdit ? [{
      field: '_actions',
      headerName: '',
      width: 48,
      sortable: false,
      align: 'center',
      renderCell: ({ row }) => (
        <Tooltip title="Editar">
          <IconButton size="small" onClick={() => handleEdit(row)}>
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      ),
    }] : []),
  ];

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <ModulePage
      title="Fundo de Caixa"
      subtitle="Gestão de movimentos e controlo do saldo de caixa"
      icon={CaixaIcon}
      color="#ff9800"
      breadcrumbs={[
        { label: 'Pagamentos', path: '/payments' },
        { label: 'Caixa', path: '/caixa' },
      ]}
      actions={
        canEdit && (
          <Button
            variant="contained" startIcon={<AddIcon />} onClick={() => { setEditRow(null); setFormOpen(true); }}
            sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
          >
            Novo Movimento
          </Button>
        )
      }
    >
      {/* ── Banners de pendentes ── */}
      {canEdit && (
        <>
          <PendingBanner
            pending={fechoState?.fecho?.pending}
            label="Fecho de caixa"
            icon={CaixaIcon}
            currentUserId={currentUserId}
            onValidar={(pk) => validateMut.mutate(pk)}
            validating={validateMut.isPending}
          />
          <PendingBanner
            pending={fechoState?.controlo?.pending}
            label="Ponto de controlo"
            icon={ControlIcon}
            currentUserId={currentUserId}
            onValidar={(pk) => validateMut.mutate(pk)}
            validating={validateMut.isPending}
          />
        </>
      )}

      {/* ── Stats ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Saldo Atual" value={fmtCurrency(summary.saldo)}
            color={summary.saldo >= 0 ? 'primary' : 'error'} icon={SaldoIcon} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Total Entradas" value={fmtCurrency(summary.total_entrada)}
            color="success" icon={EntradaIcon} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Total Saídas" value={fmtCurrency(summary.total_saida)}
            color="error" icon={SaidaIcon} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Nº Movimentos" value={summary.count}
            color="info" icon={CaixaIcon} loading={isLoading} />
        </Grid>
      </Grid>

      {/* ── Table ── */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{
          px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1,
          borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap',
        }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>Movimentos</Typography>
          <Button size="small" startIcon={<FilterIcon />}
            onClick={() => setFiltersOpen((p) => !p)}
            variant={filtersOpen ? 'contained' : 'outlined'} color="inherit">
            Filtrar por data
          </Button>
        </Box>

        {filtersOpen && (
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.action.hover, 0.3) }}>
            <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
              <TextField size="small" type="date" label="De" value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
              <TextField size="small" type="date" label="Até" value={dateTo}
                onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
              {(dateFrom || dateTo) && (
                <Button size="small" color="inherit" startIcon={<CloseIcon />}
                  onClick={() => { setDateFrom(''); setDateTo(''); }}>
                  Limpar
                </Button>
              )}
            </Stack>
          </Box>
        )}

        <Box sx={{ p: 1 }}>
          {isLoading ? (
            <Skeleton variant="rounded" height={320} />
          ) : isError ? (
            <Alert severity="error" sx={{ m: 2 }}>Erro ao carregar movimentos de caixa.</Alert>
          ) : movements.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10, color: 'text.disabled' }}>
              <CaixaIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
              <Typography variant="h6">Sem movimentos registados</Typography>
              {canEdit && (
                <Button variant="outlined" sx={{ mt: 2 }} startIcon={<AddIcon />}
                  onClick={() => { setEditRow(null); setFormOpen(true); }}>
                  Registar Primeiro Movimento
                </Button>
              )}
            </Box>
          ) : (
            <DataGrid
              rows={movements} columns={columns}
              getRowId={(r) => r.pk}
              autoHeight disableRowSelectionOnClick
              pageSizeOptions={[25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              getRowClassName={({ row }) => row.is_pending_validation ? 'row-pending' : ''}
              sx={{
                border: 0,
                '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
                '& .MuiDataGrid-row:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) },
                '& .row-pending': { bgcolor: alpha(theme.palette.warning.main, 0.06) },
              }}
            />
          )}
        </Box>
      </Paper>

      <MovementDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditRow(null); }}
        initial={editRow}
        tipos={tipos}
        currentUserId={currentUserId}
        fechoState={fechoState}
        onSave={handleSave}
        saving={saving}
      />
    </ModulePage>
  );
};

export default CaixaPage;
