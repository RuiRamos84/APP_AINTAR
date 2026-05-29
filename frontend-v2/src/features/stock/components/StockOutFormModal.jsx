import React, { useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Box, Typography,
  IconButton, LinearProgress, MenuItem,
} from '@mui/material';
import {
  Close as CloseIcon,
  IndeterminateCheckBox as StockOutIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import * as z from 'zod';
import { useStockItems } from '../hooks/useStockMeta';
import { useStockOut } from '../hooks/useStockOut';

const schema = z.object({
  tt_stockitem: z.coerce.number().min(1, 'Artigo é obrigatório'),
  date: z.string().min(1, 'Data é obrigatória'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que 0'),
  dest_descr: z.string().optional().nullable(),
});

const defaultValues = { tt_stockitem: '', date: '', quantity: '', dest_descr: '' };

const toDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};
const toStr = (date) => (date instanceof Date && !isNaN(date) ? format(date, 'yyyy-MM-dd') : '');

const StockOutFormModal = ({ open, onClose, entry = null }) => {
  const { items } = useStockItems();
  const { addStockOut, editStockOut, isAdding, isEditing } = useStockOut();
  const isEditMode = !!entry;
  const isSubmitting = isAdding || isEditing;

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (entry && open) {
      reset({
        tt_stockitem: entry.tt_stockitem_pk ?? entry.tt_stockitem ?? '',
        date: entry.date ? toStr(toDate(entry.date)) : '',
        quantity: entry.quantity ?? '',
        dest_descr: entry.dest_descr ?? '',
      });
    } else if (!open) {
      reset(defaultValues);
    }
  }, [entry, open, reset]);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, dest_place: null, dest_type: null };
      if (isEditMode) {
        await editStockOut({ pk: entry.pk, data: payload });
      } else {
        await addStockOut(payload);
      }
      onClose();
    } catch { /* tratado no hook */ }
  };

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StockOutIcon color="error" />
            <Typography variant="h6" fontWeight={700}>
              {isEditMode ? 'Editar Saída' : 'Registar Saída de Stock'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" disabled={isSubmitting}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        {isSubmitting && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} color="error" />}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Controller name="tt_stockitem" control={control} render={({ field }) => (
                <TextField {...field} select label="Artigo" fullWidth required
                  error={!!errors.tt_stockitem} helperText={errors.tt_stockitem?.message}>
                  {items.map(i => (
                    <MenuItem key={i.pk} value={i.pk}>{i.value}</MenuItem>
                  ))}
                </TextField>
              )} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="date" control={control} render={({ field }) => (
                <DatePicker
                  label="Data de Saída"
                  value={toDate(field.value)}
                  onChange={(d) => field.onChange(toStr(d))}
                  slotProps={{
                    textField: {
                      fullWidth: true, required: true,
                      error: !!errors.date, helperText: errors.date?.message,
                    },
                  }}
                />
              )} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="quantity" control={control} render={({ field }) => (
                <TextField {...field} type="number" label="Quantidade" fullWidth required
                  inputProps={{ min: 0.01, step: 0.01 }}
                  error={!!errors.quantity} helperText={errors.quantity?.message} />
              )} />
            </Grid>

            <Grid size={12}>
              <Controller name="dest_descr" control={control} render={({ field }) => (
                <TextField {...field} label="Destino / Observações" fullWidth multiline rows={2}
                  placeholder="Ex: ETAR de Válega — manutenção preventiva"
                  error={!!errors.dest_descr} helperText={errors.dest_descr?.message ?? 'Opcional'} />
              )} />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" variant="contained" color="error" disabled={isSubmitting} startIcon={<StockOutIcon />}>
            {isEditMode ? 'Guardar Alterações' : 'Registar Saída'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StockOutFormModal;
