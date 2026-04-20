import { useState } from 'react';
import {
  Box, Button, TextField, Typography, Paper,
  LinearProgress, Alert, Autocomplete,
} from '@mui/material';
import {
  Description as RequestIcon,
  Send as SendIcon,
  LinkOff as NoInstIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import notification from '@/core/services/notification';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useETARList, useEEList } from '@/core/hooks/useMetaData';
import { createRequisicaoInterna } from '../services/internalService';

const schema = z.object({
  memo: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres'),
});

const RequisicaoInternaPage = () => {
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSuccess, setLastSuccess] = useState(null); // { id, regnumber? }
  const [selectedInstalacao, setSelectedInstalacao] = useState(null);

  const { data: etarList = [] } = useETARList();
  const { data: eeList = [] } = useEEList();

  // Combine ETAR + EE into a single list with group label
  const instalacaoOptions = [
    ...etarList.map((e) => ({ ...e, grupo: 'ETAR' })),
    ...eeList.map((e) => ({ ...e, grupo: 'Estação Elevatória' })),
  ];

  const { control, handleSubmit, reset, formState: { errors }, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { memo: '' },
  });
  const memoValue = watch('memo');

  const onSubmit = async ({ memo }) => {
    setIsSubmitting(true);
    setLastSuccess(null);
    try {
      const res = await createRequisicaoInterna(memo, selectedInstalacao?.pk ?? null);
      notification.success('Requisição de material criada com sucesso!');
      reset();
      setSelectedInstalacao(null);
      setLastSuccess({ id: res?.document_id });
    } catch (error) {
      notification.error(`Erro ao criar requisição: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModulePage
      title="Requisição de Material"
      icon={RequestIcon}
      color={theme.palette.error.main}
      breadcrumbs={[
        { label: 'Área Interna', path: '/internal' },
        { label: 'Requisição de Material' },
      ]}
    >
      <Box sx={{ maxWidth: 640 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Crie um pedido de requisição de material ou serviço. Se o pedido estiver relacionado
          com uma instalação específica (ETAR ou EE), pode associá-la opcionalmente.
        </Typography>

        {lastSuccess && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setLastSuccess(null)}>
            Requisição submetida com sucesso
            {lastSuccess.id ? ` (ID: ${lastSuccess.id})` : ''}.
            Será processada pelo departamento responsável.
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {isSubmitting && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            {/* Instalação associada — opcional */}
            <Autocomplete
              options={instalacaoOptions}
              groupBy={(opt) => opt.grupo}
              getOptionLabel={(opt) => opt.nome || `Instalação ${opt.pk}`}
              value={selectedInstalacao}
              onChange={(_, newVal) => setSelectedInstalacao(newVal)}
              isOptionEqualToValue={(a, b) => a.pk === b.pk}
              disabled={isSubmitting}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Instalação associada"
                  placeholder="Pesquise ETAR ou EE..."
                  helperText="Opcional — associe se o pedido for relativo a uma instalação específica"
                  size="small"
                />
              )}
              clearIcon={<NoInstIcon fontSize="small" />}
              sx={{ mb: 3 }}
            />

            {/* Descrição */}
            <Controller
              name="memo"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descrição da Requisição *"
                  placeholder="Descreva o material ou serviço necessário, quantidade, urgência e qualquer informação relevante..."
                  multiline
                  rows={6}
                  fullWidth
                  error={!!errors.memo}
                  helperText={errors.memo?.message || `${memoValue.length} caracteres`}
                  disabled={isSubmitting}
                  sx={{ mb: 3 }}
                />
              )}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                color="inherit"
                onClick={() => { reset(); setSelectedInstalacao(null); setLastSuccess(null); }}
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
