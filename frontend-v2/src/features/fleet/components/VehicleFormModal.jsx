import React, { useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Box, Typography,
  IconButton, Divider, LinearProgress, Chip, InputAdornment,
} from '@mui/material';
import {
  Close as CloseIcon,
  DirectionsCar as CarIcon,
  Badge as BadgeIcon,
  CalendarMonth as CalendarIcon,
  LocalShipping as DeliveryIcon,
  VerifiedUser as InsuranceIcon,
  Build as InspectionIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, alpha } from '@mui/material/styles';
import { format } from 'date-fns';
import * as z from 'zod';
import { useVehicles } from '../hooks/useVehicles';

const LICENCE_REGEX = /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/;

// Formata automaticamente enquanto se digita: "AA87BS" → "AA-87-BS"
const formatLicence = (value) => {
  const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4)}`;
};

const vehicleSchema = z.object({
  licence: z.string()
    .min(1, 'Matrícula é obrigatória')
    .regex(LICENCE_REGEX, 'Formato inválido — use XX-XX-XX (ex: AA-87-BS)'),
  brand: z.string().min(1, 'Marca é obrigatória'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  delivery: z.string().min(1, 'Data de entrega é obrigatória'),
  inspection_date: z.string().min(1, 'Data de inspeção é obrigatória'),
  insurance_date: z.string().min(1, 'Data de seguro é obrigatória'),
});

const defaultValues = {
  brand: '',
  model: '',
  licence: '',
  delivery: '',
  inspection_date: '',
  insurance_date: '',
};

const SectionHeader = ({ icon: Icon, title }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 0.5 }}>
    <Icon color="primary" sx={{ mr: 1, fontSize: 20 }} />
    <Typography variant="subtitle2" fontWeight={700} color="primary">
      {title}
    </Typography>
  </Box>
);

// Parser robusto — aceita "yyyy-MM-dd", "yyyy-MM-ddTHH:mm:ss", "yyyy-MM-dd HH:mm:ss"
const toDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') || str.includes(' ') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};
// Converte Date para string yyyy-MM-dd
const toStr = (date) => (date instanceof Date && !isNaN(date.getTime()) ? format(date, 'yyyy-MM-dd') : '');

const VehicleFormModal = ({ open, onClose, vehicle = null }) => {
  const theme = useTheme();
  const { addVehicle, editVehicle, isAdding, isEditing } = useVehicles();
  const isEditMode = !!vehicle;
  const isSubmitting = isAdding || isEditing;

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues,
  });

  useEffect(() => {
    if (vehicle && open) {
      reset({
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        licence: vehicle.licence || '',
        delivery: toStr(toDate(vehicle.delivery)),
        inspection_date: toStr(toDate(vehicle.inspection_date)),
        insurance_date: toStr(toDate(vehicle.insurance_date)),
      });
    } else if (!open) {
      reset(defaultValues);
    }
  }, [vehicle, open, reset]);

  const onSubmit = async (data) => {
    try {
      if (isEditMode) {
        await editVehicle({ id: vehicle.pk, data });
      } else {
        await addVehicle(data);
      }
      onClose();
    } catch {
      // Erros tratados pelos toasts no hook
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      {/* Cabeçalho */}
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CarIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              {isEditMode ? 'Editar Veículo' : 'Registar Novo Veículo'}
            </Typography>
            {isEditMode && vehicle?.licence && (
              <Chip
                label={vehicle.licence}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            )}
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

            {/* Secção: Identificação */}
            <Grid size={12}>
              <SectionHeader icon={BadgeIcon} title="Identificação do Veículo" />
            </Grid>

            {/* Matrícula — campo único e identificador principal */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name="licence"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    onChange={(e) => field.onChange(formatLicence(e.target.value))}
                    label="Matrícula"
                    placeholder="AA-00-AA"
                    fullWidth
                    disabled={isEditMode}
                    error={!!errors.licence}
                    helperText={errors.licence?.message}
                    inputProps={{
                      maxLength: 8,
                      style: { textTransform: 'uppercase', letterSpacing: 3, fontWeight: 700, textAlign: 'center' },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name="brand"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Marca"
                    fullWidth
                    disabled={isEditMode}
                    error={!!errors.brand}
                    helperText={errors.brand?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CarIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name="model"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Modelo"
                    fullWidth
                    disabled={isEditMode}
                    error={!!errors.model}
                    helperText={errors.model?.message}
                  />
                )}
              />
            </Grid>

            {/* Separador */}
            <Grid size={12}>
              <Divider sx={{ my: 0.5 }} />
            </Grid>

            {/* Secção: Datas */}
            <Grid size={12}>
              <SectionHeader icon={CalendarIcon} title="Datas Relevantes" />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name="delivery"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Data de Entrega"
                    value={toDate(field.value)}
                    onChange={(date) => field.onChange(toStr(date))}
                    disabled={isEditMode}
                    slots={{ openPickerIcon: DeliveryIcon }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        onBlur: field.onBlur,
                        error: !!errors.delivery,
                        helperText: errors.delivery?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name="inspection_date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Data de Inspeção"
                    value={toDate(field.value)}
                    onChange={(date) => field.onChange(toStr(date))}
                    disabled={isEditMode}
                    slots={{ openPickerIcon: InspectionIcon }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        onBlur: field.onBlur,
                        error: !!errors.inspection_date,
                        helperText: errors.inspection_date?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name="insurance_date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Data de Seguro"
                    value={toDate(field.value)}
                    onChange={(date) => field.onChange(toStr(date))}
                    slots={{ openPickerIcon: InsuranceIcon }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        onBlur: field.onBlur,
                        error: !!errors.insurance_date,
                        helperText: errors.insurance_date?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Aviso modo edição */}
            {isEditMode && (
              <Grid size={12}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.info.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                }}>
                  <Typography variant="caption" color="info.main">
                    Em modo de edição apenas a data de seguro pode ser alterada. Os restantes campos são imutáveis.
                  </Typography>
                </Box>
              </Grid>
            )}

          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={<CarIcon />}
          >
            {isEditMode ? 'Guardar Alterações' : 'Registar Veículo'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default VehicleFormModal;
