import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
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
  Map as MapIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import AddressForm from '@/shared/components/AddressForm/AddressForm';
import LocationPickerMap from '@/features/documents/components/forms/LocationPickerMap';

const schema = z.object({
  address: z.string().min(3, 'A morada é obrigatória'),
  postal: z.string().regex(/^\d{4}-\d{3}$/, 'Código postal inválido (ex: 0000-000)'),
  door: z.string().optional(),
  floor: z.string().optional(),
  nut1: z.string().optional(),
  nut2: z.string().optional(),
  nut3: z.string().optional(),
  nut4: z.string().optional(),
  glat: z.string().optional(),
  glong: z.string().optional(),
});

const SectionHeader = ({ icon: Icon, label, subtitle }) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: 1.5, flexShrink: 0,
        bgcolor: alpha(theme.palette.primary.main, 0.1),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon sx={{ fontSize: 16, color: 'primary.main' }} />
      </Box>
      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>{label}</Typography>
        {subtitle && (
          <Typography variant="caption" color="text.disabled">{subtitle}</Typography>
        )}
      </Box>
    </Box>
  );
};

const Step3Location = ({ formData, setFormData, entityData, onNext, onBack }) => {
  const theme = useTheme();

  const { handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      address: formData.address || '',
      postal: formData.postal || '',
      door: formData.door || '',
      floor: formData.floor || '',
      nut1: formData.nut1 || '',
      nut2: formData.nut2 || '',
      nut3: formData.nut3 || '',
      nut4: formData.nut4 || '',
      glat: formData.glat || '',
      glong: formData.glong || '',
    },
  });

  // Pre-fill from user's entity if form is empty and entity data is available
  useEffect(() => {
    if (entityData && !formData.address && !formData.postal) {
      reset({
        address: entityData.address || '',
        postal: entityData.postal || '',
        door: entityData.door || '',
        floor: entityData.floor || '',
        nut1: entityData.nut1 || '',
        nut2: entityData.nut2 || '',
        nut3: entityData.nut3 || '',
        nut4: entityData.nut4 || '',
        glat: '',
        glong: '',
      });
    }
  }, [entityData]);

  const values = watch();

  const onSubmit = (data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    onNext();
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        Localização
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Indique o local da ocorrência ou instalação.
      </Typography>

      <Stack spacing={4}>
        {/* Address */}
        <Box>
          <SectionHeader
            icon={LocationIcon}
            label="Morada"
            subtitle="Pré-preenchida com os dados da sua entidade"
          />
          <AddressForm
            values={values}
            onChange={(field, value) => setValue(field, value, { shouldValidate: true })}
            errors={errors}
          />
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        {/* Map */}
        <Box>
          <SectionHeader
            icon={MapIcon}
            label="Coordenadas GPS (opcional)"
            subtitle="Clique no mapa para marcar a localização exata"
          />
          <LocationPickerMap
            lat={values.glat ? parseFloat(values.glat) : null}
            lng={values.glong ? parseFloat(values.glong) : null}
            onLocationSelect={(lat, lng) => {
              setValue('glat', String(lat));
              setValue('glong', String(lng));
            }}
            height={300}
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

export default Step3Location;
