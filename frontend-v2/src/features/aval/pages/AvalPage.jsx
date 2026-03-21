import { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  LinearProgress,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Stack,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  HowToVote as AvalIcon,
  CheckCircle as DoneIcon,
  ViewModule as CardsIcon,
  ViewList as ListIcon,
} from '@mui/icons-material';
import ModulePage from '@/shared/components/layout/ModulePage';
import EvaluationCard from '../components/EvaluationCard';
import EvaluationListItem from '../components/EvaluationListItem';
import { useAval } from '../hooks/useAval';

function AvalPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [view, setView] = useState(() => {
    const saved = localStorage.getItem('aval_view');
    return saved ?? (isMobile ? 'list' : 'cards');
  });

  const handleViewChange = (_, next) => {
    if (!next) return;
    localStorage.setItem('aval_view', next);
    setView(next);
  };

  const {
    periods,
    selectedPeriod,
    setSelectedPeriod,
    evalList,
    status,
    loading,
    submitting,
    submitEvaluation,
  } = useAval();

  const progress =
    status.total > 0 ? Math.round((status.done / status.total) * 100) : 0;
  const isComplete = status.total > 0 && status.remaining === 0;
  const hasNoPeriod = !loading && periods.length === 0;
  const notAssigned =
    !loading && selectedPeriod && evalList.length === 0 && status.total === 0;

  return (
    <ModulePage
      title="Avaliação de Colaboradores"
      subtitle="Avaliação anónima de desempenho pessoal e profissional"
      icon={AvalIcon}
      color="primary"
      breadcrumbs={[{ label: 'Avaliação' }]}
    >
      {/* Seletor de campanha + toggle de vista */}
      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mb={3}>
        {periods.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Campanha</InputLabel>
            <Select
              value={selectedPeriod ?? ''}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              label="Campanha"
            >
              {periods.map((p) => (
                <MenuItem key={p.pk} value={p.pk}>
                  {p.descr || p.year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {evalList.length > 0 && (
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={handleViewChange}
            size="small"
            sx={{ ml: 'auto' }}
          >
            <ToggleButton value="cards" aria-label="Vista em cards">
              <CardsIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="list" aria-label="Vista em lista">
              <ListIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {/* Barra de carregamento */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Sem campanhas */}
      {hasNoPeriod && (
        <Alert severity="info">Não existe nenhuma campanha de avaliação ativa.</Alert>
      )}

      {/* Sem atribuições neste período */}
      {notAssigned && (
        <Alert severity="info">
          Não tem avaliações atribuídas para esta campanha.
        </Alert>
      )}

      {/* Progresso */}
      {selectedPeriod && status.total > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={1}
          >
            <Typography variant="body2" color="text.secondary">
              Progresso — {status.done} de {status.total} avaliações concluídas
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                label={`${status.done} concluídas`}
                size="small"
                color="success"
                variant="outlined"
              />
              {status.remaining > 0 && (
                <Chip
                  label={`${status.remaining} pendentes`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Paper>
      )}

      {/* Concluído */}
      {isComplete && (
        <Alert icon={<DoneIcon />} severity="success" sx={{ mb: 3 }}>
          Obrigado! Concluiu todas as avaliações desta campanha.
        </Alert>
      )}

      {/* Lista de avaliações */}
      {!isComplete && evalList.length > 0 && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecione a classificação (1–10 estrelas) e submeta para cada colaborador.
            As avaliações são <strong>anónimas</strong>.
          </Typography>

          {view === 'cards' ? (
            <Grid container spacing={2}>
              {evalList.map((assignment) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={assignment.pk}>
                  <EvaluationCard
                    assignment={assignment}
                    onSubmit={submitEvaluation}
                    isSubmitting={submitting === assignment.pk}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Stack spacing={1}>
              {evalList.map((assignment) => (
                <EvaluationListItem
                  key={assignment.pk}
                  assignment={assignment}
                  onSubmit={submitEvaluation}
                  isSubmitting={submitting === assignment.pk}
                />
              ))}
            </Stack>
          )}
        </>
      )}
    </ModulePage>
  );
}

export default AvalPage;
