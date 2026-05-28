import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  Autocomplete,
  Grid,
  MenuItem,
  Divider,
  Chip,
} from '@mui/material';
import {
  Description as RequestIcon,
  Send as SendIcon,
  LocationOn as LocationIcon,
  AccountTree as TypeIcon,
  Place as PlaceIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import notification from '@/core/services/notification';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useInstalacaoList } from '@/core/hooks/useMetaData';
import { createRequisicaoInterna } from '../services/internalService';

const schema = z.object({
  memo: z.string().min(1, 'A descrição é obrigatória'),
});

const RequisicaoInternaPage = () => {
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSuccess, setLastSuccess] = useState(null);

  const [filterAssociado, setFilterAssociado] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [selectedInstalacao, setSelectedInstalacao] = useState(null);

  const { data: instalacaoList = [] } = useInstalacaoList();

  // 1º nível: associados únicos (campo ts_entity)
  const associadoOptions = useMemo(() => {
    const unique = [...new Set(instalacaoList.map((e) => e.ts_entity).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' }));
  }, [instalacaoList]);

  // 2º nível: tipos presentes no associado escolhido (valores reais do campo tipo)
  const tipoOptions = useMemo(() => {
    if (!filterAssociado) return [];
    const base = instalacaoList.filter((e) => e.ts_entity === filterAssociado);
    const unique = [...new Set(base.map((e) => e.tipo).filter(Boolean))];
    return unique.sort();
  }, [instalacaoList, filterAssociado]);

  // 3º nível: só mostra instalações quando ambos os filtros estão activos
  const instalacaoOptions = useMemo(() => {
    if (!filterAssociado || !filterTipo) return [];
    return instalacaoList.filter(
      (e) => e.ts_entity === filterAssociado && e.tipo === filterTipo,
    );
  }, [instalacaoList, filterAssociado, filterTipo]);

  const handleAssociadoChange = (val) => {
    setFilterAssociado(val);
    setFilterTipo('');
    setSelectedInstalacao(null);
  };

  const handleTipoChange = (val) => {
    setFilterTipo(val);
    setSelectedInstalacao(null);
  };

  const { control, handleSubmit, reset, formState: { errors }, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { memo: '' },
  });
  const memoValue = watch('memo');

  const handleClear = () => {
    reset();
    setFilterAssociado('');
    setFilterTipo('');
    setSelectedInstalacao(null);
    setLastSuccess(null);
  };

  const onSubmit = async ({ memo }) => {
    setIsSubmitting(true);
    setLastSuccess(null);
    try {
      const res = await createRequisicaoInterna(memo, selectedInstalacao?.pk ?? null);
      notification.success('Requisição de material criada com sucesso!');
      handleClear();
      setLastSuccess({ id: res?.document_id });
    } catch (error) {
      notification.error(`Erro ao criar requisição: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const instalacaoHelperText = !filterAssociado
    ? 'Seleccione primeiro o associado'
    : !filterTipo
      ? 'Seleccione o tipo de instalação'
      : instalacaoOptions.length === 0
        ? 'Nenhuma instalação encontrada'
        : instalacaoOptions.length === 1
          ? '1 instalação disponível'
          : `${instalacaoOptions.length} instalações disponíveis`;

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
      <Box sx={{ maxWidth: 680 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Crie um pedido de requisição de material ou serviço. Se o pedido estiver relacionado
          com uma instalação específica, utilize os filtros para a localizar rapidamente.
        </Typography>

        {lastSuccess && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setLastSuccess(null)}>
            Requisição submetida com sucesso
            {lastSuccess.id ? ` (ID: ${lastSuccess.id})` : ''}.
            Será processada pelo departamento responsável.
          </Alert>
        )}

        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {isSubmitting && <LinearProgress />}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* SECÇÃO: INSTALAÇÃO */}
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <LocationIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" fontWeight={600}>
                  Instalação associada
                </Typography>
                <Chip label="opcional" size="small" sx={{ fontSize: '0.7rem', height: 18 }} />
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Filtre por associado e tipo para reduzir a lista de instalações.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Associado"
                    size="small"
                    fullWidth
                    value={filterAssociado}
                    onChange={(e) => handleAssociadoChange(e.target.value)}
                    disabled={isSubmitting}
                    InputProps={{
                      startAdornment: <PlaceIcon fontSize="small" color="action" sx={{ mr: 1 }} />,
                    }}
                  >
                    <MenuItem value="">
                      <em>Todos os associados</em>
                    </MenuItem>
                    {associadoOptions.map((a) => (
                      <MenuItem key={a} value={a}>
                        {a}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Tipo de instalação"
                    size="small"
                    fullWidth
                    value={filterTipo}
                    onChange={(e) => handleTipoChange(e.target.value)}
                    disabled={isSubmitting || !filterAssociado}
                    InputProps={{
                      startAdornment: <TypeIcon fontSize="small" color="action" sx={{ mr: 1 }} />,
                    }}
                  >
                    <MenuItem value="">
                      <em>{filterAssociado ? 'Todos os tipos' : 'Seleccione o associado primeiro'}</em>
                    </MenuItem>
                    {tipoOptions.map((tipo) => (
                      <MenuItem key={tipo} value={tipo}>
                        {tipo.trim().replace(/[()]/g, '')}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <Autocomplete
                options={instalacaoOptions}
                getOptionLabel={(opt) => opt.nome || `Instalação ${opt.pk}`}
                value={selectedInstalacao}
                onChange={(_, val) => setSelectedInstalacao(val)}
                isOptionEqualToValue={(a, b) => a.pk === b.pk}
                disabled={isSubmitting || !filterAssociado || !filterTipo}
                noOptionsText="Nenhuma instalação encontrada com estes filtros"
                renderOption={(props, opt) => (
                  <li {...props} key={opt.pk}>
                    {opt.nome || `Instalação ${opt.pk}`}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Instalação"
                    placeholder="Pesquise por nome..."
                    size="small"
                    helperText={instalacaoHelperText}
                  />
                )}
              />
            </Box>

            <Divider />

            {/* SECÇÃO: DESCRIÇÃO */}
            <Box sx={{ p: 3 }}>
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
                  />
                )}
              />
            </Box>

            <Divider />

            {/* ACÇÕES */}
            <Box
              sx={{
                px: 3,
                py: 2,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1,
                bgcolor: 'background.default',
              }}
            >
              <Button color="inherit" onClick={handleClear} disabled={isSubmitting}>
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
