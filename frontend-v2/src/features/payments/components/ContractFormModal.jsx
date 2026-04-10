import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, MenuItem, Autocomplete, CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/client';
import notification from '@/core/services/notification';

// ─── Zod Schema ──────────────────────────────────────────────────────────────
const contractSchema = z.object({
  ts_entity: z.number({ required_error: 'Cliente é obrigatório' }),
  start_date: z.date().nullable().optional(),
  stop_date: z.date().nullable().optional(),
  family: z.number().nullable().optional(),
  tt_contractfrequency: z.number({ required_error: 'Frequência é obrigatória' }),
  address: z.string().min(1, 'Morada obrigatória'),
  postal: z.string().min(1, 'Cód. Postal obrigatório'),
  door: z.string().optional(),
  floor: z.string().optional(),
  nut1: z.string().optional(),
  nut2: z.string().optional(),
  nut3: z.string().optional(),
  nut4: z.string().optional(),
});

// ─── Modal ───────────────────────────────────────────────────────────────────
export const ContractFormModal = ({ open, onClose, defaultEntity = null }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // Form Setup
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      ts_entity: '',
      start_date: null,
      stop_date: null,
      family: null,
      tt_contractfrequency: '',
      address: '',
      postal: '',
      door: '',
      floor: '',
    }
  });

  // Queries (Frequências e Entidades)
  const { data: frequencies = [] } = useQuery({
    queryKey: ['contract-frequencies'],
    queryFn: () => apiClient.get('/lookup/contract-frequencies').then(r => r.frequencies || []),
  });

  const { data: searchEntities = [], isFetching: isFetchingEntities } = useQuery({
    queryKey: ['entitiesSearch', searchTerm],
    queryFn: () => apiClient.get('/entities', { params: { q: searchTerm, limit: 20 } }).then(r => r.entities || []),
    enabled: true,
  });

  const entities = defaultEntity && !searchTerm 
    ? [defaultEntity, ...searchEntities.filter(e => e.pk !== defaultEntity.pk)]
    : searchEntities;

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      reset({
        ts_entity: defaultEntity ? defaultEntity.pk : '',
        start_date: null,
        stop_date: null,
        family: null,
        tt_contractfrequency: '',
        address: defaultEntity ? defaultEntity.address : '',
        postal: defaultEntity ? defaultEntity.postal : '',
        door: defaultEntity ? defaultEntity.door : '',
        floor: defaultEntity ? defaultEntity.floor : '',
      });
      if (defaultEntity) setSearchTerm('');
    }
  }, [open, defaultEntity, reset]);

  // Mutation
  const createMutation = useMutation({
    mutationFn: (data) => apiClient.post('/clients/contracts', data),
    onSuccess: () => {
      notification.success('Contrato registado com sucesso!');
      queryClient.invalidateQueries(['contracts']);
      onClose();
    },
    onError: (err) => notification.apiError(err, 'Erro ao registar contrato.'),
  });

  const onSubmit = (data) => {
    // format dates if needed
    const payload = { ...data };
    if (payload.start_date) payload.start_date = payload.start_date.toISOString();
    if (payload.stop_date) payload.stop_date = payload.stop_date.toISOString();
    createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Novo Contrato de Cliente</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          
          <Grid item xs={12}>
            <Controller
              name="ts_entity" control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  options={entities}
                  getOptionLabel={(o) => `${o.name || ''} (NIF: ${o.nipc || ''})`}
                  isOptionEqualToValue={(opt, val) => opt.pk === val}
                  value={entities.find(e => e.pk === field.value) || null}
                  onChange={(_, val) => field.onChange(val?.pk || '')}
                  onInputChange={(_, val) => {
                    clearTimeout(window._entTimer);
                    window._entTimer = setTimeout(() => setSearchTerm(val), 400);
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} label="Entidade (Cliente) *" 
                      error={!!errors.ts_entity} helperText={errors.ts_entity?.message}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isFetchingEntities ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name="tt_contractfrequency" control={control}
              render={({ field }) => (
                <TextField
                  {...field} select fullWidth label="Periodicidade *"
                  error={!!errors.tt_contractfrequency} helperText={errors.tt_contractfrequency?.message}
                >
                  {frequencies.map(f => (
                    <MenuItem key={f.pk} value={f.pk}>{f.value}</MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Controller
              name="family" control={control}
              render={({ field }) => (
                <TextField
                  {...field} type="number" fullWidth label="Família / N.º Membros"
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name="start_date" control={control}
              render={({ field }) => (
                <DatePicker
                  label="Data Início"
                  value={field.value} onChange={field.onChange}
                  slotProps={{ textField: { fullWidth: true, size: 'medium' } }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name="stop_date" control={control}
              render={({ field }) => (
                <DatePicker
                  label="Data Término"
                  value={field.value} onChange={field.onChange}
                  slotProps={{ textField: { fullWidth: true, size: 'medium' } }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}><TextField disabled variant="standard" fullWidth defaultValue="Morada do Contrato" size="small" sx={{mt: 1}} /></Grid>

          <Grid item xs={12}>
            <Controller
              name="address" control={control}
              render={({ field }) => (
                <TextField {...field} fullWidth label="Morada *" error={!!errors.address} helperText={errors.address?.message} />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Controller
              name="postal" control={control}
              render={({ field }) => (
                <TextField {...field} fullWidth label="Cód. Postal *" error={!!errors.postal} helperText={errors.postal?.message} />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Controller name="door" control={control} render={({ field }) => <TextField {...field} fullWidth label="N.º / Porta" />} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Controller name="floor" control={control} render={({ field }) => <TextField {...field} fullWidth label="Andar" />} />
          </Grid>

        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={createMutation.isPending}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={createMutation.isPending}>
          Registar Contrato
        </Button>
      </DialogActions>
    </Dialog>
  );
};
