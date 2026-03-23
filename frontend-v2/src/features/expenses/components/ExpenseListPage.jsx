/**
 * ExpenseListPage — Componente partilhado para listagem de despesas.
 * Usado pelas 4 páginas: Rede, Ramais, Manutenção, Equipamento.
 */
import { useState, useCallback, useMemo } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TableSortLabel, Paper, Typography, Skeleton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Grid, CircularProgress, InputAdornment, Divider,
} from '@mui/material';
import { Add as AddIcon, Euro as EuroIcon, CalendarMonth as CalIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { ModulePage } from '@/shared/components/layout';
import { useExpenseTypes, useAssociates } from '@/core/hooks/useMetaData';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { PERMISSIONS } from '@/core/config/permissionMap';

const formatDate = (d) =>
  d ? new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('pt-PT') : '—';

const formatCurrency = (v) =>
  v != null ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v) : '—';

function desc(a, b, col) {
  const av = a[col] ?? '';
  const bv = b[col] ?? '';
  if (bv < av) return -1;
  if (bv > av) return 1;
  return 0;
}

// ─── Dialog Nova Despesa ───────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }) {
  return (
    <Grid size={12}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 0.5 }}>
        <Icon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary" fontWeight={700}
          sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {label}
        </Typography>
        <Divider sx={{ flex: 1 }} />
      </Box>
    </Grid>
  );
}

function ExpenseDialog({ open, onClose, onSubmit, expenseTypes, associates }) {
  const { control, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm({
    defaultValues: { tipoDespesaId: '', data: '', valor: '', associadoId: '', memo: '' },
  });

  const handleClose = () => { reset(); onClose(); };

  const handleFormSubmit = async (values) => {
    await onSubmit(values);
    reset();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EuroIcon fontSize="small" color="primary" />
        Nova Despesa
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Grid container spacing={2}>

            <SectionLabel icon={EuroIcon} label="Identificação" />

            <Grid size={12}>
              <Controller
                name="tipoDespesaId"
                control={control}
                rules={{ required: 'Tipo de despesa obrigatório' }}
                render={({ field }) => (
                  <TextField {...field} select fullWidth size="small" label="Tipo de Despesa *"
                    error={!!errors.tipoDespesaId} helperText={errors.tipoDespesaId?.message}>
                    <MenuItem value=""><em>— Selecionar —</em></MenuItem>
                    {expenseTypes.map((t) => (
                      <MenuItem key={t.pk} value={String(t.pk)}>{t.value}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid size={12}>
              <Controller
                name="associadoId"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select fullWidth size="small" label="Associado">
                    <MenuItem value="">— Nenhum —</MenuItem>
                    {associates.map((a) => (
                      <MenuItem key={a.pk} value={String(a.pk)}>{a.name}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <SectionLabel icon={CalIcon} label="Valor e Data" />

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="valor"
                control={control}
                rules={{
                  required: 'Valor obrigatório',
                  validate: (v) => parseFloat(v) > 0 || 'Valor deve ser positivo',
                }}
                render={({ field }) => (
                  <TextField {...field} fullWidth type="number" size="small" label="Valor *"
                    inputProps={{ step: '0.01', min: 0.01 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">€</InputAdornment> }}
                    error={!!errors.valor} helperText={errors.valor?.message} />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="data"
                control={control}
                rules={{ required: 'Data obrigatória' }}
                render={({ field }) => (
                  <TextField {...field} fullWidth type="date" size="small" label="Data *"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.data} helperText={errors.data?.message} />
                )}
              />
            </Grid>

            <Grid size={12}>
              <Controller
                name="memo"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth size="small" label="Descrição" multiline rows={2} />
                )}
              />
            </Grid>

          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <AddIcon />}>
            Registar Despesa
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ─── Tabela ────────────────────────────────────────────────────────────────────

const COLS = [
  { id: 'data',          label: 'Data',       sortable: true  },
  { id: 'tipoLabel',     label: 'Tipo',       sortable: true  },
  { id: 'valor',         label: 'Valor (€)',  sortable: true  },
  { id: 'associadoNome', label: 'Associado',  sortable: true  },
  { id: 'memo',          label: 'Descrição',  sortable: false },
];

// ─── Componente principal ──────────────────────────────────────────────────────

export default function ExpenseListPage({
  title, subtitle, icon: Icon, color, breadcrumbs,
  expenses, loading, onAdd,
}) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(PERMISSIONS.EXPENSES_CREATE);

  const { data: expenseTypes = [] } = useExpenseTypes();
  const { data: associates = [] }   = useAssociates();

  const [order, setOrder]     = useState('desc');
  const [orderBy, setOrderBy] = useState('data');
  const [dialogOpen, setDialogOpen] = useState(false);

  const totalValue = useMemo(() => expenses.reduce((s, e) => s + (e.valor ?? 0), 0), [expenses]);

  const handleSort = (col) => {
    setOrder(orderBy === col && order === 'asc' ? 'desc' : 'asc');
    setOrderBy(col);
  };

  const sorted = useMemo(() => [...expenses].sort((a, b) =>
    order === 'desc' ? desc(a, b, orderBy) : -desc(a, b, orderBy)
  ), [expenses, order, orderBy]);

  const handleSubmit = useCallback(async (values) => {
    try {
      await onAdd(values);
      setDialogOpen(false);
      toast.success('Despesa registada com sucesso');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao registar despesa');
      throw err;
    }
  }, [onAdd]);

  const actions = canEdit ? (
    <Button variant="contained" size="small" startIcon={<AddIcon />}
      onClick={() => setDialogOpen(true)}>
      Nova Despesa
    </Button>
  ) : null;

  return (
    <ModulePage
      title={title}
      subtitle={subtitle}
      icon={Icon}
      color={color}
      breadcrumbs={breadcrumbs}
      actions={actions}
    >
      {/* Totais */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Chip
          label={`${expenses.length} registo${expenses.length !== 1 ? 's' : ''}`}
          size="small" variant="outlined"
        />
        {totalValue > 0 && (
          <Chip
            label={`Total: ${formatCurrency(totalValue)}`}
            size="small" color="primary" variant="outlined"
          />
        )}
      </Box>

      {loading ? (
        <Box>{[...Array(5)].map((_, i) => <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />)}</Box>
      ) : expenses.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <EuroIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
          <Typography variant="body2">Nenhuma despesa registada.</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {COLS.map((col) => (
                  <TableCell key={col.id} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
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
              {sorted.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {formatDate(e.data)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={e.tipoLabel ?? '—'}
                      size="small" variant="outlined" color="primary"
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {formatCurrency(e.valor)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>
                    {e.associadoNome ?? '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    {e.memo || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ExpenseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        expenseTypes={expenseTypes}
        associates={associates}
      />
    </ModulePage>
  );
}
