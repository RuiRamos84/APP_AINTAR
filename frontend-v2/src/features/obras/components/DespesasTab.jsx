/**
 * DespesasTab — Gestão global de despesas de obra.
 * Utilizado no módulo /obras (tab "Despesas").
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TableSortLabel, Paper, IconButton, Tooltip, Typography,
  Skeleton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Grid, CircularProgress, Divider, InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Euro as EuroIcon,
  Save as SaveIcon, CalendarMonth as CalIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import * as svc from '../services/obrasService';

const formatDate = (d) =>
  d ? new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('pt-PT') : '—';

const formatCurrency = (v) =>
  v != null ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v) : '—';

// Lookups client-side (fallback caso a view não retorne os labels)
const lookupObraNome = (d, obras) =>
  d.obraNome ?? obras?.find((o) => o.id === d.obraId)?.nome ?? '—';
const lookupTipoDespesa = (d, meta) =>
  d.tipoDespesaLabel ?? meta?.despesaobra?.find((t) => t.pk === d.tipoDespesa)?.value ?? '—';

// ─── Dialog Despesa ────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }) {
  return (
    <Grid size={12}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 0.5 }}>
        <Icon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {label}
        </Typography>
        <Divider sx={{ flex: 1 }} />
      </Box>
    </Grid>
  );
}

function DespesaDialog({ open, onClose, onSubmit, despesa, meta, obras }) {
  const { despesaobra = [] } = meta ?? {};

  const {
    control, handleSubmit, reset,
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: { obraId: '', tipoDespesa: '', data: '', valor: '', memo: '' },
  });

  useEffect(() => {
    if (open) {
      reset(despesa ? {
        obraId: despesa.obraId != null ? String(despesa.obraId) : '',
        tipoDespesa: despesa.tipoDespesa != null ? String(despesa.tipoDespesa) : '',
        data: despesa.data ? despesa.data.split('T')[0] : '',
        valor: despesa.valor != null ? String(despesa.valor) : '',
        memo: despesa.memo ?? '',
      } : { obraId: '', tipoDespesa: '', data: '', valor: '', memo: '' });
    }
  }, [open, despesa, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EuroIcon fontSize="small" color="primary" />
        {despesa ? 'Editar Despesa' : 'Nova Despesa de Obra'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Grid container spacing={2}>

            {/* ── Obra ── */}
            <SectionLabel icon={EuroIcon} label="Identificação" />

            <Grid size={12}>
              <Controller
                name="obraId"
                control={control}
                rules={{ required: 'Obra obrigatória' }}
                render={({ field }) => (
                  <TextField
                    {...field} select fullWidth size="small" label="Obra *"
                    error={!!errors.obraId} helperText={errors.obraId?.message}
                  >
                    <MenuItem value=""><em>— Selecionar —</em></MenuItem>
                    {obras.map((o) => (
                      <MenuItem key={o.id} value={String(o.id)}>{o.nome}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid size={12}>
              <Controller
                name="tipoDespesa"
                control={control}
                rules={{ required: 'Tipo de despesa obrigatório' }}
                render={({ field }) => (
                  <TextField
                    {...field} select fullWidth size="small" label="Tipo de Despesa *"
                    error={!!errors.tipoDespesa} helperText={errors.tipoDespesa?.message}
                  >
                    <MenuItem value=""><em>— Selecionar —</em></MenuItem>
                    {despesaobra.map((d) => (
                      <MenuItem key={d.pk} value={String(d.pk)}>{d.value}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* ── Valor e Data ── */}
            <SectionLabel icon={CalIcon} label="Valor e Data" />

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="valor"
                control={control}
                rules={{ required: 'Valor obrigatório' }}
                render={({ field }) => (
                  <TextField
                    {...field} fullWidth type="number" size="small" label="Valor *"
                    inputProps={{ step: '0.01', min: 0 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">€</InputAdornment> }}
                    error={!!errors.valor} helperText={errors.valor?.message}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="data"
                control={control}
                rules={{ required: 'Data obrigatória' }}
                render={({ field }) => (
                  <TextField
                    {...field} fullWidth type="date" size="small" label="Data *"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.data} helperText={errors.data?.message}
                  />
                )}
              />
            </Grid>

            {/* ── Observações ── */}
            <Grid size={12}>
              <Controller
                name="memo"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth size="small" label="Observações" multiline rows={2} />
                )}
              />
            </Grid>

          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">Cancelar</Button>
          <Button
            type="submit" variant="contained" disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : despesa ? <SaveIcon /> : <AddIcon />}
          >
            {despesa ? 'Guardar alterações' : 'Adicionar Despesa'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ─── Tabela principal ──────────────────────────────────────────────────────────

const COLS = [
  { id: 'obraNome',        label: 'Obra',         sortable: true },
  { id: 'tipoDespesaLabel',label: 'Tipo',         sortable: true },
  { id: 'data',            label: 'Data',         sortable: true },
  { id: 'valor',           label: 'Valor (€)',    sortable: true },
  { id: 'memo',            label: 'Observações',  sortable: false },
  { id: 'acoes',           label: 'Ações',        sortable: false },
];

function desc(a, b, col) {
  const av = a[col] ?? '';
  const bv = b[col] ?? '';
  if (bv < av) return -1;
  if (bv > av) return 1;
  return 0;
}

export default function DespesasTab({ meta, canEdit, obras }) {
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('data');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { despesas: list } = await svc.getDespesas();
      setDespesas(list);
    } catch {
      toast.error('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSort = (col) => {
    const isAsc = orderBy === col && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(col);
  };

  const handleSubmit = async (values) => {
    try {
      if (editTarget) {
        await svc.updateDespesa(editTarget.id, values);
        toast.success('Despesa atualizada');
      } else {
        await svc.createDespesa(values);
        toast.success('Despesa adicionada');
      }
      setDialogOpen(false);
      setEditTarget(null);
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao guardar despesa';
      toast.error(msg);
      throw err;
    }
  };

  const sorted = [...despesas].sort(
    order === 'desc'
      ? (a, b) => desc(a, b, orderBy)
      : (a, b) => -desc(a, b, orderBy)
  );

  if (loading) {
    return (
      <Box sx={{ p: 1 }}>
        {[...Array(4)].map((_, i) => <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />)}
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          {despesas.length === 0
            ? 'Sem despesas registadas'
            : `${despesas.length} despesa${despesas.length !== 1 ? 's' : ''}`}
        </Typography>
        {canEdit && (
          <Button
            size="small" variant="outlined" startIcon={<AddIcon />}
            onClick={() => { setEditTarget(null); setDialogOpen(true); }}
          >
            Nova Despesa
          </Button>
        )}
      </Box>

      {despesas.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <EuroIcon sx={{ fontSize: 40, opacity: 0.3 }} />
          <Typography variant="body2">Nenhuma despesa registada.</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {COLS.map((col) => (
                  <TableCell key={col.id} sx={{ fontWeight: 700 }}>
                    {col.sortable ? (
                      <TableSortLabel
                        active={orderBy === col.id}
                        direction={orderBy === col.id ? order : 'asc'}
                        onClick={() => handleSort(col.id)}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{lookupObraNome(d, obras)}</TableCell>
                  <TableCell>{lookupTipoDespesa(d, meta)}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    {formatDate(d.data)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{formatCurrency(d.valor)}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    {d.memo || '—'}
                  </TableCell>
                  <TableCell align="right">
                    {canEdit && (
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => { setEditTarget(d); setDialogOpen(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <DespesaDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        onSubmit={handleSubmit}
        despesa={editTarget}
        meta={meta}
        obras={obras}
      />
    </Box>
  );
}
