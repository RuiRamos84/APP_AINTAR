import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Box, Typography,
  IconButton, LinearProgress, MenuItem, Divider,
  InputAdornment, Avatar, Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Build as BuildIcon,
  DirectionsCar as CarIcon,
  EuroSymbol as EuroIcon,
  CalendarMonth as CalendarIcon,
  Settings as SettingsIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, alpha } from '@mui/material/styles';
import { parseISO, format, isValid } from 'date-fns';
import * as z from 'zod';
import { useMaintenances } from '../hooks/useMaintenances';
import { useVehicles } from '../hooks/useVehicles';
import { useMetaData } from '@/core/hooks/useMetaData';

const toDate = (str) => (str ? parseISO(str) : null);
const toStr = (date) => (date && isValid(date) ? format(date, 'yyyy-MM-dd') : '');

const maintenanceSchema = z.object({
  tb_vehicle: z.string().min(1, 'Selecione um veículo'),
  tt_maintenancetype: z.string().min(1, 'Selecione o tipo de manutenção'),
  data: z.string().min(1, 'Data é obrigatória'),
  price: z.string().min(1, 'Preço é obrigatório'),
  memo: z.string().optional(),
});

const defaultValues = {
  tb_vehicle: '',
  tt_maintenancetype: '',
  data: '',
  price: '',
  memo: '',
};

const SectionHeader = ({ icon: Icon, title }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 0.5 }}>
    <Icon color="primary" sx={{ mr: 1, fontSize: 20 }} />
    <Typography variant="subtitle2" fontWeight={700} color="primary">
      {title}
    </Typography>
  </Box>
);

const MaintenanceFormModal = ({ open, onClose }) => {
  const theme = useTheme();
  const { addMaintenance, isAdding } = useMaintenances();
  const { vehicles } = useVehicles();
  const { data: metaData } = useMetaData();
  const maintenanceTypes = metaData?.maintenancetype || [];

  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(maintenanceSchema),
    defaultValues,
  });

  const watchVehicle = watch('tb_vehicle');

  useEffect(() => {
    const v = vehicles.find(v => String(v.pk) === watchVehicle);
    setSelectedVehicle(v || null);
  }, [watchVehicle, vehicles]);

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      setSelectedVehicle(null);
    }
  }, [open, reset]);

  const onSubmit = async (data) => {
    try {
      await addMaintenance({
        tb_vehicle: parseInt(data.tb_vehicle, 10),
        tt_maintenancetype: data.tt_maintenancetype,
        data: data.data,
        price: parseInt(data.price, 10),
        memo: data.memo || null,
      });
      onClose();
    } catch {
      // Erros tratados pelos toasts no hook
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isAdding ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      {/* Cabeçalho */}
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BuildIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Novo Registo de Manutenção
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" disabled={isAdding}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        {isAdding && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>

            {/* Secção: Veículo */}
            <Grid size={12}>
              <SectionHeader icon={CarIcon} title="Veículo" />
            </Grid>

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
                    helperText={errors.tb_vehicle?.message}
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

            {/* Preview do veículo selecionado */}
            {selectedVehicle && (
              <Grid size={12}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                    <CarIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedVehicle.brand} {selectedVehicle.model}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Entregue em {selectedVehicle.delivery
                        ? new Date(selectedVehicle.delivery).toLocaleDateString('pt-PT')
                        : '—'}
                    </Typography>
                  </Box>
                  <Chip
                    label={selectedVehicle.licence}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 700, letterSpacing: 1 }}
                  />
                </Box>
              </Grid>
            )}

            {/* Separador */}
            <Grid size={12}>
              <Divider sx={{ my: 0.5 }} />
            </Grid>

            {/* Secção: Intervenção */}
            <Grid size={12}>
              <SectionHeader icon={SettingsIcon} title="Detalhe da Intervenção" />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="tt_maintenancetype"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Tipo de Manutenção"
                    fullWidth
                    error={!!errors.tt_maintenancetype}
                    helperText={errors.tt_maintenancetype?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BuildIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {maintenanceTypes.map(t => (
                      <MenuItem key={t.pk} value={String(t.pk)}>
                        {t.value}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller
                name="data"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Data"
                    value={toDate(field.value)}
                    onChange={(date) => field.onChange(toStr(date))}
                    slots={{ openPickerIcon: CalendarIcon }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        onBlur: field.onBlur,
                        error: !!errors.data,
                        helperText: errors.data?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 3 }}>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Preço"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0 }}
                    error={!!errors.price}
                    helperText={errors.price?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EuroIcon fontSize="small" sx={{ color: 'text.secondary' }} />
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
                    label="Descrição da Intervenção"
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Descreva o trabalho realizado, peças substituídas, observações..."
                    error={!!errors.memo}
                    helperText={errors.memo?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                          <NotesIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={isAdding}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isAdding}
            startIcon={<BuildIcon />}
          >
            Registar Manutenção
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MaintenanceFormModal;
