import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Divider,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  NavigateNext as NextIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMetaData } from '@/core/hooks/useMetaData';
import EntitySearchField from '@/features/entities/components/fields/EntitySearchField';

const buildSchema = (onBehalf) =>
  z.object({
    associate: z.string().min(1, 'Selecione um associado'),
    text: z.string().optional(),
    representativeNipc: onBehalf
      ? z.string().min(9, 'NIF/NIPC inválido')
      : z.string().optional(),
  });

const SectionHeader = ({ icon: Icon, label }) => {
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
      <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
    </Box>
  );
};

const Step2Identity = ({ formData, setFormData, onNext, onBack }) => {
  const theme = useTheme();
  const { data: metaData, isLoading: metaLoading } = useMetaData();
  const [onBehalf, setOnBehalf] = useState(formData.onBehalf || false);
  const [entityFound, setEntityFound] = useState(formData.representativeEntity || null);
  const [searchStatus, setSearchStatus] = useState(null);

  const schema = buildSchema(onBehalf);

  const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      associate: formData.associate ? String(formData.associate) : '',
      text: formData.text || '',
      representativeNipc: formData.representativeNipc || '',
    },
  });

  const associates = metaData?.associates || [];

  const onSubmit = (data) => {
    if (onBehalf && searchStatus !== 'success') return;

    setFormData((prev) => ({
      ...prev,
      associate: data.associate,
      text: data.text || '',
      onBehalf,
      representativeNipc: onBehalf ? data.representativeNipc : '',
      representativeEntity: onBehalf ? entityFound : null,
    }));
    onNext();
  };

  const handleToggleBehalf = (e) => {
    const checked = e.target.checked;
    setOnBehalf(checked);
    if (!checked) {
      setEntityFound(null);
      setSearchStatus(null);
      setValue('representativeNipc', '');
    }
  };

  if (metaLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        Identificação e Detalhes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Indique quem é o requerente e forneça uma descrição opcional do pedido.
      </Typography>

      <Stack spacing={4}>
        {/* Associate */}
        <Box>
          <SectionHeader icon={PeopleIcon} label="Associado" />
          <Controller
            name="associate"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                fullWidth
                label="Associado *"
                error={!!errors.associate}
                helperText={errors.associate?.message}
              >
                {associates.map((a) => (
                  <MenuItem key={a.pk} value={String(a.pk)}>
                    {a.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        {/* Em nome de outra pessoa */}
        <Box>
          <SectionHeader icon={PersonIcon} label="Requerente" />
          <FormControlLabel
            control={
              <Switch
                checked={onBehalf}
                onChange={handleToggleBehalf}
                color="primary"
              />
            }
            label="Submeter em nome de outra pessoa"
            sx={{ mb: onBehalf ? 2 : 0 }}
          />

          {onBehalf && (
            <Box>
              <Controller
                name="representativeNipc"
                control={control}
                render={({ field }) => (
                  <EntitySearchField
                    value={field.value}
                    onChange={field.onChange}
                    onEntityFound={(entity) => setEntityFound(entity)}
                    onSearchStatusChange={(status) => setSearchStatus(status)}
                    label="NIF / NIPC da Entidade Requerente"
                    required
                    error={!!errors.representativeNipc || searchStatus === 'not_found'}
                    helperText={
                      errors.representativeNipc?.message ||
                      (searchStatus === 'not_found'
                        ? 'Entidade não encontrada. Para pedidos em nome de terceiros, a entidade deve estar previamente registada.'
                        : undefined)
                    }
                  />
                )}
              />
              {searchStatus === 'not_found' && (
                <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>
                  Esta entidade não está registada no sistema. Para submeter um pedido em nome desta pessoa, dirija-se às nossas instalações ou contacte-nos por outro meio.
                </Alert>
              )}
              {entityFound && searchStatus === 'success' && (
                <Alert severity="success" sx={{ mt: 1.5, borderRadius: 2 }}>
                  Entidade encontrada: <strong>{entityFound.name}</strong>
                </Alert>
              )}
            </Box>
          )}
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        {/* Descrição */}
        <Box>
          <SectionHeader icon={InfoIcon} label="Descrição do pedido (opcional)" />
          <Controller
            name="text"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                rows={4}
                placeholder="Descreva a sua solicitação com mais detalhe (opcional)..."
                error={!!errors.text}
                helperText={errors.text?.message}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
            )}
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
          disabled={onBehalf && searchStatus !== 'success'}
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

export default Step2Identity;
