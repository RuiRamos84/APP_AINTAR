import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, Grid, IconButton, InputLabel,
  MenuItem, Select, Switch, TextField, Tooltip, Typography, Stack,
  Divider, Paper,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  AttachFile as FileIcon, WorkOutline as ProcIcon, ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import notification from '@/core/services/notification';
import {
  getProcedimentos, getProcedimento, saveProcedimento,
  saveProcedimentoFase, deleteProcedimentoFase, uploadFaseFile, getMetadados,
} from '../api/websiteCmsService';

const EMPTY_PROC = {
  pk: null, referencia: '', ts_tipo: '', titulo: '', carreira: '',
  categoria_prof: '', area_atividade: '', tt_tipo_contrato: '', num_vagas: '',
  municipio: '', ts_estado: 1, descricao: '',
  data_abertura: null, data_encerramento: null, visivel: true,
};
const EMPTY_FASE = { pk: null, procedimento_fk: null, ts_tipo_fase: '', label_custom: '', data: null, notas: '', publicado: false, ordem: 0 };

export default function WebsiteProcedimentosPage() {
  const qc = useQueryClient();
  const [open, setOpen]           = useState(false);
  const [form, setForm]           = useState(EMPTY_PROC);
  const [faseOpen, setFaseOpen]   = useState(false);
  const [faseForm, setFaseForm]   = useState(EMPTY_FASE);
  const [faseFile, setFaseFile]   = useState(null);
  const [selected, setSelected]   = useState(null); // pk do procedimento selecionado
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [deleteFaseTarget, setDeleteFaseTarget] = useState(null);

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

  const tipos           = meta?.procedimento_tipos           ?? [];
  const estados         = meta?.procedimento_estados         ?? [];
  const faseTipos       = meta?.procedimento_fase_tipos      ?? [];
  const tiposContrato   = meta?.procedimento_tipos_contrato  ?? [];

  const saveMut = useMutation({
    mutationFn: saveProcedimento,
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'procedimentos']);
      notification.success(form.pk ? 'Procedimento atualizado' : 'Procedimento criado');
      setOpen(false);
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

  const openNew  = () => { setForm(EMPTY_PROC); setOpen(true); };
  const openEdit = (row) => setForm({
    ...row,
    data_abertura:    row.data_abertura    ? new Date(row.data_abertura)    : null,
    data_encerramento: row.data_encerramento ? new Date(row.data_encerramento) : null,
  });
  const openNewFase = () => { setFaseForm({ ...EMPTY_FASE, procedimento_fk: selected }); setFaseFile(null); setFaseOpen(true); };
  const openEditFase = (fase) => {
    setFaseForm({ ...fase, procedimento_fk: selected, data: fase.data ? new Date(fase.data) : null });
    setFaseFile(null);
    setFaseOpen(true);
  };
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setFase = (field) => (e) => setFaseForm(f => ({ ...f, [field]: e.target.value }));

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
      field: '_actions', headerName: '', width: 120, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => { openEdit(row); setOpen(true); }}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Gerir Fases">
            <IconButton size="small" color="primary" onClick={() => setSelected(row.pk)}>
              <ExpandIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row.pk)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const faseColumns = [
    { field: 'label',     headerName: 'Fase',     flex: 1 },
    {
      field: 'data', headerName: 'Data', width: 110,
      renderCell: ({ value }) => value ? new Date(value).toLocaleDateString('pt-PT') : '—',
    },
    { field: 'notas',     headerName: 'Notas',    flex: 1 },
    {
      field: 'publicado', headerName: 'Publicada', width: 100,
      renderCell: ({ value }) => <Chip size="small" label={value ? 'Sim' : 'Não'} color={value ? 'success' : 'default'} />,
    },
    {
      field: '_a', headerName: '', width: 90, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => openEditFase(row)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteFaseTarget(row.pk)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Novo Procedimento
        </Button>
      }
    >
      <Box sx={{ height: 420 }}>
        <DataGrid
          rows={data ?? []}
          columns={columns}
          loading={isLoading}
          getRowId={(r) => r.pk}
          disableRowSelectionOnClick
          pageSizeOptions={[25]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>

      {/* ─── Painel de Fases ──────────────────────────────────────────────── */}
      {selected && procDetail && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              Fases — {procDetail.titulo}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openNewFase}>
                Adicionar Fase
              </Button>
              <Button size="small" onClick={() => setSelected(null)}>Fechar</Button>
            </Stack>
          </Stack>
          <Box sx={{ height: 300 }}>
            <DataGrid
              rows={procDetail.fases ?? []}
              columns={faseColumns}
              getRowId={(r) => r.pk}
              disableRowSelectionOnClick
              hideFooter
            />
          </Box>
        </Paper>
      )}

      {/* ─── Proc Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.pk ? 'Editar Procedimento' : 'Novo Procedimento'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Referência" fullWidth value={form.referencia || ''} onChange={set('referencia')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select label="Tipo" value={form.ts_tipo || ''} onChange={set('ts_tipo')}>
                  {tipos.map(t => <MenuItem key={t.pk} value={t.pk}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <TextField label="Título" fullWidth required value={form.titulo} onChange={set('titulo')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Carreira" fullWidth value={form.carreira || ''} onChange={set('carreira')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Categoria Profissional" fullWidth value={form.categoria_prof || ''} onChange={set('categoria_prof')} />
            </Grid>
            <Grid size={12}>
              <TextField label="Área de Atividade" fullWidth value={form.area_atividade || ''} onChange={set('area_atividade')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Contrato</InputLabel>
                <Select label="Tipo de Contrato" value={form.tt_tipo_contrato || ''} onChange={set('tt_tipo_contrato')}>
                  <MenuItem value=""><em>Nenhum</em></MenuItem>
                  {tiposContrato.map(t => <MenuItem key={t.pk} value={t.pk}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Nº Vagas" type="number" fullWidth value={form.num_vagas || ''} onChange={set('num_vagas')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Município" fullWidth value={form.municipio || ''} onChange={set('municipio')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select label="Estado" value={form.ts_estado || 1} onChange={set('ts_estado')}>
                  {estados.map(e => <MenuItem key={e.pk} value={e.pk}>{e.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DatePicker label="Abertura" value={form.data_abertura} onChange={(v) => setForm(f => ({ ...f, data_abertura: v }))} slotProps={{ textField: { fullWidth: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DatePicker label="Encerramento" value={form.data_encerramento} onChange={(v) => setForm(f => ({ ...f, data_encerramento: v }))} slotProps={{ textField: { fullWidth: true } }} />
            </Grid>
            <Grid size={12}>
              <TextField label="Descrição" fullWidth multiline rows={3} value={form.descricao || ''} onChange={set('descricao')} />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={<Switch checked={!!form.visivel} onChange={(e) => setForm(f => ({ ...f, visivel: e.target.checked }))} />}
                label="Visível no website"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!form.titulo || saveMut.isPending} onClick={() => saveMut.mutate(form)}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Fase Dialog ──────────────────────────────────────────────────── */}
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
                label="Publicada"
              />
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
          <Button variant="contained" disabled={saveFaseMut.isPending} onClick={() => saveFaseMut.mutate(faseForm)}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Eliminar Procedimento?</DialogTitle>
        <DialogContent><Typography>Esta ação é irreversível.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => { /* soft-delete via estado */ setDeleteTarget(null); }}>
            Eliminar
          </Button>
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
    </ModulePage>
  );
}
