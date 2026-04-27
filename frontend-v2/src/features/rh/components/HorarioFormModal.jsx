import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select,
  MenuItem, Stack, Grid,
} from '@mui/material';
import { useColaboradores } from '../hooks/useRhLookups';

const HorarioFormModal = ({ open, onClose, onSave, isSaving, initial, lookups }) => {
  const { colaboradores } = useColaboradores();
  const jornadas = lookups?.tipos_jornada || [];

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      user_fk: '', tt_jornada_fk: 1, descr: '',
      hora_entrada: '08:00', hora_saida: '17:00',
      hora_inicio_almoco: '12:30', hora_fim_almoco: '13:30',
      data_inicio: new Date().toISOString().slice(0, 10),
      data_fim: '',
    },
  });

  const jornada = watch('tt_jornada_fk');

  useEffect(() => {
    if (open && initial) {
      reset({
        user_fk: initial.tb_user_fk,
        tt_jornada_fk: initial.tt_jornada_fk,
        descr: initial.descr,
        hora_entrada: initial.hora_entrada?.slice(0, 5) || '08:00',
        hora_saida: initial.hora_saida?.slice(0, 5) || '17:00',
        hora_inicio_almoco: initial.hora_inicio_almoco?.slice(0, 5) || '',
        hora_fim_almoco: initial.hora_fim_almoco?.slice(0, 5) || '',
        data_inicio: initial.data_inicio?.slice(0, 10) || '',
        data_fim: initial.data_fim?.slice(0, 10) || '',
      });
    } else if (open) {
      reset({
        user_fk: '', tt_jornada_fk: 1, descr: '',
        hora_entrada: '08:00', hora_saida: '17:00',
        hora_inicio_almoco: '12:30', hora_fim_almoco: '13:30',
        data_inicio: new Date().toISOString().slice(0, 10), data_fim: '',
      });
    }
  }, [open, initial, reset]);

  const onSubmit = (data) => {
    const payload = {
      ...data,
      user_fk: Number(data.user_fk),
      tt_jornada_fk: Number(data.tt_jornada_fk),
      dias_semana: [1, 2, 3, 4, 5],
      hora_inicio_almoco: data.tt_jornada_fk == 2 ? null : data.hora_inicio_almoco,
      hora_fim_almoco:    data.tt_jornada_fk == 2 ? null : data.hora_fim_almoco,
      data_fim: data.data_fim || null,
    };
    if (initial) onSave({ pk: initial.pk, data: payload });
    else onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Editar Horário' : 'Novo Horário'}</DialogTitle>
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

            <Controller name="tt_jornada_fk" control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Jornada</InputLabel>
                  <Select {...field} label="Tipo de Jornada">
                    {jornadas.map(j => (
                      <MenuItem key={j.pk} value={j.pk}>{j.descr}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller name="descr" control={control} rules={{ required: true }}
              render={({ field }) => (
                <TextField {...field} label="Descrição *" size="small" fullWidth error={!!errors.descr} />
              )}
            />

            <Grid container spacing={2}>
              <Grid size={6}>
                <Controller name="hora_entrada" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Entrada" type="time"
                      size="small" fullWidth InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
              <Grid size={6}>
                <Controller name="hora_saida" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Saída" type="time"
                      size="small" fullWidth InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
              {jornada == 1 && (
                <>
                  <Grid size={6}>
                    <Controller name="hora_inicio_almoco" control={control}
                      render={({ field }) => (
                        <TextField {...field} label="Início Almoço" type="time"
                          size="small" fullWidth InputLabelProps={{ shrink: true }} />
                      )}
                    />
                  </Grid>
                  <Grid size={6}>
                    <Controller name="hora_fim_almoco" control={control}
                      render={({ field }) => (
                        <TextField {...field} label="Fim Almoço" type="time"
                          size="small" fullWidth InputLabelProps={{ shrink: true }} />
                      )}
                    />
                  </Grid>
                </>
              )}
            </Grid>

            <Grid container spacing={2}>
              <Grid size={6}>
                <Controller name="data_inicio" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Início Vigência" type="date"
                      size="small" fullWidth InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
              <Grid size={6}>
                <Controller name="data_fim" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Fim Vigência (opcional)" type="date"
                      size="small" fullWidth InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
            </Grid>
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

export default HorarioFormModal;
