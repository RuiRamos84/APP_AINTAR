/**
 * AnalysisPage
 * Gestão de análises laboratoriais — pesquisa, consulta e registo de resultados
 */

import { useState, useMemo } from 'react';
import {
  Box, Grid, Paper, Typography, TextField, Button, Chip, Stack,
  IconButton, InputAdornment, Collapse, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Divider, Tooltip, useTheme, useMediaQuery, alpha, Autocomplete,
} from '@mui/material';
import {
  Search as SearchIcon, FilterList as FilterIcon,
  Edit as EditIcon, Science as ScienceIcon,
  CheckCircle as CheckIcon, ExpandMore as ExpandIcon,
  Refresh as RefreshIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { toast } from 'sonner';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useMetaData, useETARList, useEEList, useAnaliseParams } from '@/core/hooks/useMetaData';
import { queryAnalyses, searchAnalysisByPK, updateAnalysis } from '../services/analysisService';

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CFG = {
  pendente: { label: 'Pendente', color: 'warning' },
  concluido: { label: 'Concluído', color: 'success' },
  default: { label: 'Registado', color: 'default' },
};

const getStatus = (item) => {
  if (item.resultado) return STATUS_CFG.concluido;
  return STATUS_CFG.pendente;
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const AnalysisPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: analiseParams = [] } = useAnaliseParams();
  const { data: etarList = [] } = useETARList();
  const { data: eeList = [] } = useEEList();

  // Quick search
  const [quickPK, setQuickPK] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [entityObj, setEntityObj] = useState(null);
  const [instalacaoObj, setInstalacaoObj] = useState(null);
  const [filters, setFilters] = useState({
    instalacao: '', dataInicio: '', dataFim: '',
  });

  // Data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [resultado, setResultado] = useState('');
  const [saving, setSaving] = useState(false);

  // All installations
  const allInstalacoes = useMemo(() => [
    ...etarList.map((e) => ({ ...e, tipo: 'ETAR' })),
    ...eeList.map((e) => ({ ...e, tipo: 'EE' })),
  ], [etarList, eeList]);

  // Unique entities sorted
  const entities = useMemo(() => {
    const seen = new Set();
    return allInstalacoes
      .map((i) => i.ts_entity)
      .filter((e) => e && !seen.has(e) && seen.add(e))
      .sort((a, b) => a.localeCompare(b, 'pt'));
  }, [allInstalacoes]);

  // Installations filtered by selected entity, sorted by name
  const filteredInstalacoes = useMemo(() => {
    if (!entityObj) return [];
    return allInstalacoes
      .filter((i) => i.ts_entity === entityObj)
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));
  }, [allInstalacoes, entityObj]);

  // Quick search handler
  const handleQuickSearch = async () => {
    if (!quickPK.trim()) return;
    setQuickLoading(true);
    setError(null);
    try {
      const res = await searchAnalysisByPK(quickPK.trim());
      const raw = res?.data ?? res;
      const data = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setRows(data);
      setSearched(true);
    } catch (e) {
      const status = e.response?.status ?? e.status;
      if (status === 404) {
        toast.info(`Nenhuma análise encontrada para o nº ${quickPK.trim()}`);
        setRows([]);
        setSearched(true);
      } else {
        setError(e.response?.data?.message || e.message || 'Erro ao pesquisar análise');
      }
    } finally {
      setQuickLoading(false);
    }
  };

  // Query handler
  const handleQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {};
      if (filters.instalacao) payload.tb_instalacao = parseInt(filters.instalacao, 10);
      if (filters.dataInicio) payload.data_inicio = filters.dataInicio;
      if (filters.dataFim) payload.data_fim = filters.dataFim;
      const res = await queryAnalyses(payload);
      const data = res?.data ?? (Array.isArray(res) ? res : []);
      setRows(data);
      setSearched(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit handlers
  const openEdit = (row) => {
    setSelected(row);
    setResultado(row.resultado || '');
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateAnalysis({ pk: selected.pk, resultado });
      toast.success('Resultado atualizado com sucesso!');
      setRows((prev) => prev.map((r) => r.pk === selected.pk ? { ...r, resultado } : r));
      setEditOpen(false);
    } catch (e) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // DataGrid columns
  const columns = [
    { field: 'pk', headerName: 'Nº Amostra', width: 110, type: 'number' },
    {
      field: 'data', headerName: 'Data', width: 110,
      valueFormatter: (v) => v ? new Date(v).toLocaleDateString('pt-PT') : '—',
    },
    { field: 'tt_analiseponto', headerName: 'Ponto', width: 140 },
    { field: 'tt_analiseparam', headerName: 'Parâmetro', flex: 1, minWidth: 160 },
    {
      field: 'resultado', headerName: 'Resultado', width: 140,
      renderCell: ({ value, row }) => {
        const s = getStatus(row);
        return value
          ? <Chip label={value} size="small" color={s.color} variant="outlined" />
          : <Chip label="Pendente" size="small" color="warning" />;
      },
    },
    { field: 'updt_client', headerName: 'Atualizado por', width: 140 },
    {
      field: 'actions', headerName: '', width: 60, sortable: false,
      renderCell: ({ row }) => (
        <Tooltip title="Editar resultado">
          <IconButton size="small" onClick={() => openEdit(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <ModulePage
      title="Análises Laboratoriais"
      subtitle="Pesquisa e registo de resultados de análises"
      icon={ScienceIcon}
      color="#00bcd4"
      breadcrumbs={[
        { label: 'Gestão', path: '/analyses' },
        { label: 'Análises', path: '/analyses' },
      ]}
    >
      {/* Pesquisa Rápida por Nº Amostra */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.04) }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Pesquisa Rápida — Nº Amostra
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Número da Amostra"
            value={quickPK}
            onChange={(e) => setQuickPK(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickSearch()}
            sx={{ flexGrow: 1, maxWidth: 280 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><ScienceIcon fontSize="small" /></InputAdornment>,
              endAdornment: quickPK ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { setQuickPK(''); setRows([]); setSearched(false); }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <Button
            variant="contained"
            onClick={handleQuickSearch}
            disabled={quickLoading || !quickPK.trim()}
            startIcon={<SearchIcon />}
          >
            {quickLoading ? 'A pesquisar...' : 'Pesquisar'}
          </Button>
        </Box>
      </Paper>

      {/* Filtros Avançados */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: showFilters ? 2 : 0 }}>
          <Typography variant="subtitle1" fontWeight={700}>Filtros Avançados</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<FilterIcon />}
              endIcon={<ExpandIcon sx={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
              onClick={() => setShowFilters((p) => !p)}
            >
              {showFilters ? 'Ocultar' : 'Mostrar'}
            </Button>
          </Box>
        </Box>
        <Collapse in={showFilters}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                size="small"
                options={entities}
                getOptionLabel={(option) => option}
                value={entityObj}
                onChange={(_, newValue) => {
                  setEntityObj(newValue);
                  setInstalacaoObj(null);
                  setFilters((p) => ({ ...p, instalacao: '' }));
                }}
                noOptionsText="Nenhuma entidade encontrada"
                clearText="Limpar"
                openText="Abrir"
                closeText="Fechar"
                ListboxProps={{ style: { maxHeight: 300 } }}
                renderInput={(params) => (
                  <TextField {...params} label="Entidade" placeholder="Pesquisar entidade..." />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                size="small"
                options={filteredInstalacoes}
                getOptionLabel={(option) => `${option.nome || `#${option.pk}`} (${option.tipo})`}
                value={instalacaoObj}
                onChange={(_, newValue) => {
                  setInstalacaoObj(newValue);
                  setFilters((p) => ({ ...p, instalacao: newValue?.pk || '' }));
                }}
                isOptionEqualToValue={(option, value) => option.pk === value?.pk}
                disabled={!entityObj}
                noOptionsText="Nenhuma instalação encontrada"
                clearText="Limpar"
                openText="Abrir"
                closeText="Fechar"
                ListboxProps={{ style: { maxHeight: 300 } }}
                renderInput={(params) => (
                  <TextField {...params} label="Instalação" placeholder="Pesquisar instalação..." />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth size="small" type="date" label="Data Início"
                value={filters.dataInicio}
                onChange={(e) => setFilters((p) => ({ ...p, dataInicio: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth size="small" type="date" label="Data Fim"
                value={filters.dataFim}
                onChange={(e) => setFilters((p) => ({ ...p, dataFim: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 12, md: 2 }}>
              <Button
                fullWidth variant="contained" onClick={handleQuery}
                disabled={loading} startIcon={<SearchIcon />}
                sx={{ height: 40 }}
              >
                {loading ? 'A pesquisar...' : 'Pesquisar'}
              </Button>
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {/* Resultado */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {searched && (
        <Paper sx={{ borderRadius: 2 }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" color="text.secondary">
              {rows.length} {rows.length === 1 ? 'análise encontrada' : 'análises encontradas'}
            </Typography>
            <Tooltip title="Atualizar">
              <IconButton size="small" onClick={handleQuery}><RefreshIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
          <Divider />
          {isMobile ? (
            <Stack spacing={1} sx={{ p: 2 }}>
              {rows.map((row) => {
                const s = getStatus(row);
                return (
                  <Card key={row.pk} variant="outlined" onClick={() => openEdit(row)} sx={{ cursor: 'pointer' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={700}>Amostra #{row.pk}</Typography>
                        <Chip label={s.label} size="small" color={s.color} />
                      </Box>
                      <Typography variant="body2">{row.tt_analiseparam}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.tt_analiseponto} · {row.data ? new Date(row.data).toLocaleDateString('pt-PT') : '—'}
                      </Typography>
                    </CardContent>
                  </Card>
                );
              })}
              {rows.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Sem análises para os filtros selecionados
                </Typography>
              )}
            </Stack>
          ) : (
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => r.pk}
              autoHeight
              disableRowSelectionOnClick
              pageSizeOptions={[25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              localeText={{ noRowsLabel: 'Nenhuma análise encontrada' }}
              sx={{ border: 0 }}
            />
          )}
        </Paper>
      )}

      {!searched && !loading && !quickLoading && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
          <ScienceIcon sx={{ fontSize: 72, mb: 2, opacity: 0.2 }} />
          <Typography variant="h6">Pesquise por número de amostra ou use os filtros</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Introduza um número de amostra ou aplique filtros para visualizar resultados
          </Typography>
        </Box>
      )}

      {/* Dialog Editar Resultado */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={700}>Registar Resultado</Typography>
            <IconButton size="small" onClick={() => setEditOpen(false)}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={2}>
              <Grid container spacing={1}>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Nº Amostra</Typography>
                  <Typography variant="body1" fontWeight={700}>#{selected.pk}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Data</Typography>
                  <Typography variant="body1">
                    {selected.data ? new Date(selected.data).toLocaleDateString('pt-PT') : '—'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Ponto</Typography>
                  <Typography variant="body1">{selected.tt_analiseponto || '—'}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.secondary">Parâmetro</Typography>
                  <Typography variant="body1">{selected.tt_analiseparam || '—'}</Typography>
                </Grid>
              </Grid>
              <Divider />
              <TextField
                fullWidth
                label="Resultado"
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                multiline
                rows={3}
                placeholder="Introduza o resultado da análise..."
                autoFocus
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckIcon />}
            onClick={handleSave}
            disabled={saving || !resultado.trim()}
          >
            {saving ? 'A guardar...' : 'Guardar Resultado'}
          </Button>
        </DialogActions>
      </Dialog>
    </ModulePage>
  );
};

export default AnalysisPage;
