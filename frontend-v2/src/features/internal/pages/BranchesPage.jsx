import { useState } from 'react';
import {
  Box, Tabs, Tab, Paper, Grid, TextField, Button,
  InputAdornment, LinearProgress, Typography, MenuItem,
} from '@mui/material';
import {
  AccountTree as BranchIcon,
  Send as SendIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useAssociates } from '@/core/hooks/useMetaData';
import ExpensePage from '../components/ExpensePage';
import { useRamalExpenses } from '../hooks/useExpenses';
import {
  createRamalDesobstrucao,
  createRamalReparacao,
} from '../services/internalService';

// ─── Schema ───────────────────────────────────────────────────────────────────

const requestSchema = z.object({
  pnts_associate: z.string().optional(),
  pnmemo: z.string().min(5, 'A descrição deve ter pelo menos 5 caracteres'),
});

const defaultValues = { pnts_associate: '', pnmemo: '' };

// ─── RequestForm ──────────────────────────────────────────────────────────────

const RequestForm = ({ title, submitFn, associates }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues,
  });

  const onSubmit = async ({ pnts_associate, pnmemo }) => {
    setIsSubmitting(true);
    try {
      await submitFn({
        pnts_associate: pnts_associate ? parseInt(pnts_associate, 10) : null,
        pnmemo,
      });
      toast.success('Pedido submetido com sucesso!');
      reset(defaultValues);
    } catch (error) {
      toast.error(`Erro ao submeter pedido: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 640 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
        {title}
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        {isSubmitting && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="pnts_associate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Associado (opcional)"
                  fullWidth
                  disabled={isSubmitting}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                >
                  <MenuItem value="">— Nenhum —</MenuItem>
                  {associates.map((a) => (
                    <MenuItem key={a.pk} value={String(a.pk)}>
                      {a.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>

          <Grid size={12}>
            <Controller
              name="pnmemo"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descrição do Pedido"
                  placeholder="Descreva a intervenção necessária..."
                  multiline
                  rows={4}
                  fullWidth
                  disabled={isSubmitting}
                  error={!!errors.pnmemo}
                  helperText={errors.pnmemo?.message || `${field.value.length} caracteres`}
                />
              )}
            />
          </Grid>

          <Grid size={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              color="inherit"
              onClick={() => reset(defaultValues)}
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
              Submeter Pedido
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

// ─── BranchesPage ─────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Despesas' },
  { label: 'Desobstrução' },
  { label: 'Reparação' },
];

const BranchesPage = () => {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const { data: associates = [] } = useAssociates();
  const color = '#303f9f';

  return (
    <ModulePage
      title="Ramais"
      icon={BranchIcon}
      color={color}
      breadcrumbs={[
        { label: 'Início', path: '/home' },
        { label: 'Área Interna', path: '/internal' },
        { label: 'Ramais' },
      ]}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          {TABS.map((t) => (
            <Tab key={t.label} label={t.label} />
          ))}
        </Tabs>
      </Box>

      {tab === 0 && (
        <ExpensePage useHook={useRamalExpenses} color={color} />
      )}
      {tab === 1 && (
        <RequestForm
          title="Registo de Desobstrução de Ramal"
          submitFn={createRamalDesobstrucao}
          associates={associates}
        />
      )}
      {tab === 2 && (
        <RequestForm
          title="Registo de Reparação de Ramal"
          submitFn={createRamalReparacao}
          associates={associates}
        />
      )}
    </ModulePage>
  );
};

export default BranchesPage;
