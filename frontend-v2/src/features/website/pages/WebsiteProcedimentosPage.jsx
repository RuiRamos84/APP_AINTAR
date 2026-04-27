import { useRef, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, Grid, IconButton, InputLabel,
  List, ListItem, ListItemIcon, ListItemText,
  MenuItem, Select, Step, StepLabel, Stepper, Switch, Tab, Tabs,
  TextField, Tooltip, Typography, Stack, Paper,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  AttachFile as FileIcon, WorkOutline as ProcIcon, ExpandMore as ExpandIcon,
  ArrowForward as NextIcon, ArrowBack as BackIcon,
  PictureAsPdf as PdfIcon, Description as DocIcon, CheckCircle as DoneIcon,
  Visibility as VisibleIcon, VisibilityOff as HiddenIcon,
  PeopleAlt as CandidatosIcon, OpenInNew as OpenIcon, ArrowBack as BackDetailIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import notification from '@/core/services/notification';
import {
  getProcedimentos, getProcedimento, saveProcedimento, toggleProcedimentoVisivel,
  saveProcedimentoFase, deleteProcedimentoFase, uploadFaseFile,
  uploadProcedimentoImagem, getProcedimentoDocs,
  uploadProcedimentoDoc, deleteProcedimentoDoc, getMetadados,
  getProcedimentoCandidatos, getCandidatoDetalhe,
} from '../api/websiteCmsService';

const EMPTY_PROC = {
  pk: null, referencia: '', ref_letra: '', ts_tipo: '', titulo: '', carreira: '',
  categoria_prof: '', area_atividade: '', tt_tipo_contrato: '', num_vagas: '',
  municipio: '', ts_estado: 1, descricao: '',
  data_abertura: null, data_encerramento: null, visivel: true,
};
const EMPTY_FASE = { pk: null, procedimento_fk: null, ts_tipo_fase: '', label_custom: '', data: null, notas: '', publicado: false, ordem: 0 };

function buildTitulo(form) {
  const n = form.num_vagas;
  const posto = String(n) === '1' ? 'posto de trabalho' : 'postos de trabalho';
  const area = form.area_atividade ? ` (${form.area_atividade})` : '';
  return `${n} ${posto} para ${form.carreira}${area} - REFª ${(form.ref_letra || '').toUpperCase()}`;
}

const STEPS = ['Cabeçalho', 'Corpo do Procedimento', 'Documentos'];

const DOC_TABS = [
  { key: 'publicacao',  label: 'Publicações',               folder: 'publicacoes' },
  { key: 'referencia',  label: 'Referências Bibliográficas', folder: 'referencias bibliograficas' },
];

function DocSection({ procPk, categoria }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [titulo, setTitulo] = useState('');

  const { data: docs = { publicacao: [], referencia: [], formulario: [] } } = useQuery({
    queryKey: ['cms', 'proc-docs', procPk],
    queryFn: () => getProcedimentoDocs(procPk),
    enabled: !!procPk,
  });

  const uploadMut = useMutation({
    mutationFn: ({ file }) => uploadProcedimentoDoc(procPk, categoria, titulo, file),
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'proc-docs', procPk]);
      notification.success('Documento adicionado');
      setTitulo('');
    },
    onError: (e) => notification.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteProcedimentoDoc,
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'proc-docs', procPk]);
      notification.success('Documento eliminado');
    },
    onError: (e) => notification.error(e.message),
  });

  const list = docs[categoria] ?? [];

  return (
    <Stack spacing={2}>
      {list.length > 0 && (
        <List dense disablePadding>
          {list.map(doc => (
            <ListItem
              key={doc.pk}
              disableGutters
              sx={{ borderBottom: '1px solid', borderColor: 'grey.100', py: 0.5 }}
              secondaryAction={
                <IconButton size="small" color="error" onClick={() => deleteMut.mutate(doc.pk)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <PdfIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText
                primary={doc.titulo || doc.nome_original}
                secondary={doc.nome_original}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
      )}

      <Stack direction="row" spacing={1} alignItems="flex-end">
        <TextField
          label="Título (opcional)"
          size="small"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          sx={{ flex: 1 }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          disabled={uploadMut.isPending}
          onClick={() => fileRef.current?.click()}
        >
          Adicionar
        </Button>
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={(e) => {
            const f = e.target.files[0];
            if (f) uploadMut.mutate({ file: f });
            e.target.value = '';
          }}
        />
      </Stack>
    </Stack>
  );
}

export default function WebsiteProcedimentosPage() {
  const qc = useQueryClient();
  const [open, setOpen]           = useState(false);
  const [step, setStep]           = useState(0);
  const [docTab, setDocTab]       = useState(0);
  const [form, setForm]           = useState(EMPTY_PROC);
  const [savedPk, setSavedPk]     = useState(null);
  const [procImage, setProcImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [faseOpen, setFaseOpen]   = useState(false);
  const [faseForm, setFaseForm]   = useState(EMPTY_FASE);
  const [faseFile, setFaseFile]   = useState(null);
  const [selected, setSelected]   = useState(null);
  const [deleteFaseTarget, setDeleteFaseTarget] = useState(null);
  const [candidatosProcPk, setCandidatosProcPk] = useState(null);
  const [candidatoDetalhePk, setCandidatoDetalhePk] = useState(null);
  const [candidatosSearch, setCandidatosSearch] = useState('');

  const effectivePk = form.pk || savedPk;

  const { data, isLoading } = useQuery({
    queryKey: ['cms', 'procedimentos'],
    queryFn: getProcedimentos,
    select: (r) => r?.procedimentos ?? [],
  });

  const { data: procDetail } = useQuery({
    queryKey: ['cms', 'procedimento', selected],
    queryFn: () => getProcedimento(selected),
    enabled: !!selected,
    select: (r) => r?.procedimento,
  });

  const { data: meta } = useQuery({
    queryKey: ['cms', 'metadados'],
    queryFn: getMetadados,
    staleTime: 10 * 60 * 1000,
  });

  const { data: candidatosData, isLoading: candidatosLoading } = useQuery({
    queryKey: ['cms', 'proc-candidatos', candidatosProcPk],
    queryFn: () => getProcedimentoCandidatos(candidatosProcPk),
    enabled: !!candidatosProcPk,
    select: (r) => r?.candidatos ?? [],
  });

  const { data: candidatoDetalhe, isLoading: detalheLoading } = useQuery({
    queryKey: ['cms', 'candidato', candidatoDetalhePk],
    queryFn: () => getCandidatoDetalhe(candidatoDetalhePk),
    enabled: !!candidatoDetalhePk,
    select: (r) => r?.candidato,
  });

  const candidatosFiltrados = useSearch(candidatosData ?? [], candidatosSearch);

  const tipos         = meta?.procedimento_tipos          ?? [];
  const estados       = meta?.procedimento_estados        ?? [];
  const faseTipos     = meta?.procedimento_fase_tipos     ?? [];
  const tiposContrato = meta?.procedimento_tipos_contrato ?? [];

  const saveMut = useMutation({
    mutationFn: async ({ data, continueToStep3 }) => {
      const res = await saveProcedimento(data);
      if (procImage && res?.pk) {
        try { await uploadProcedimentoImagem(res.pk, procImage); } catch { /* continua */ }
      }
      return { ...res, continueToStep3 };
    },
    onSuccess: (res) => {
      qc.invalidateQueries(['cms', 'procedimentos']);
      if (res.continueToStep3) {
        setSavedPk(res.pk);
        setStep(2);
        notification.success(form.pk ? 'Procedimento atualizado' : 'Procedimento guardado');
      } else {
        notification.success(form.pk ? 'Procedimento atualizado' : 'Procedimento criado');
        setOpen(false);
      }
    },
    onError: (e) => notification.error(e.message),
  });

  const toggleVisivelMut = useMutation({
    mutationFn: ({ pk, visivel }) => toggleProcedimentoVisivel(pk, visivel),
    onSuccess: (_, { visivel }) => {
      qc.invalidateQueries(['cms', 'procedimentos']);
      notification.success(visivel ? 'Procedimento agora visível no website' : 'Procedimento ocultado do website');
    },
    onError: (e) => notification.error(e.message),
  });

  const saveFaseMut = useMutation({
    mutationFn: async (data) => {
      const res = await saveProcedimentoFase(data);
      if (faseFile && res?.pk) {
        try { await uploadFaseFile(res.pk, faseFile); } catch { /* continua */ }
      }
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'procedimento', selected]);
      notification.success('Fase guardada');
      setFaseOpen(false);
    },
    onError: (e) => notification.error(e.message),
  });

  const deleteFaseMut = useMutation({
    mutationFn: deleteProcedimentoFase,
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'procedimento', selected]);
      notification.success('Fase eliminada');
      setDeleteFaseTarget(null);
    },
    onError: (e) => notification.error(e.message),
  });

  const openNew = () => {
    setForm(EMPTY_PROC); setStep(0); setDocTab(0);
    setSavedPk(null); setProcImage(null); setImagePreview(null);
    setOpen(true);
  };
  const openEdit = (row) => {
    setForm({
      ...row,
      referencia:        row.referencia || row.codigo_bep || '',
      data_abertura:     row.data_abertura     ? new Date(row.data_abertura)     : null,
      data_encerramento: row.data_encerramento ? new Date(row.data_encerramento) : null,
    });
    setStep(0); setDocTab(0); setSavedPk(null); setProcImage(null);
    setImagePreview(row.imagem_url || null);
    setOpen(true);
  };
  const openNewFase  = () => { setFaseForm({ ...EMPTY_FASE, procedimento_fk: selected }); setFaseFile(null); setFaseOpen(true); };
  const openEditFase = (fase) => {
    setFaseForm({ ...fase, procedimento_fk: selected, data: fase.data ? new Date(fase.data) : null });
    setFaseFile(null); setFaseOpen(true);
  };

  const set     = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setFase = (field) => (e) => setFaseForm(f => ({ ...f, [field]: e.target.value }));

  const step1Valid = form.num_vagas && form.carreira && form.ref_letra;
  const step2Valid = form.referencia && form.ts_tipo && form.categoria_prof && form.tt_tipo_contrato && form.municipio
    && form.data_abertura && form.data_encerramento && form.descricao?.trim() && (imagePreview || procImage);
  const previewTitulo = step1Valid ? buildTitulo(form) : null;

  const columns = [
    { field: 'referencia', headerName: 'Referência', width: 140 },
    { field: 'titulo',     headerName: 'Título',     flex: 2, minWidth: 200 },
    { field: 'tipo',       headerName: 'Tipo',       flex: 1, minWidth: 120 },
    { field: 'estado',     headerName: 'Estado',     flex: 1, minWidth: 100 },
    { field: 'num_fases',  headerName: 'Fases',      width: 70 },
    {
      field: 'visivel', headerName: 'Visível', width: 90,
      renderCell: ({ value }) => <Chip size="small" label={value ? 'Sim' : 'Não'} color={value ? 'success' : 'default'} />,
    },
    {
      field: '_actions', headerName: '', width: 155, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Editar"><IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Gerir Fases">
            <IconButton size="small" color="primary" onClick={() => setSelected(row.pk)}><ExpandIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title={row.visivel ? 'Ocultar do website' : 'Tornar visível no website'}>
            <IconButton
              size="small"
              color={row.visivel ? 'success' : 'default'}
              disabled={toggleVisivelMut.isPending}
              onClick={() => toggleVisivelMut.mutate({ pk: row.pk, visivel: !row.visivel })}
            >
              {row.visivel ? <VisibleIcon fontSize="small" /> : <HiddenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Lista de Candidatos">
            <IconButton size="small" color="info" onClick={() => setCandidatosProcPk(row.pk)}>
              <CandidatosIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const faseColumns = [
    { field: 'label', headerName: 'Fase', flex: 1 },
    { field: 'data', headerName: 'Data', width: 110, renderCell: ({ value }) => value ? new Date(value).toLocaleDateString('pt-PT') : '—' },
    { field: 'notas', headerName: 'Notas', flex: 1 },
    { field: 'publicado', headerName: 'Publicada', width: 100, renderCell: ({ value }) => <Chip size="small" label={value ? 'Sim' : 'Não'} color={value ? 'success' : 'default'} /> },
    {
      field: '_a', headerName: '', width: 90, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Editar"><IconButton size="small" onClick={() => openEditFase(row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setDeleteFaseTarget(row.pk)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <ModulePage
      title="Procedimentos de RH"
      subtitle="Concursos e procedimentos de recrutamento publicados no website"
      icon={ProcIcon}
      color="#e91e63"
      breadcrumbs={[{ label: 'CMS Website' }, { label: 'Procedimentos RH' }]}
      actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>Novo Procedimento</Button>}
    >
      <Box sx={{ height: 420 }}>
        <DataGrid rows={data ?? []} columns={columns} loading={isLoading} getRowId={(r) => r.pk}
          disableRowSelectionOnClick pageSizeOptions={[25]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} />
      </Box>

      {/* ─── Painel de Fases ─────────────────────────────────────────────── */}
      {selected && procDetail && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={600}>Fases — {procDetail.titulo}</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openNewFase}>Adicionar Fase</Button>
              <Button size="small" onClick={() => setSelected(null)}>Fechar</Button>
            </Stack>
          </Stack>
          <Box sx={{ height: 300 }}>
            <DataGrid rows={procDetail.fases ?? []} columns={faseColumns} getRowId={(r) => r.pk} disableRowSelectionOnClick hideFooter />
          </Box>
        </Paper>
      )}

      {/* ─── Proc Dialog (3 passos) ──────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={600}>
              {form.pk ? 'Editar Procedimento' : 'Novo Procedimento'}
            </Typography>
            <Stepper activeStep={step} alternativeLabel>
              {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>

          {/* ── Passo 0: Cabeçalho ── */}
          {step === 0 && (
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField label="Carreira" fullWidth required value={form.carreira || ''} onChange={set('carreira')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Nº Vagas" type="number" fullWidth required value={form.num_vagas || ''} onChange={set('num_vagas')} inputProps={{ min: 1 }} />
              </Grid>
              <Grid size={12}>
                <TextField label="Área de Atividade" fullWidth value={form.area_atividade || ''} onChange={set('area_atividade')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="REFª" fullWidth required
                  inputProps={{ maxLength: 1, style: { textTransform: 'uppercase' } }}
                  value={form.ref_letra || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 1);
                    setForm(f => ({ ...f, ref_letra: val }));
                  }}
                />
              </Grid>
              {previewTitulo && (
                <Grid size={12}>
                  <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'grey.100', border: '1px solid', borderColor: 'grey.300' }}>
                    <Typography variant="caption" color="text.secondary">Título gerado</Typography>
                    <Typography variant="body2" fontWeight={500}>{previewTitulo}</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}

          {/* ── Passo 1: Corpo do Procedimento ── */}
          {step === 1 && (
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField label="Referência BEP" fullWidth required value={form.referencia || ''} onChange={set('referencia')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth required>
                  <InputLabel>Tipo</InputLabel>
                  <Select label="Tipo" value={form.ts_tipo || ''} onChange={set('ts_tipo')}>
                    {tipos.map(t => <MenuItem key={t.pk} value={t.pk}>{t.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Categoria Profissional" fullWidth required value={form.categoria_prof || ''} onChange={set('categoria_prof')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Tipo de Contrato</InputLabel>
                  <Select label="Tipo de Contrato" value={form.tt_tipo_contrato || ''} onChange={set('tt_tipo_contrato')}>
                    <MenuItem value=""><em>Nenhum</em></MenuItem>
                    {tiposContrato.map(t => <MenuItem key={t.pk} value={t.pk}>{t.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Local de Trabalho" fullWidth required value={form.municipio || ''} onChange={set('municipio')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select label="Estado" value={form.ts_estado || 1} onChange={set('ts_estado')}>
                    {estados.map(e => <MenuItem key={e.pk} value={e.pk}>{e.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DatePicker label="Abertura *" value={form.data_abertura} onChange={(v) => setForm(f => ({ ...f, data_abertura: v }))} slotProps={{ textField: { fullWidth: true, required: true, error: !form.data_abertura } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DatePicker label="Encerramento *" value={form.data_encerramento} onChange={(v) => setForm(f => ({ ...f, data_encerramento: v }))} slotProps={{ textField: { fullWidth: true, required: true, error: !form.data_encerramento } }} />
              </Grid>
              <Grid size={12}>
                <Typography variant="caption" color={!imagePreview && !procImage ? 'error' : 'text.secondary'} display="block" mb={1}>
                  Fotografia do Concurso <span style={{ color: 'red' }}>*</span>
                </Typography>
                {imagePreview ? (
                  <Stack spacing={1}>
                    <Box sx={{ position: 'relative', display: 'inline-block', borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'grey.300', width: 'fit-content' }}>
                      <Box component="img" src={imagePreview} alt="Fotografia do concurso"
                        sx={{ display: 'block', width: 240, height: 160, objectFit: 'cover' }} />
                      {procImage && (
                        <Box sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'success.main', color: '#fff', borderRadius: 1, px: 0.8, py: 0.2 }}>
                          <Typography variant="caption" fontWeight={600}>Nova</Typography>
                        </Box>
                      )}
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" component="label" startIcon={<FileIcon />} size="small">
                        Alterar imagem
                        <input type="file" hidden accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files[0];
                            if (f) { setProcImage(f); setImagePreview(URL.createObjectURL(f)); }
                          }} />
                      </Button>
                      <Button size="small" color="error" variant="outlined" onClick={() => { setProcImage(null); setImagePreview(null); }}>
                        Remover
                      </Button>
                    </Stack>
                    {procImage && (
                      <Typography variant="caption" color="text.secondary">{procImage.name}</Typography>
                    )}
                  </Stack>
                ) : (
                  <Button variant="outlined" component="label" startIcon={<FileIcon />} size="small">
                    Carregar imagem
                    <input type="file" hidden accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files[0];
                        if (f) { setProcImage(f); setImagePreview(URL.createObjectURL(f)); }
                      }} />
                  </Button>
                )}
              </Grid>
              <Grid size={12}>
                <TextField label="Descrição" fullWidth multiline minRows={3} maxRows={10} required
                  value={form.descricao || ''} onChange={set('descricao')} />
              </Grid>
              <Grid size={12}>
                <FormControlLabel
                  control={<Switch checked={!!form.visivel} onChange={(e) => setForm(f => ({ ...f, visivel: e.target.checked }))} />}
                  label="Visível no website"
                />
              </Grid>
            </Grid>
          )}

          {/* ── Passo 2: Documentos ── */}
          {step === 2 && (
            <Box sx={{ pt: 1 }}>
              {!effectivePk ? (
                <Typography color="text.secondary" variant="body2">
                  Guarda o procedimento primeiro para poder adicionar documentos.
                </Typography>
              ) : (
                <>
                  <Tabs value={docTab} onChange={(_, v) => setDocTab(v)} sx={{ mb: 2 }} variant="fullWidth">
                    {DOC_TABS.map((t, i) => <Tab key={t.key} label={t.label} value={i} />)}
                  </Tabs>
                  {DOC_TABS.map((t, i) => (
                    <Box key={t.key} hidden={docTab !== i}>
                      <DocSection procPk={effectivePk} categoria={t.key} />
                    </Box>
                  ))}
                </>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>

          {step === 0 && (
            <Button variant="contained" endIcon={<NextIcon />} disabled={!step1Valid} onClick={() => setStep(1)}>
              Seguinte
            </Button>
          )}

          {step === 1 && (
            <>
              <Button startIcon={<BackIcon />} onClick={() => setStep(0)}>Voltar</Button>
              <Button variant="outlined" disabled={!step2Valid || saveMut.isPending}
                onClick={() => saveMut.mutate({ data: form, continueToStep3: false })}>
                Guardar
              </Button>
              <Button variant="contained" endIcon={<NextIcon />} disabled={!step2Valid || saveMut.isPending}
                onClick={() => saveMut.mutate({ data: form, continueToStep3: true })}>
                Seguinte
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button startIcon={<BackIcon />} onClick={() => setStep(1)}>Voltar</Button>
              <Button variant="contained" startIcon={<DoneIcon />} onClick={() => { qc.invalidateQueries(['cms', 'procedimentos']); setOpen(false); }}>
                Concluir
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ─── Fase Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={faseOpen} onClose={() => setFaseOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{faseForm.pk ? 'Editar Fase' : 'Nova Fase'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Fase</InputLabel>
                <Select label="Tipo de Fase" value={faseForm.ts_tipo_fase || ''} onChange={setFase('ts_tipo_fase')}>
                  {faseTipos.map(t => <MenuItem key={t.pk} value={t.pk}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Etiqueta personalizada" fullWidth value={faseForm.label_custom || ''} onChange={setFase('label_custom')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DatePicker label="Data" value={faseForm.data} onChange={(v) => setFaseForm(f => ({ ...f, data: v }))} slotProps={{ textField: { fullWidth: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Ordem" type="number" fullWidth value={faseForm.ordem ?? 0} onChange={setFase('ordem')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch checked={!!faseForm.publicado} onChange={(e) => setFaseForm(f => ({ ...f, publicado: e.target.checked }))} />}
                label="Publicada" />
            </Grid>
            <Grid size={12}>
              <TextField label="Notas" fullWidth multiline rows={2} value={faseForm.notas || ''} onChange={setFase('notas')} />
            </Grid>
            <Grid size={12}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button variant="outlined" component="label" startIcon={<FileIcon />}>
                  {faseFile ? faseFile.name : 'Ficheiro da Fase'}
                  <input type="file" hidden onChange={(e) => setFaseFile(e.target.files[0])} />
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFaseOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={saveFaseMut.isPending} onClick={() => saveFaseMut.mutate(faseForm)}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteFaseTarget} onClose={() => setDeleteFaseTarget(null)}>
        <DialogTitle>Eliminar Fase?</DialogTitle>
        <DialogContent><Typography>Esta ação é irreversível.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteFaseTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => deleteFaseMut.mutate(deleteFaseTarget)}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog Detalhe Candidato ───────────────────────────────────── */}
      <Dialog open={!!candidatoDetalhePk} onClose={() => setCandidatoDetalhePk(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <IconButton size="small" onClick={() => setCandidatoDetalhePk(null)}><BackDetailIcon fontSize="small" /></IconButton>
            <Typography variant="h6" fontWeight={600}>
              {detalheLoading ? 'A carregar…' : candidatoDetalhe?.nome_completo}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {detalheLoading && <Typography color="text.secondary" variant="body2">A carregar ficha…</Typography>}
          {candidatoDetalhe && (() => {
            const c = candidatoDetalhe
            const fmt = (v) => v || '—'
            const fmtDate = (v) => v ? new Date(v).toLocaleDateString('pt-PT') : '—'
            const fmtBool = (v) => v ? 'Sim' : 'Não'
            const SectionTitle = ({ children }) => (
              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 3, mb: 1, color: 'primary.main', textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
                {children}
              </Typography>
            )
            const Row = ({ label, value }) => (
              <Box sx={{ display: 'grid', gridTemplateColumns: '180px 1fr', borderBottom: '1px solid', borderColor: 'grey.100', py: 0.75 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
                <Typography variant="body2">{fmt(value)}</Typography>
              </Box>
            )
            const API = import.meta.env.VITE_API_URL || '/api/v1'
            return (
              <Box>
                <SectionTitle>3. Identificação do Candidato</SectionTitle>
                <Row label="Nome completo"        value={c.nome_completo} />
                <Row label="Data de nascimento"   value={fmtDate(c.data_nascimento)} />
                <Row label="Sexo"                 value={c.sexo} />
                <Row label="Tipo doc. identidade" value={c.tipo_doc_id} />
                <Row label="N.º identificação"    value={c.num_doc_id} />
                <Row label="Nacionalidade"        value={c.nacionalidade} />
                <Row label="País de residência"   value={c.pais_residencia} />
                <Row label="NIF"                  value={c.nif} />
                <Row label="Morada"               value={c.morada} />
                <Row label="Código Postal"        value={c.codigo_postal} />
                <Row label="Localidade"           value={c.localidade} />
                <Row label="Distrito"             value={c.distrito} />
                <Row label="Concelho"             value={c.concelho} />
                <Row label="Telemóvel"            value={c.telemovel} />
                <Row label="Telefone"             value={c.telefone} />
                <Row label="Email"                value={c.email} />

                <SectionTitle>4. Habilitações</SectionTitle>
                <Row label="Nível habilitacional"      value={c.nivel_hab_codigo ? `${c.nivel_hab_codigo} — ${c.nivel_hab_descricao}` : null} />
                <Row label="Área formação académica"   value={c.area_formacao_academica} />
                <Row label="Área formação profissional" value={c.area_formacao_profissional} />
                <Row label="Outras formações"          value={c.outras_formacoes} />
                <Row label="Formação substitutiva"     value={c.formacao_substitutiva} />

                <SectionTitle>5. Situação Jurídico-Funcional</SectionTitle>
                <Row label="Titular vínculo público"   value={fmtBool(c.titular_vinculo_publico)} />
                {c.titular_vinculo_publico && <>
                  <Row label="Modalidade de vínculo"     value={c.modalidade_vinculo} />
                  <Row label="Situação profissional"     value={c.situacao_profissional_atual} />
                  <Row label="Órgão / Serviço"           value={c.orgao_servico} />
                  <Row label="Carreira e categoria"      value={c.carreira_categoria} />
                  <Row label="Atividade exercida"        value={c.atividade_exercida} />
                  <Row label="Posição / Nível remun."    value={c.posicao_nivel_remuneratorio} />
                  <Row label="Avaliação de desempenho"   value={c.avaliacao_desempenho} />
                </>}

                <SectionTitle>6. Métodos de Seleção</SectionTitle>
                <Row label="Afasta métodos obrigatórios" value={fmtBool(c.afasta_metodos_obrigatorios)} />

                <SectionTitle>7. Necessidades Especiais</SectionTitle>
                <Row label="Grau de incapacidade"  value={c.grau_incapacidade} />
                <Row label="Tipo de incapacidade"  value={c.tipo_incapacidade} />
                <Row label="Condições especiais"   value={c.condicoes_especiais} />

                <SectionTitle>8. Declarações</SectionTitle>
                <Row label="Declara requisitos"  value={fmtBool(c.declara_requisitos)} />
                <Row label="Declara veracidade"  value={fmtBool(c.declara_veracidade)} />
                <Row label="Localidade"          value={c.localidade_assinatura} />
                <Row label="Data"                value={fmtDate(c.data_assinatura)} />

                {c.documentos?.length > 0 && <>
                  <SectionTitle>9. Documentos Anexos</SectionTitle>
                  <List dense disablePadding>
                    {c.documentos.map(d => (
                      <ListItem key={d.pk} disableGutters sx={{ borderBottom: '1px solid', borderColor: 'grey.100', py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}><PdfIcon fontSize="small" color="error" /></ListItemIcon>
                        <ListItemText
                          primary={d.tipo_documento_descricao || 'Documento'}
                          secondary={d.nome_ficheiro}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        {d.ficheiro_url && (
                          <Tooltip title="Abrir / Descarregar">
                            <IconButton size="small" component="a"
                              href={`${API}/website/procedimento-doc/${d.ficheiro_url}`}
                              target="_blank" rel="noopener noreferrer">
                              <OpenIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </ListItem>
                    ))}
                  </List>
                </>}

                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                  Submetido em: {new Date(c.created_at).toLocaleString('pt-PT')}
                </Typography>
              </Box>
            )
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCandidatoDetalhePk(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog Lista de Candidatos ──────────────────────────────────── */}
      <Dialog open={!!candidatosProcPk} onClose={() => { setCandidatosProcPk(null); setCandidatosSearch(''); }} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <CandidatosIcon color="info" />
            <Typography variant="h6" fontWeight={600}>Lista de Candidatos</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <SearchBar value={candidatosSearch} onChange={setCandidatosSearch} placeholder="Pesquisar candidatos…" size="small" />
          </Box>
          <Box sx={{ height: 420 }}>
            <DataGrid
              rows={candidatosFiltrados}
              loading={candidatosLoading}
              getRowId={(r) => r.pk}
              disableRowSelectionOnClick
              hideFooterSelectedRowCount
              pageSizeOptions={[25]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              columns={[
                { field: 'nome_completo', headerName: 'Nome', flex: 2, minWidth: 180 },
                { field: 'nif',           headerName: 'NIF',  width: 110 },
                { field: 'num_doc_id',    headerName: 'N.º Doc. ID', width: 130,
                  renderCell: ({ row }) => row.num_doc_id
                    ? `${row.tipo_doc_id ? row.tipo_doc_id + ' ' : ''}${row.num_doc_id}`
                    : '—'
                },
                { field: 'email',         headerName: 'Email', flex: 1, minWidth: 180 },
                { field: 'telemovel',     headerName: 'Telemóvel', width: 120,
                  renderCell: ({ value }) => value || '—'
                },
                { field: 'nivel_hab_codigo', headerName: 'Hab.', width: 70,
                  renderCell: ({ row }) => row.nivel_hab_codigo
                    ? <Tooltip title={row.nivel_hab_descricao || ''}><span>{row.nivel_hab_codigo}</span></Tooltip>
                    : '—'
                },
                { field: 'created_at', headerName: 'Data de Submissão', width: 155,
                  renderCell: ({ value }) => value ? new Date(value).toLocaleString('pt-PT') : '—'
                },
                { field: '_ver', headerName: '', width: 60, sortable: false,
                  renderCell: ({ row }) => (
                    <Tooltip title="Ver ficha completa">
                      <IconButton size="small" color="primary" onClick={() => setCandidatoDetalhePk(row.pk)}>
                        <OpenIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ),
                },
              ]}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, pl: 1 }}>
            {candidatosFiltrados.length !== (candidatosData?.length ?? 0)
              ? `${candidatosFiltrados.length} de ${candidatosData?.length ?? 0} candidato(s)`
              : `${candidatosData?.length ?? 0} candidato(s)`}
          </Typography>
          <Button onClick={() => { setCandidatosProcPk(null); setCandidatosSearch(''); }}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </ModulePage>
  );
}
