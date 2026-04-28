import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select,
  MenuItem, Stack, Grid,
} from '@mui/material';
import { useColaboradores } from '../hooks/useRhLookups';

const toISODate = (v) => {
  if (!v) return '';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const FeriasFormModal = ({ open, onClose, onSave, isSaving, initial, lookups }) => {
  const { colaboradores } = useColaboradores();
  const tipos = lookups?.tipos_ferias || [];

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      user_fk: '', tt_tipo_fk: 1,
      data_inicio: '', data_fim: '', notas: '',
    },
  });

  useEffect(() => {
    if (open) reset(initial
      ? { user_fk: initial.tb_user_fk, tt_tipo_fk: initial.tt_tipo_fk,
          data_inicio: toISODate(initial.data_inicio),
          data_fim: toISODate(initial.data_fim),
          notas: initial.notas || '' }
      : { user_fk: '', tt_tipo_fk: 1, data_inicio: '', data_fim: '', notas: '' }
    );
  }, [open, initial, reset]);

  const onSubmit = (data) => {
    const payload = { ...data, user_fk: Number(data.user_fk), tt_tipo_fk: Number(data.tt_tipo_fk) };
    if (initial) onSave({ pk: initial.pk, data: payload });
    else onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Editar Pedido de Férias' : 'Novo Pedido de Férias'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {!initial && (
              <Controller name="user_fk" control={control} rules={{ required: true }}
                render={({ field }) => (
                  <FormControl fullWidth size="small" error={!!errors.user_fk}>
                    <InputLabel>Colaborador *</InputLabel>
                    <Select {...field} label="Colaborador *">
                      {colaboradores.map(c => (
                        <MenuItem key={c.pk} value={c.pk}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            )}

            <Controller name="tt_tipo_fk" control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo</InputLabel>
                  <Select {...field} label="Tipo">
                    {tipos.map(t => (
                      <MenuItem key={t.pk} value={t.pk}>{t.descr}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Grid container spacing={2}>
              <Grid size={6}>
                <Controller name="data_inicio" control={control} rules={{ required: true }}
                  render={({ field }) => (
                    <TextField {...field} label="Data Início *" type="date"
                      size="small" fullWidth InputLabelProps={{ shrink: true }}
                      error={!!errors.data_inicio} />
                  )}
                />
              </Grid>
              <Grid size={6}>
                <Controller name="data_fim" control={control} rules={{ required: true }}
                  render={({ field }) => (
                    <TextField {...field} label="Data Fim *" type="date"
                      size="small" fullWidth InputLabelProps={{ shrink: true }}
                      error={!!errors.data_fim} />
                  )}
                />
              </Grid>
            </Grid>

            <Controller name="notas" control={control}
              render={({ field }) => (
                <TextField {...field} label="Notas" multiline rows={2}
                  size="small" fullWidth />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSaving}>
            {isSaving ? 'A guardar…' : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FeriasFormModal;
