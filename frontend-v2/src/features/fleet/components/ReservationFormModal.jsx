import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Box, Typography,
  IconButton, LinearProgress, MenuItem, Avatar, Chip, InputAdornment,
} from '@mui/material';
import {
  Close as CloseIcon,
  EventAvailable as EventIcon,
  DirectionsCar as CarIcon,
  Person as PersonIcon,
  Place as PlaceIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, alpha } from '@mui/material/styles';
import { parseISO, isValid } from 'date-fns';
import * as z from 'zod';
import { useAuth } from '@/core/contexts/AuthContext';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { useReservations } from '../hooks/useReservations';
import { useVehicles } from '../hooks/useVehicles';
import { useWhoList } from '@/core/hooks/useMetaData';

const toDate = (str) => {
  if (!str) return null;
  const d = typeof str === 'string' ? parseISO(str) : str;
  return isValid(d) ? d : null;
};
const toIso = (date) => (date && isValid(date) ? date.toISOString() : '');

const reservationSchema = z.object({
  tb_vehicle: z.string().min(1, 'Selecione um veículo'),
  ts_client: z.string().min(1, 'Selecione o colaborador'),
  start_time: z.string().min(1, 'Data/hora de início é obrigatória'),
  end_time: z.string().min(1, 'Data/hora de fim é obrigatória'),
  destination: z.string().min(1, 'Destino é obrigatório'),
  memo: z.string().optional(),
}).refine((data) => new Date(data.end_time) > new Date(data.start_time), {
  message: 'A data de fim tem de ser posterior à data de início',
  path: ['end_time'],
});

const defaultValues = {
  tb_vehicle: '',
  ts_client: '',
  start_time: '',
  end_time: '',
  destination: '',
  memo: '',
};

const ReservationFormModal = ({ open, onClose, reservation }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canManageOthers = hasPermission('fleet.reservations.manage');
  const { addReservation, isAdding, editReservation, isEditing } = useReservations();
  const { vehicles } = useVehicles();
  const { data: whoList = [] } = useWhoList();

  const isEditMode = !!reservation;
  const isSaving = isAdding || isEditing;

  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(reservationSchema),
    defaultValues,
  });

  const watchVehicle = watch('tb_vehicle');

  useEffect(() => {
    const v = vehicles.find((v) => String(v.pk) === watchVehicle);
    setSelectedVehicle(v || null);
  }, [watchVehicle, vehicles]);

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      return;
    }
    if (reservation) {
      reset({
        tb_vehicle: String(reservation.tb_vehicle),
        ts_client: String(reservation.ts_client),
        start_time: reservation.start_time,
        end_time: reservation.end_time,
        destination: reservation.destination || '',
        memo: reservation.memo || '',
      });
    } else {
      reset({ ...defaultValues, ts_client: String(user?.user_id ?? '') });
    }
  }, [open, reservation, reset, user]);

  const onSubmit = async (data) => {
    try {
      if (isEditMode) {
        await editReservation({
          id: reservation.pk,
          data: {
            tb_vehicle: parseInt(data.tb_vehicle, 10),
            start_time: data.start_time,
            end_time: data.end_time,
            destination: data.destination,
            memo: data.memo,
          },
        });
      } else {
        await addReservation({
          tb_vehicle: parseInt(data.tb_vehicle, 10),
          ts_client: parseInt(data.ts_client, 10),
          start_time: data.start_time,
          end_time: data.end_time,
          destination: data.destination,
          memo: data.memo,
        });
      }
      onClose();
    } catch {
      // Erros (incluindo conflito de sobreposição 409) tratados pelos toasts no hook
    }
  };

  const title = isEditMode ? 'Editar Reserva de Viatura' : 'Nova Reserva de Viatura';

  return (
    <Dialog
      open={open}
      onClose={isSaving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>{title}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" disabled={isSaving}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        {isSaving && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Grid container spacing={2.5}>

            {selectedVehicle && (
              <Grid size={12}>
                <Box sx={{
                  p: 2, borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    <CarIcon fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Veículo</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedVehicle.brand} {selectedVehicle.model}
                    </Typography>
                  </Box>
                  <Chip label={selectedVehicle.licence} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, letterSpacing: 1 }} />
                </Box>
              </Grid>
            )}

            <Grid size={12}>
              <Controller
                name="tb_vehicle"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Veículo"
                    fullWidth
                    error={!!errors.tb_vehicle}
                    helperText={errors.tb_vehicle?.message || 'Selecione a viatura a reservar'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CarIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {vehicles.map((v) => (
                      <MenuItem key={v.pk} value={String(v.pk)} disabled={Boolean(v.current_assignee)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <CarIcon fontSize="small" color="action" />
                          <span>
                            {v.brand} {v.model}
                            {v.current_assignee ? ` (atribuída a ${v.current_assignee})` : ''}
                          </span>
                          <Chip label={v.licence} size="small" variant="outlined" sx={{ ml: 'auto', fontWeight: 700, fontSize: 11 }} />
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid size={12}>
              <Controller
                name="ts_client"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Colaborador"
                    fullWidth
                    disabled={isEditMode || !canManageOthers}
                    error={!!errors.ts_client}
                    helperText={
                      errors.ts_client?.message ||
                      (isEditMode
                        ? 'O colaborador de uma reserva não pode ser alterado'
                        : canManageOthers
                          ? 'Selecione o colaborador responsável'
                          : 'Reserva em seu nome')
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {whoList.map((c) => (
                      <MenuItem key={c.pk} value={String(c.pk)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'secondary.light' }}>
                            {c.name?.charAt(0)}
                          </Avatar>
                          {c.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="start_time"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    label="Início"
                    value={toDate(field.value)}
                    onChange={(date) => field.onChange(toIso(date))}
                    ampm={false}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        onBlur: field.onBlur,
                        error: !!errors.start_time,
                        helperText: errors.start_time?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="end_time"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    label="Fim previsto"
                    value={toDate(field.value)}
                    onChange={(date) => field.onChange(toIso(date))}
                    ampm={false}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        onBlur: field.onBlur,
                        error: !!errors.end_time,
                        helperText: errors.end_time?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid size={12}>
              <Controller
                name="destination"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Destino / Local da Deslocação"
                    fullWidth
                    error={!!errors.destination}
                    helperText={errors.destination?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PlaceIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid size={12}>
              <Controller
                name="memo"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Observações"
                    fullWidth
                    multiline
                    minRows={2}
                    error={!!errors.memo}
                    helperText={errors.memo?.message}
                  />
                )}
              />
            </Grid>

          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={isSaving} startIcon={<EventIcon />}>
            {isEditMode ? 'Guardar Alterações' : 'Reservar Viatura'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ReservationFormModal;
