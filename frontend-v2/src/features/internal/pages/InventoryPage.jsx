import { useState, useMemo, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, Grid, IconButton, Chip,
  InputAdornment, LinearProgress, MenuItem, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Category as CategoryIcon,
  Person as PersonIcon,
  Euro as EuroIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, alpha } from '@mui/material/styles';
import { format } from 'date-fns';
import * as z from 'zod';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useInventory } from '../hooks/useInventory';
import { useInventoryTypes } from '@/core/hooks/useMetaData';
import { useWhoList } from '@/core/hooks/useMetaData';

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

const inventorySchema = z.object({
  assign_date: z.string().min(1, 'Data é obrigatória'),
  tt_inventorytype: z.string().min(1, 'Tipo é obrigatório'),
  brand: z.string().min(1, 'Marca é obrigatória'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  cost: z.string().min(1, 'Valor é obrigatório').refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
    'Valor deve ser um número positivo'
  ),
  assign_who: z.string().min(1, 'Associado é obrigatório'),
});

const defaultValues = {
  assign_date: toStr(new Date()),
  tt_inventorytype: '',
  brand: '',
  model: '',
  cost: '',
  assign_who: '',
};

// ─── Cell wrapper ────────────────────────────────────────────────────────────

const Cell = ({ children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
    {children}
  </Box>
);

// ─── InventoryFormModal ───────────────────────────────────────────────────────

const InventoryFormModal = ({ open, onClose, item = null, inventoryTypes, whoList }) => {
  const theme = useTheme();
  const { addItem, editItem, isAdding, isEditing } = useInventory();
  const isEditMode = !!item;
  const isSubmitting = isAdding || isEditing;

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(inventorySchema),
    defaultValues,
  });

  // Reset form when dialog opens/closes
  useState(() => {
    if (item && open) {
      reset({
        assign_date: toStr(toDate(item.assign_date)),
        tt_inventorytype: String(item.tt_inventorytype ?? ''),
        brand: item.brand || '',
        model: item.model || '',
        cost: String(item.cost ?? ''),
        assign_who: String(item.assign_who ?? ''),
      });
    } else if (!open) {
      reset(defaultValues);
    }
  });

  // Also use useEffect pattern for proper reset on open/close
  const handleClose = () => {
    reset(defaultValues);
    onClose();
  };

  const onSubmit = async (data) => {
    const payload = {
      assign_date: data.assign_date,
      tt_inventorytype: parseInt(data.tt_inventorytype, 10),
      brand: data.brand,
      model: data.model,
      cost: parseFloat(data.cost),
      assign_who: parseInt(data.assign_who, 10),
    };
    try {
      if (isEditMode) {
        await editItem({ pk: item.pk, data: payload });
      } else {
        await addItem(payload);
      }
      handleClose();
    } catch {
      // Toast handled in hook
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
      TransitionProps={{ onEnter: () => {
        if (item) {
          reset({
            assign_date: toStr(toDate(item.assign_date)),
            tt_inventorytype: String(item.tt_inventorytype ?? ''),
            brand: item.brand || '',
            model: item.model || '',
            cost: String(item.cost ?? ''),
            assign_who: String(item.assign_who ?? ''),
          });
        } else {
          reset(defaultValues);
        }
      }}}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InventoryIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              {isEditMode ? 'Editar Item' : 'Registar Item de Inventário'}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={isSubmitting}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        {isSubmitting && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>

            {/* Data */}
            <Grid size={{ xs: 12, sm: 5 }}>
              <Controller
                name="assign_date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Data"
                    value={toDate(field.value)}
                    onChange={(date) => field.onChange(toStr(date))}
                    disabled={isEditMode}
                    slots={{ openPickerIcon: CalendarIcon }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        onBlur: field.onBlur,
                        error: !!errors.assign_date,
                        helperText: errors.assign_date?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Tipo */}
            <Grid size={{ xs: 12, sm: 7 }}>
              <Controller
                name="tt_inventorytype"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Tipo"
                    fullWidth
                    disabled={isEditMode}
                    error={!!errors.tt_inventorytype}
                    helperText={errors.tt_inventorytype?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CategoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {inventoryTypes.map((t) => (
                      <MenuItem key={t.pk} value={String(t.pk)}>
                        {t.value}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Marca */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="brand"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Marca"
                    fullWidth
                    error={!!errors.brand}
                    helperText={errors.brand?.message}
                  />
                )}
              />
            </Grid>

            {/* Modelo */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="model"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Modelo"
                    fullWidth
                    error={!!errors.model}
                    helperText={errors.model?.message}
                  />
                )}
              />
            </Grid>

            {/* Valor */}
            <Grid size={{ xs: 12, sm: 5 }}>
              <Controller
                name="cost"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Valor (€)"
                    fullWidth
                    type="number"
                    inputProps={{ min: 0, step: '0.01' }}
                    error={!!errors.cost}
                    helperText={errors.cost?.message}
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
                name="assign_who"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Associado"
                    fullWidth
                    disabled={isEditMode}
                    error={!!errors.assign_who}
                    helperText={errors.assign_who?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {whoList.map((w) => (
                      <MenuItem key={w.pk} value={String(w.pk)}>
                        {w.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {isEditMode && (
              <Grid size={12}>
                <Box sx={{
                  p: 1.5, borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.info.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                }}>
                  <Typography variant="caption" color="info.main">
                    Em modo de edição, a data, tipo e associado são imutáveis.
                  </Typography>
                </Box>
              </Grid>
            )}

          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting} startIcon={<InventoryIcon />}>
            {isEditMode ? 'Guardar Alterações' : 'Registar Item'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// ─── DeleteConfirmDialog ──────────────────────────────────────────────────────

const DeleteConfirmDialog = ({ open, onClose, onConfirm, item, isDeleting }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Confirmar Eliminação</DialogTitle>
    <DialogContent>
      <Typography variant="body2">
        Tem a certeza que pretende eliminar o item <strong>{item?.brand} {item?.model}</strong>?
        Esta ação não pode ser revertida.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="inherit" disabled={isDeleting}>Cancelar</Button>
      <Button onClick={onConfirm} color="error" variant="contained" disabled={isDeleting}>
        Eliminar
      </Button>
    </DialogActions>
  </Dialog>
);

// ─── InventoryPage ────────────────────────────────────────────────────────────

const InventoryPage = () => {
  const theme = useTheme();
  const { inventory, isLoading, deleteItem, isDeleting } = useInventory();
  const { data: inventoryTypes = [] } = useInventoryTypes();
  const { data: whoList = [] } = useWhoList();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Lookup maps for display
  const typeMap = useMemo(() =>
    Object.fromEntries(inventoryTypes.map((t) => [t.pk, t.value])),
    [inventoryTypes]
  );

  const whoMap = useMemo(() =>
    Object.fromEntries(whoList.map((w) => [w.pk, w.name])),
    [whoList]
  );

  // Filtered rows
  const rows = useMemo(() => {
    if (!search.trim()) return inventory;
    const q = search.toLowerCase();
    return inventory.filter((item) =>
      [item.brand, item.model, typeMap[item.tt_inventorytype], whoMap[item.assign_who]]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [inventory, search, typeMap, whoMap]);

  const handleEdit = useCallback((item) => {
    setSelectedItem(item);
    setFormOpen(true);
  }, []);

  const handleDeleteClick = useCallback((item) => {
    setItemToDelete(item);
    setDeleteOpen(true);
  }, []);

  const handleDeleteConfirm = async () => {
    try {
      await deleteItem(itemToDelete.pk);
      setDeleteOpen(false);
      setItemToDelete(null);
    } catch {
      // Toast handled in hook
    }
  };

  const columns = [
    {
      field: 'assign_date',
      headerName: 'Data',
      width: 110,
      renderCell: ({ value }) => <Cell><Typography variant="body2">{formatDate(value)}</Typography></Cell>,
    },
    {
      field: 'tt_inventorytype',
      headerName: 'Tipo',
      width: 160,
      renderCell: ({ value }) => (
        <Cell>
          <Chip
            label={typeMap[value] || '—'}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ maxWidth: '100%' }}
          />
        </Cell>
      ),
    },
    {
      field: 'brand',
      headerName: 'Marca',
      flex: 1,
      minWidth: 120,
      renderCell: ({ value }) => <Cell><Typography variant="body2" fontWeight={500}>{value || '—'}</Typography></Cell>,
    },
    {
      field: 'model',
      headerName: 'Modelo',
      flex: 1,
      minWidth: 140,
      renderCell: ({ value }) => <Cell><Typography variant="body2">{value || '—'}</Typography></Cell>,
    },
    {
      field: 'assign_who',
      headerName: 'Associado',
      flex: 1,
      minWidth: 150,
      renderCell: ({ value }) => <Cell><Typography variant="body2">{whoMap[value] || '—'}</Typography></Cell>,
    },
    {
      field: 'cost',
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
      field: 'actions',
      headerName: 'Ações',
      width: 90,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <Cell>
          <Box sx={{ display: 'flex', gap: 0.5, mx: 'auto' }}>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => handleEdit(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton size="small" color="error" onClick={() => handleDeleteClick(row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Cell>
      ),
    },
  ];

  const totalValue = useMemo(() =>
    inventory.reduce((sum, item) => {
      const v = parseFloat(item.cost);
      return sum + (isNaN(v) ? 0 : v);
    }, 0),
    [inventory]
  );

  return (
    <ModulePage
      title="Inventário"
      icon={InventoryIcon}
      color={theme.palette.primary.main}
      breadcrumbs={[
        { label: 'Início', path: '/home' },
        { label: 'Área Interna', path: '/internal' },
        { label: 'Inventário' },
      ]}
      actions={
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setSelectedItem(null); setFormOpen(true); }}
          size="small"
        >
          Novo Item
        </Button>
      }
    >
      {/* Barra de ferramentas */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Pesquisar marca, modelo, tipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280 }}
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
            label={`${inventory.length} item${inventory.length !== 1 ? 's' : ''}`}
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
      <Box sx={{ width: '100%' }}>
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
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              fontWeight: 700,
            },
          }}
          localeText={{
            noRowsLabel: 'Sem itens de inventário',
            footerRowSelected: (count) => `${count} selecionado(s)`,
            MuiTablePagination: {
              labelRowsPerPage: 'Linhas por página:',
              labelDisplayedRows: ({ from, to, count }) =>
                `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`,
            },
          }}
        />
      </Box>

      {/* Form Modal */}
      <InventoryFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setSelectedItem(null); }}
        item={selectedItem}
        inventoryTypes={inventoryTypes}
        whoList={whoList}
      />

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        item={itemToDelete}
        isDeleting={isDeleting}
      />
    </ModulePage>
  );
};

export default InventoryPage;
