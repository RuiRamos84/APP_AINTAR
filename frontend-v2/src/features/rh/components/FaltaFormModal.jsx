import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select,
  MenuItem, Stack,
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

const FaltaFormModal = ({ open, onClose, onSave, isSaving, initial, lookups }) => {
  const { colaboradores } = useColaboradores();
  const tipos = lookups?.tipos_falta || [];

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      user_fk: '', tt_tipo_falta_fk: 1, data: '', notas: '', comunicado_por: '',
    },
  });

  useEffect(() => {
    if (open) reset(initial
      ? { user_fk: initial.tb_user_fk, tt_tipo_falta_fk: initial.tt_tipo_falta_fk,
          data: toISODate(initial.data), notas: initial.notas || '',
          comunicado_por: initial.comunicado_por || '' }
      : { user_fk: '', tt_tipo_falta_fk: 1, data: '', notas: '', comunicado_por: '' }
    );
  }, [open, initial, reset]);

  const onSubmit = (data) => {
    const payload = {
      ...data,
      user_fk: Number(data.user_fk),
      tt_tipo_falta_fk: Number(data.tt_tipo_falta_fk),
      comunicado_por: data.comunicado_por ? Number(data.comunicado_por) : null,
    };
    if (initial) onSave({ pk: initial.pk, data: payload });
    else onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Editar Falta' : 'Registar Falta'}</DialogTitle>
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

            <Controller name="tt_tipo_falta_fk" control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Falta</InputLabel>
                  <Select {...field} label="Tipo de Falta">
                    {tipos.map(t => (
                      <MenuItem key={t.pk} value={t.pk}>{t.descr}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller name="data" control={control} rules={{ required: true }}
              render={({ field }) => (
                <TextField {...field} label="Data *" type="date"
                  size="small" fullWidth InputLabelProps={{ shrink: true }}
                  error={!!errors.data} />
              )}
            />

            <Controller name="comunicado_por" control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small">
                  <InputLabel>Comunicado por (opcional)</InputLabel>
                  <Select {...field} label="Comunicado por (opcional)">
                    <MenuItem value="">—</MenuItem>
                    {colaboradores.map(c => (
                      <MenuItem key={c.pk} value={c.pk}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

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

export default FaltaFormModal;
