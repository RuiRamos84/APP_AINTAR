import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Box, Typography,
  IconButton, LinearProgress, MenuItem, Avatar, Chip, InputAdornment,
} from '@mui/material';
import {
  Close as CloseIcon,
  DriveEta as DriveEtaIcon,
  DirectionsCar as CarIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, alpha } from '@mui/material/styles';
import { parseISO, format, isValid } from 'date-fns';
import * as z from 'zod';
import { useAssignments } from '../hooks/useAssignments';
import { useVehicles } from '../hooks/useVehicles';
import { useWhoList } from '@/core/hooks/useMetaData';

const toDate = (str) => (str ? parseISO(str) : null);
const toStr = (date) => (date && isValid(date) ? format(date, 'yyyy-MM-dd') : '');

const assignmentSchema = z.object({
  tb_vehicle: z.string().min(1, 'Selecione um veículo'),
  ts_client: z.string().min(1, 'Selecione um condutor'),
  data: z.string().min(1, 'Data é obrigatória'),
});

const defaultValues = {
  tb_vehicle: '',
  ts_client: '',
  data: '',
};

const AssignmentFormModal = ({ open, onClose }) => {
  const theme = useTheme();
  const { assignVehicle, isAssigning } = useAssignments();
  const { vehicles } = useVehicles();
  const { data: whoList = [] } = useWhoList();

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedConductor, setSelectedConductor] = useState(null);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues,
  });

  const watchVehicle = watch('tb_vehicle');
  const watchConductor = watch('ts_client');

  useEffect(() => {
    const v = vehicles.find(v => String(v.pk) === watchVehicle);
    setSelectedVehicle(v || null);
  }, [watchVehicle, vehicles]);

  useEffect(() => {
    const c = whoList.find(c => String(c.pk) === watchConductor);
    setSelectedConductor(c || null);
  }, [watchConductor, whoList]);

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      setSelectedVehicle(null);
      setSelectedConductor(null);
    }
  }, [open, reset]);

  const onSubmit = async (data) => {
    try {
      await assignVehicle({
        tb_vehicle: parseInt(data.tb_vehicle, 10),
        ts_client: parseInt(data.ts_client, 10),
        data: data.data,
      });
      onClose();
    } catch {
      // Erros tratados pelos toasts no hook
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isAssigning ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      {/* Cabeçalho */}
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DriveEtaIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Nova Atribuição de Veículo
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" disabled={isAssigning}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        {isAssigning && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Grid container spacing={2.5}>

            {/* Preview da seleção */}
            {(selectedVehicle || selectedConductor) && (
              <Grid size={12}>
                <Box sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                }}>
                  {selectedVehicle && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                  )}
                  {selectedVehicle && selectedConductor && (
                    <CheckIcon sx={{ color: 'success.main', fontSize: 20 }} />
                  )}
                  {selectedConductor && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                        <PersonIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Condutor</Typography>
                        <Typography variant="body2" fontWeight={600}>{selectedConductor.name}</Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Grid>
            )}

            {/* Veículo */}
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
                    helperText={errors.tb_vehicle?.message || 'Selecione o veículo a atribuir'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CarIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {vehicles.map(v => (
                      <MenuItem key={v.pk} value={String(v.pk)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CarIcon fontSize="small" color="action" />
                          <span>{v.brand} {v.model}</span>
                          <Chip label={v.licence} size="small" variant="outlined" sx={{ ml: 'auto', fontWeight: 700, fontSize: 11 }} />
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Condutor */}
            <Grid size={12}>
              <Controller
                name="ts_client"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Condutor"
                    fullWidth
                    error={!!errors.ts_client}
                    helperText={errors.ts_client?.message || 'Selecione o colaborador responsável'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {whoList.map(c => (
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

            {/* Data */}
            <Grid size={12}>
              <Controller
                name="data"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Data de Atribuição"
                    value={toDate(field.value)}
                    onChange={(date) => field.onChange(toStr(date))}
                    slots={{ openPickerIcon: CalendarIcon }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        onBlur: field.onBlur,
                        error: !!errors.data,
                        helperText: errors.data?.message || 'Selecione a data de atribuição',
                      },
                    }}
                  />
                )}
              />
            </Grid>

          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={isAssigning}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isAssigning}
            startIcon={<DriveEtaIcon />}
          >
            Atribuir Veículo
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AssignmentFormModal;
