import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  NavigateNext as NextIcon,
  LocationOn as LocationIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import AddressForm from '@/shared/components/AddressForm/AddressForm';

const schema = z.object({
  text: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres'),
  address: z.string().min(3, 'A morada é obrigatória'),
  postal: z.string().regex(/^\d{4}-\d{3}$/, 'Código postal inválido (ex: 0000-000)'),
  nut4: z.string().optional(),
  door: z.string().optional(),
  floor: z.string().optional(),
});

const Step2Details = ({ formData, setFormData, onNext, onBack }) => {
  const theme = useTheme();

  const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      text: formData.text || '',
      address: formData.address || '',
      postal: formData.postal || '',
      nut4: formData.nut4 || '',
      door: formData.door || '',
      floor: formData.floor || '',
    },
  });

  const onSubmit = (data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    onNext();
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        Detalhes do Pedido
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Explique o que pretende e indique o local da ocorrência ou instalação.
      </Typography>

      <Stack spacing={4}>
        {/* Descrição */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: 1.5, flexShrink: 0,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <InfoIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={700}>O seu pedido</Typography>
          </Box>
          <Controller
            name="text"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                rows={4}
                placeholder="Descreva detalhadamente a sua solicitação..."
                error={!!errors.text}
                helperText={errors.text?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
            )}
          />
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        {/* Localização */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: 1.5, flexShrink: 0,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LocationIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={700}>Onde se localiza?</Typography>
          </Box>

          <AddressForm
            values={{
              address: watch('address'),
              postal: watch('postal'),
              nut4: watch('nut4'),
              door: watch('door'),
              floor: watch('floor'),
            }}
            onChange={(field, value) => setValue(field, value, { shouldValidate: true })}
            errors={errors}
          />
        </Box>
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 6 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={onBack}
          sx={{ borderRadius: '12px', px: 3 }}
        >
          Anterior
        </Button>
        <Button
          type="submit"
          variant="contained"
          endIcon={<NextIcon />}
          sx={{
            borderRadius: '12px', px: 4,
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
          }}
        >
          Seguinte
        </Button>
      </Box>
    </Box>
  );
};

export default Step2Details;
