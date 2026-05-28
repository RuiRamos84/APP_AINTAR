import React, { useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Box, Typography,
  IconButton, LinearProgress, MenuItem,
} from '@mui/material';
import {
  Close as CloseIcon,
  Inventory as StockIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useStockTypes, useUnits } from '../hooks/useStockMeta';
import { useStockItemsCrud } from '../hooks/useStockItemsCrud';

const schema = z.object({
  value: z.string().min(1, 'Nome do artigo é obrigatório'),
  tt_stocktype: z.coerce.number({ required_error: 'Categoria é obrigatória' }).min(1, 'Categoria é obrigatória'),
  tt_unit: z.coerce.number({ required_error: 'Unidade é obrigatória' }).min(1, 'Unidade é obrigatória'),
  threshold: z.coerce.number().min(0, 'Mínimo 0').default(0),
});

const defaultValues = { value: '', tt_stocktype: '', tt_unit: '', threshold: 0 };

const StockItemFormModal = ({ open, onClose, item = null }) => {
  const { types } = useStockTypes();
  const { units } = useUnits();
  const { addItem, editItem, isAdding, isEditing } = useStockItemsCrud();
  const isEditMode = !!item;
  const isSubmitting = isAdding || isEditing;

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (item && open) {
      reset({
        value: item.value || '',
        tt_stocktype: item.tt_stocktype_pk ?? item.tt_stocktype ?? '',
        tt_unit: item.tt_unit_pk ?? item.tt_unit ?? '',
        threshold: item.threshold ?? 0,
      });
    } else if (!open) {
      reset(defaultValues);
    }
  }, [item, open, reset]);

  const onSubmit = async (data) => {
    try {
      if (isEditMode) {
        await editItem({ pk: item.pk, data });
      } else {
        await addItem(data);
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
            <StockIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              {isEditMode ? 'Editar Artigo' : 'Novo Artigo de Stock'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" disabled={isSubmitting}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        {isSubmitting && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Controller name="value" control={control} render={({ field }) => (
                <TextField {...field} label="Nome do Artigo" fullWidth required
                  error={!!errors.value} helperText={errors.value?.message} />
              )} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="tt_stocktype" control={control} render={({ field }) => (
                <TextField {...field} select label="Categoria" fullWidth required
                  error={!!errors.tt_stocktype} helperText={errors.tt_stocktype?.message}>
                  {types.map(t => (
                    <MenuItem key={t.pk} value={t.pk}>{t.value}</MenuItem>
                  ))}
                </TextField>
              )} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="tt_unit" control={control} render={({ field }) => (
                <TextField {...field} select label="Unidade" fullWidth required
                  error={!!errors.tt_unit} helperText={errors.tt_unit?.message}>
                  {units.map(u => (
                    <MenuItem key={u.pk} value={u.pk}>{u.value}</MenuItem>
                  ))}
                </TextField>
              )} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="threshold" control={control} render={({ field }) => (
                <TextField {...field} type="number" label="Stock Mínimo" fullWidth
                  inputProps={{ min: 0 }}
                  error={!!errors.threshold} helperText={errors.threshold?.message ?? 'Alerta quando o stock atingir este valor'} />
              )} />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting} startIcon={<StockIcon />}>
            {isEditMode ? 'Guardar Alterações' : 'Criar Artigo'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StockItemFormModal;
