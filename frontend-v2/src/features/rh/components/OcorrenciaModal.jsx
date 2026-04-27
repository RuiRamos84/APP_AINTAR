import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select,
  MenuItem, Stack,
} from '@mui/material';

const OcorrenciaModal = ({ open, onClose, onSave, isSaving, escalaFk, initial, lookups }) => {
  const tipos = lookups?.tipos_ocorrencia || [];

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { tt_tipo_fk: 1, descr: '', equipas_accionadas: '' },
  });

  useEffect(() => {
    if (open) reset(initial
      ? { tt_tipo_fk: initial.tt_tipo_fk, descr: initial.descr,
          equipas_accionadas: initial.equipas_accionadas || '' }
      : { tt_tipo_fk: 1, descr: '', equipas_accionadas: '' }
    );
  }, [open, initial, reset]);

  const onSubmit = (data) => {
    const payload = {
      ...data,
      tt_tipo_fk: Number(data.tt_tipo_fk),
      tb_piquete_escala_fk: escalaFk,
      equipas_accionadas: data.equipas_accionadas || null,
    };
    if (initial) onSave({ pk: initial.pk, data: payload });
    else onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Editar Ocorrência' : 'Registar Ocorrência de Piquete'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Controller name="tt_tipo_fk" control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Ocorrência</InputLabel>
                  <Select {...field} label="Tipo de Ocorrência">
                    {tipos.map(t => (
                      <MenuItem key={t.pk} value={t.pk}>{t.descr}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller name="descr" control={control} rules={{ required: true }}
              render={({ field }) => (
                <TextField {...field} label="Descrição *" multiline rows={3}
                  size="small" fullWidth error={!!errors.descr} />
              )}
            />

            <Controller name="equipas_accionadas" control={control}
              render={({ field }) => (
                <TextField {...field} label="Equipas Accionadas (opcional)"
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

export default OcorrenciaModal;
