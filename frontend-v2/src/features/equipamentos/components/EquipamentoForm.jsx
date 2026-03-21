import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, CircularProgress,
} from '@mui/material';

const schema = z.object({
  tipoId: z.number({ required_error: 'Tipo obrigatório' }),
  marca: z.string().min(1, 'Marca obrigatória'),
  modelo: z.string().min(1, 'Modelo obrigatório'),
  serial: z.string().optional(),
  fileManual: z.string().optional(),
  fileSpecs: z.string().optional(),
  fileEsquemas: z.string().optional(),
});

export default function EquipamentoForm({ open, onClose, onSubmit, equipamento, tipos = [] }) {
  const isEdit = !!equipamento;

  const {
    control, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tipoId: '',
      marca: '',
      modelo: '',
      serial: '',
      fileManual: '',
      fileSpecs: '',
      fileEsquemas: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        equipamento
          ? {
              tipoId: tipos.find((t) => t.value === equipamento.tipo)?.pk ?? '',
              marca: equipamento.marca ?? '',
              modelo: equipamento.modelo ?? '',
              serial: equipamento.serial ?? '',
              fileManual: equipamento.fileManual ?? '',
              fileSpecs: equipamento.fileSpecs ?? '',
              fileEsquemas: equipamento.fileEsquemas ?? '',
            }
          : {
              tipoId: '',
              marca: '',
              modelo: '',
              serial: '',
              fileManual: '',
              fileSpecs: '',
              fileEsquemas: '',
            }
      );
    }
  }, [open, equipamento, reset]);

  const handleFormSubmit = async (values) => {
    await onSubmit(values);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Editar Equipamento' : 'Novo Equipamento'}</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Tipo */}
            <Grid size={12}>
              <Controller
                name="tipoId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    label="Tipo *"
                    error={!!errors.tipoId}
                    helperText={errors.tipoId?.message}
                    size="small"
                  >
                    {tipos.map((t) => (
                      <MenuItem key={t.pk} value={t.pk}>
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
                name="marca"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Marca *"
                    error={!!errors.marca}
                    helperText={errors.marca?.message}
                    size="small"
                  />
                )}
              />
            </Grid>

            {/* Modelo */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="modelo"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Modelo *"
                    error={!!errors.modelo}
                    helperText={errors.modelo?.message}
                    size="small"
                  />
                )}
              />
            </Grid>

            {/* N.º Série */}
            <Grid size={12}>
              <Controller
                name="serial"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="N.º Série"
                    size="small"
                  />
                )}
              />
            </Grid>

            {/* Ficheiros */}
            <Grid size={12}>
              <Controller
                name="fileManual"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Manual (caminho/URL)"
                    size="small"
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="fileSpecs"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Ficha Técnica"
                    size="small"
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="fileEsquemas"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Esquemas"
                    size="small"
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting && <CircularProgress size={16} />}
          >
            {isEdit ? 'Guardar' : 'Criar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
