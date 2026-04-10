import { useState } from 'react';
import {
  Box, Button, TextField, Typography, Paper,
  LinearProgress, Alert,
} from '@mui/material';
import {
  Description as RequestIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import notification from '@/core/services/notification';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { createRequisicaoInterna } from '../services/internalService';

const schema = z.object({
  memo: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres'),
});

const RequisicaoInternaPage = () => {
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSuccess, setLastSuccess] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { memo: '' },
  });

  const onSubmit = async ({ memo }) => {
    setIsSubmitting(true);
    setLastSuccess(false);
    try {
      await createRequisicaoInterna(memo);
      notification.success('Requisição interna criada com sucesso!');
      reset();
      setLastSuccess(true);
    } catch (error) {
      notification.error(`Erro ao criar requisição: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModulePage
      title="Requisição Interna"
      icon={RequestIcon}
      color={theme.palette.error.main}
      breadcrumbs={[
        { label: 'Início', path: '/home' },
        { label: 'Área Interna', path: '/internal' },
        { label: 'Requisição Interna' },
      ]}
    >
      <Box sx={{ maxWidth: 640 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Utilize este formulário para criar um pedido de requisição interna de materiais ou serviços.
          Descreva detalhadamente o que necessita.
        </Typography>

        {lastSuccess && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setLastSuccess(false)}>
            Requisição submetida com sucesso. Será processada pelo departamento responsável.
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {isSubmitting && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            <Controller
              name="memo"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descrição da Requisição"
                  placeholder="Descreva o material ou serviço que necessita, quantidade, urgência e qualquer informação relevante..."
                  multiline
                  rows={6}
                  fullWidth
                  error={!!errors.memo}
                  helperText={errors.memo?.message || `${field.value.length} caracteres`}
                  disabled={isSubmitting}
                  sx={{ mb: 3 }}
                />
              )}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                color="inherit"
                onClick={() => { reset(); setLastSuccess(false); }}
                disabled={isSubmitting}
              >
                Limpar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={<SendIcon />}
              >
                Submeter Requisição
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </ModulePage>
  );
};

export default RequisicaoInternaPage;
