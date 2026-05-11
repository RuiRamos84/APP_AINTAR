import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, TextField, MenuItem,
} from '@mui/material';

const EscalaModal = ({ open, onClose, selected, onSave, lookups, isLoading }) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { tb_user_fk: '', data_inicio: '', data_fim: '' }
  });

  useEffect(() => {
    if (open) {
      if (selected) {
        reset({
          tb_user_fk: selected.tb_user_fk || '',
          data_inicio: selected.data_inicio ? selected.data_inicio.split('T')[0] : '',
          data_fim: selected.data_fim ? selected.data_fim.split('T')[0] : '',
        });
      } else {
        reset({ tb_user_fk: '', data_inicio: '', data_fim: '' });
      }
    }
  }, [open, selected, reset]);

  const onSubmit = (data) => {
    onSave({ ...selected, ...data });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{selected ? 'Editar Escala' : 'Nova Escala'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Controller
              name="tb_user_fk" control={control}
              rules={{ required: 'Colaborador obrigatório' }}
              render={({ field }) => (
                <TextField {...field} select label="Colaborador" fullWidth
                  error={!!errors.tb_user_fk} helperText={errors.tb_user_fk?.message}>
                  <MenuItem value=""><em>Selecione...</em></MenuItem>
                  {(lookups?.colaboradores || []).map(c => (
                    <MenuItem key={c.pk} value={c.pk}>{c.name}</MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="data_inicio" control={control}
              rules={{ required: 'Data Início obrigatória' }}
              render={({ field }) => (
                <TextField {...field} type="date" label="Data Início" fullWidth
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.data_inicio} helperText={errors.data_inicio?.message} />
              )}
            />
            <Controller
              name="data_fim" control={control}
              rules={{ 
                required: 'Data Fim obrigatória',
                validate: (val, formValues) => {
                  if (!formValues.data_inicio) return true;
                  const d1 = new Date(formValues.data_inicio);
                  const d2 = new Date(val);
                  if (d2 <= d1) return 'A data de fim tem de ser posterior à data de início';
                  const diffTime = d2 - d1;
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  if (diffDays > 6) return 'A escala não pode ter mais de 7 dias (ex: 27 a 3)';
                  return true;
                }
              }}
              render={({ field }) => (
                <TextField {...field} type="date" label="Data Fim" fullWidth
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.data_fim} helperText={errors.data_fim?.message} />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={isLoading}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'A gravar…' : 'Gravar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EscalaModal;
