import { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  PowerSettingsNew as ToggleIcon,
  AutoAwesome as GenerateIcon,
  HowToVote as AvalIcon,
  BarChart as ResultsIcon,
  Group as AssignIcon,
  CompareArrows as CompareIcon,
} from '@mui/icons-material';
import ModulePage from '@/shared/components/layout/ModulePage';
import { useAvalAdmin } from '../hooks/useAvalAdmin';
import { useAvalAnalytics } from '../hooks/useAvalAnalytics';
import PeriodComparisonTab from '../components/analytics/PeriodComparisonTab';

// ── Diálogo: criar campanha ──────────────────────────────────────────────────
function CreatePeriodDialog({ open, onClose, onCreate }) {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({ year: currentYear, descr: '' });

  const handleCreate = async () => {
    if (!form.descr.trim()) return;
    const ok = await onCreate(form);
    if (ok) {
      setForm({ year: currentYear, descr: '' });
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Nova Campanha</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <TextField
          label="Ano"
          type="number"
          fullWidth
          value={form.year}
          onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
          sx={{ mb: 2 }}
          size="small"
        />
        <TextField
          label="Descrição"
          fullWidth
          value={form.descr}
          onChange={(e) => setForm((f) => ({ ...f, descr: e.target.value }))}
          size="small"
          placeholder="Ex: Avaliação Anual 2025"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleCreate} disabled={!form.descr.trim()}>
          Criar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Diálogo: gerar atribuições ───────────────────────────────────────────────
function GenerateDialog({ open, onClose, users, onGenerate }) {
  const [selected, setSelected] = useState([]);
  const [generating, setGenerating] = useState(false);

  const toggle = (pk) =>
    setSelected((prev) =>
      prev.includes(pk) ? prev.filter((id) => id !== pk) : [...prev, pk]
    );

  const selectAll = () =>
    setSelected(selected.length === users.length ? [] : users.map((u) => u.pk));

  const handleGenerate = async () => {
    setGenerating(true);
    const ok = await onGenerate(selected);
    setGenerating(false);
    if (ok) {
      setSelected([]);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Gerar Atribuições — Todos contra Todos</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Selecione os colaboradores a incluir nesta campanha. Serão criadas
          atribuições mútuas entre todos os selecionados (excluindo auto-avaliação).
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={selected.length === users.length && users.length > 0}
              indeterminate={selected.length > 0 && selected.length < users.length}
              onChange={selectAll}
            />
          }
          label={<Typography fontWeight={600}>Selecionar todos</Typography>}
        />
        <FormGroup sx={{ maxHeight: 300, overflowY: 'auto', pl: 1 }}>
          {users.map((u) => (
            <FormControlLabel
              key={u.pk}
              control={
                <Checkbox
                  checked={selected.includes(u.pk)}
                  onChange={() => toggle(u.pk)}
                  size="small"
                />
              }
              label={u.name}
            />
          ))}
        </FormGroup>
        {selected.length >= 2 && (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            Serão geradas {selected.length * (selected.length - 1)} atribuições
            para {selected.length} colaboradores.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={selected.length < 2 || generating}
          onClick={handleGenerate}
          startIcon={<GenerateIcon />}
        >
          {generating ? 'A gerar…' : 'Gerar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Tab: Atribuições ─────────────────────────────────────────────────────────
function AssignmentsTab({ assignments, users, selectedPeriod, onGenerate }) {
  const [genOpen, setGenOpen] = useState(false);

  const done = assignments.filter((a) => a.done === 1).length;
  const total = assignments.length;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="body2" color="text.secondary">
          {total > 0 ? `${done} de ${total} avaliações concluídas` : 'Sem atribuições'}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<GenerateIcon />}
          onClick={() => setGenOpen(true)}
        >
          Gerar Atribuições
        </Button>
      </Box>

      {total > 0 && (
        <LinearProgress
          variant="determinate"
          value={total > 0 ? (done / total) * 100 : 0}
          sx={{ height: 6, borderRadius: 3, mb: 2 }}
        />
      )}

      {total === 0 ? (
        <Alert severity="info">
          Ainda não existem atribuições. Clique em "Gerar Atribuições" para criar
          automaticamente a matriz todos-contra-todos.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Avaliador</TableCell>
                <TableCell>Avaliado</TableCell>
                <TableCell align="center">Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.pk} hover>
                  <TableCell>{a.evaluator_name}</TableCell>
                  <TableCell>{a.target_name}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={a.done ? 'Concluída' : 'Pendente'}
                      size="small"
                      color={a.done ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <GenerateDialog
        open={genOpen}
        onClose={() => setGenOpen(false)}
        users={users}
        onGenerate={(userIds) => onGenerate(selectedPeriod, userIds)}
      />
    </Box>
  );
}

// ── Tab: Resultados ───────────────────────────────────────────────────────────
const RESULT_DIMS = [
  { label: 'Colaboração',    field: 'media_personal_colab', color: 'primary'   },
  { label: 'Relacionamento', field: 'media_personal_rel',   color: 'warning'   },
  { label: 'Desempenho',     field: 'media_profissional',   color: 'success'   },
];

function ScoreChip({ value, color }) {
  if (!value && value !== 0) return <Typography variant="body2" color="text.secondary">—</Typography>;
  return <Chip label={`★ ${Number(value).toFixed(1)}`} size="small" color={color} variant="outlined" />;
}

function ResultsTab({ results }) {
  if (results.length === 0) {
    return (
      <Alert severity="info">
        Ainda não existem avaliações submetidas para esta campanha.
      </Alert>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><b>Colaborador</b></TableCell>
            <TableCell align="center"><b>Avaliações</b></TableCell>
            {RESULT_DIMS.map((d) => (
              <TableCell key={d.field} align="center"><b>{d.label}</b></TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {results.map((r) => (
            <TableRow key={r.colaborador} hover>
              <TableCell>{r.colaborador}</TableCell>
              <TableCell align="center">{r.total_avaliacoes}</TableCell>
              {RESULT_DIMS.map((d) => (
                <TableCell key={d.field} align="center">
                  <ScoreChip value={r[d.field]} color={d.color} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
function AvalAdminPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [pageTab,    setPageTab]    = useState(0);

  const {
    periods,
    selectedPeriod,
    setSelectedPeriod,
    assignments,
    results,
    users,
    activeTab,
    setActiveTab,
    loading,
    loadingDetail,
    createPeriod,
    togglePeriod,
    generateAssignments,
  } = useAvalAdmin();

  const { rawData, periods: analyticsPeriods, loading: loadingAnalytics } = useAvalAnalytics();

  const currentPeriod = periods.find((p) => p.pk === selectedPeriod);

  return (
    <ModulePage
      title="Gestão de Avaliações"
      subtitle="Configuração de campanhas, atribuições e resultados"
      icon={SettingsIcon}
      color="primary"
      breadcrumbs={[{ label: 'Avaliação' }, { label: 'Configuração' }]}
      actions={
        pageTab === 0 ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            size="small"
          >
            Nova Campanha
          </Button>
        ) : null
      }
    >
      {/* ── Tabs de topo ── */}
      <Tabs
        value={pageTab}
        onChange={(_, v) => setPageTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<SettingsIcon fontSize="small" />} iconPosition="start" label="Campanhas" />
        <Tab icon={<CompareIcon  fontSize="small" />} iconPosition="start" label="Comparação de Períodos" />
      </Tabs>

      {/* ── Tab: Comparação ── */}
      {pageTab === 1 && (
        <PeriodComparisonTab
          rawData={rawData}
          periods={analyticsPeriods}
          loading={loadingAnalytics}
        />
      )}

      {/* ── Tab: Campanhas ── */}
      {pageTab === 0 && <>
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3}>
        {/* ── Lista de campanhas ── */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Campanhas
          </Typography>

          {periods.length === 0 && !loading && (
            <Alert severity="info" sx={{ mb: 1 }}>
              Não existem campanhas. Crie a primeira.
            </Alert>
          )}

          {periods.map((p) => (
            <Card
              key={p.pk}
              variant="outlined"
              onClick={() => setSelectedPeriod(p.pk)}
              sx={{
                mb: 1,
                cursor: 'pointer',
                borderColor: selectedPeriod === p.pk ? 'primary.main' : undefined,
                bgcolor: selectedPeriod === p.pk ? 'primary.50' : undefined,
              }}
            >
              <CardContent sx={{ pb: '8px !important', pt: 1.5 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {p.descr || p.year}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.year}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Chip
                      label={p.active ? 'Ativa' : 'Inativa'}
                      size="small"
                      color={p.active ? 'success' : 'default'}
                      variant="outlined"
                    />
                    <Tooltip title={p.active ? 'Desativar' : 'Ativar'}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePeriod(p.pk);
                        }}
                      >
                        <ToggleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Grid>

        {/* ── Detalhe do período ── */}
        <Grid size={{ xs: 12, md: 8 }}>
          {!selectedPeriod ? (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height={300}
              color="text.secondary"
              gap={1}
            >
              <AvalIcon sx={{ fontSize: 48, opacity: 0.3 }} />
              <Typography variant="body2">Selecione uma campanha para ver os detalhes</Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                {currentPeriod?.descr || currentPeriod?.year}
              </Typography>

              {loadingDetail && <LinearProgress sx={{ mb: 1 }} />}

              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab
                  icon={<AssignIcon fontSize="small" />}
                  iconPosition="start"
                  label="Atribuições"
                />
                <Tab
                  icon={<ResultsIcon fontSize="small" />}
                  iconPosition="start"
                  label="Resultados"
                />
              </Tabs>

              {activeTab === 0 && (
                <AssignmentsTab
                  assignments={assignments}
                  users={users}
                  selectedPeriod={selectedPeriod}
                  onGenerate={generateAssignments}
                />
              )}
              {activeTab === 1 && <ResultsTab results={results} />}
            </Box>
          )}
        </Grid>
      </Grid>

      <CreatePeriodDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createPeriod}
      />
      </>}
    </ModulePage>
  );
}

export default AvalAdminPage;
