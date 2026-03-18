/**
 * ExpensePage — componente reutilizável para páginas de registo de despesas.
 * Usado por: Manutenção, Equipamento, e como tab nas páginas de Rede e Ramais.
 */
import { useState, useMemo } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, Grid, IconButton, Chip,
  InputAdornment, LinearProgress, MenuItem, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Euro as EuroIcon,
  CalendarMonth as CalendarIcon,
  Category as CategoryIcon,
  Person as PersonIcon,
  AttachMoney as ExpenseIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, alpha } from '@mui/material/styles';
import { format } from 'date-fns';
import * as z from 'zod';
import { useExpenseTypes, useAssociates } from '@/core/hooks/useMetaData';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') || str.includes(' ') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

const toStr = (date) =>
  date instanceof Date && !isNaN(date.getTime()) ? format(date, 'yyyy-MM-dd') : '';

const formatDate = (str) => {
  const d = toDate(str);
  return d ? d.toLocaleDateString('pt-PT') : '—';
};

const formatCurrency = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(num);
};

// ─── Zod schema ──────────────────────────────────────────────────────────────

const expenseSchema = z.object({
  pndate: z.string().min(1, 'Data é obrigatória'),
  pntt_expensedest: z.string().min(1, 'Destino é obrigatório'),
  pnval: z.string().min(1, 'Valor é obrigatório').refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    'Valor deve ser positivo'
  ),
  pnts_associate: z.string().optional(),
  pnmemo: z.string().optional(),
});

const defaultValues = {
  pndate: toStr(new Date()),
  pntt_expensedest: '',
  pnval: '',
  pnts_associate: '',
  pnmemo: '',
};

// ─── Cell helper ─────────────────────────────────────────────────────────────

const Cell = ({ children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
    {children}
  </Box>
);

// ─── ExpenseFormDialog ────────────────────────────────────────────────────────

const ExpenseFormDialog = ({ open, onClose, onSubmit: onSubmitProp, isAdding, expenseTypes, associates }) => {
  const theme = useTheme();
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues,
  });

  const handleClose = () => {
    reset(defaultValues);
    onClose();
  };

  const onSubmit = async (data) => {
    const payload = {
      pntt_expensedest: parseInt(data.pntt_expensedest, 10),
      pndate: data.pndate,
      pnval: parseFloat(data.pnval),
      pnts_associate: data.pnts_associate ? parseInt(data.pnts_associate, 10) : null,
      pnmemo: data.pnmemo || null,
    };
    await onSubmitProp(payload);
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={isAdding ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
      TransitionProps={{ onEnter: () => reset(defaultValues) }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ExpenseIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Registar Despesa</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={isAdding}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        {isAdding && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>

            {/* Data */}
            <Grid size={{ xs: 12, sm: 5 }}>
              <Controller
                name="pndate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Data"
                    value={toDate(field.value)}
                    onChange={(date) => field.onChange(toStr(date))}
                    slots={{ openPickerIcon: CalendarIcon }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        onBlur: field.onBlur,
                        error: !!errors.pndate,
                        helperText: errors.pndate?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Destino */}
            <Grid size={{ xs: 12, sm: 7 }}>
              <Controller
                name="pntt_expensedest"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Destino"
                    fullWidth
                    error={!!errors.pntt_expensedest}
                    helperText={errors.pntt_expensedest?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CategoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {expenseTypes.map((t) => (
                      <MenuItem key={t.pk} value={String(t.pk)}>
                        {t.value}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Valor */}
            <Grid size={{ xs: 12, sm: 5 }}>
              <Controller
                name="pnval"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Valor (€)"
                    fullWidth
                    type="number"
                    inputProps={{ min: 0.01, step: '0.01' }}
                    error={!!errors.pnval}
                    helperText={errors.pnval?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EuroIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Associado */}
            <Grid size={{ xs: 12, sm: 7 }}>
              <Controller
                name="pnts_associate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Associado (opcional)"
                    fullWidth
                    error={!!errors.pnts_associate}
                    helperText={errors.pnts_associate?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  >
                    <MenuItem value="">— Nenhum —</MenuItem>
                    {associates.map((a) => (
                      <MenuItem key={a.pk} value={String(a.pk)}>
                        {a.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Descrição */}
            <Grid size={12}>
              <Controller
                name="pnmemo"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Descrição (opcional)"
                    fullWidth
                    multiline
                    rows={2}
                    error={!!errors.pnmemo}
                    helperText={errors.pnmemo?.message}
                  />
                )}
              />
            </Grid>

          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={handleClose} color="inherit" disabled={isAdding}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isAdding} startIcon={<ExpenseIcon />}>
            Registar Despesa
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// ─── ExpensePage (componente principal exportado) ─────────────────────────────

/**
 * @param {Object} props
 * @param {Function} props.useHook - Hook a usar (ex: useManutExpenses)
 * @param {string} props.title - Título da página
 * @param {React.ComponentType} props.icon - Ícone MUI
 * @param {string} props.color - Cor do módulo
 * @param {Array} props.breadcrumbs - Breadcrumbs
 * @param {React.ReactNode} [props.extraActions] - Botões adicionais na barra de ações
 */
const ExpensePage = ({ useHook, title, icon: PageIcon, color, breadcrumbs, extraActions }) => {
  const theme = useTheme();
  const { expenses, isLoading, addExpense, isAdding } = useHook();
  const { data: expenseTypes = [] } = useExpenseTypes();
  const { data: associates = [] } = useAssociates();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const expTypeMap = useMemo(() =>
    Object.fromEntries(expenseTypes.map((t) => [t.pk, t.value])),
    [expenseTypes]
  );

  const assocMap = useMemo(() =>
    Object.fromEntries(associates.map((a) => [a.pk, a.name])),
    [associates]
  );

  const rows = useMemo(() => {
    if (!search.trim()) return expenses;
    const q = search.toLowerCase();
    return expenses.filter((e) =>
      [expTypeMap[e.tt_expensedest], assocMap[e.ts_associate], e.memo]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [expenses, search, expTypeMap, assocMap]);

  const totalValue = useMemo(() =>
    expenses.reduce((sum, e) => {
      const v = parseFloat(e.valor);
      return sum + (isNaN(v) ? 0 : v);
    }, 0),
    [expenses]
  );

  const columns = [
    {
      field: 'data',
      headerName: 'Data',
      width: 110,
      renderCell: ({ value }) => <Cell><Typography variant="body2">{formatDate(value)}</Typography></Cell>,
    },
    {
      field: 'tt_expensedest',
      headerName: 'Destino',
      width: 180,
      renderCell: ({ value }) => (
        <Cell>
          <Chip
            label={expTypeMap[value] || '—'}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ maxWidth: '100%' }}
          />
        </Cell>
      ),
    },
    {
      field: 'valor',
      headerName: 'Valor',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => (
        <Cell>
          <Typography variant="body2" fontWeight={600} sx={{ ml: 'auto' }}>
            {formatCurrency(value)}
          </Typography>
        </Cell>
      ),
    },
    {
      field: 'ts_associate',
      headerName: 'Associado',
      flex: 1,
      minWidth: 150,
      renderCell: ({ value }) => <Cell><Typography variant="body2">{assocMap[value] || '—'}</Typography></Cell>,
    },
    {
      field: 'memo',
      headerName: 'Descrição',
      flex: 2,
      minWidth: 200,
      renderCell: ({ value }) => (
        <Cell>
          <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {value || '—'}
          </Typography>
        </Cell>
      ),
    },
  ];

  return (
    <Box>
      {/* Barra de ferramentas */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setFormOpen(true)}
          size="small"
        >
          Nova Despesa
        </Button>
        {extraActions}
        <TextField
          size="small"
          placeholder="Pesquisar destino, associado, descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={`${expenses.length} registo${expenses.length !== 1 ? 's' : ''}`}
            size="small"
            variant="outlined"
          />
          {totalValue > 0 && (
            <Chip
              label={`Total: ${formatCurrency(totalValue)}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* DataGrid */}
      <DataGrid
        rows={rows}
        columns={columns}
        loading={isLoading}
        autoHeight
        getRowHeight={() => 'auto'}
        disableRowSelectionOnClick
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        sx={{
          borderRadius: 2,
          '& .MuiDataGrid-cell': { py: 1.5 },
          '& .MuiDataGrid-columnHeaders': {
            bgcolor: alpha(color || theme.palette.primary.main, 0.05),
            fontWeight: 700,
          },
        }}
        localeText={{
          noRowsLabel: 'Sem registos de despesas',
          MuiTablePagination: {
            labelRowsPerPage: 'Linhas por página:',
            labelDisplayedRows: ({ from, to, count }) =>
              `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`,
          },
        }}
      />

      {/* Dialog de nova despesa */}
      <ExpenseFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={addExpense}
        isAdding={isAdding}
        expenseTypes={expenseTypes}
        associates={associates}
      />
    </Box>
  );
};

export default ExpensePage;
