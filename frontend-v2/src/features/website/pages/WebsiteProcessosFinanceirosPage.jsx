import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, Grid, IconButton, InputLabel,
  MenuItem, Select, Switch, TextField, Tooltip, Typography, Stack,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  AttachFile as FileIcon, AccountBalance as FinIcon, ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import notification from '@/core/services/notification';
import {
  getProcessos, getProcesso, saveProcesso,
  saveProcessoDoc, deleteProcessoDoc, uploadProcessoDocFile, getMetadados,
} from '../api/websiteCmsService';

const EMPTY_PROC = { pk: null, ts_tipo: '', ano_exercicio: new Date().getFullYear(), titulo: '', descricao: '', ts_estado: 1, visivel: false };
const EMPTY_DOC  = { pk: null, processo_fk: null, ts_tipo_doc: '', titulo: '', provisorio: false, data_publicacao: null, ordem: 0, publicado: false };

export default function WebsiteProcessosFinanceirosPage() {
  const qc = useQueryClient();
  const [open, setOpen]           = useState(false);
  const [form, setForm]           = useState(EMPTY_PROC);
  const [procFile, setProcFile]   = useState(null);
  const [docOpen, setDocOpen]     = useState(false);
  const [docForm, setDocForm]     = useState(EMPTY_DOC);
  const [docFile, setDocFile]     = useState(null);
  const [selected, setSelected]   = useState(null);
  const [deleteDocTarget, setDeleteDocTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cms', 'processos'],
    queryFn: getProcessos,
    select: (r) => r?.processos ?? [],
  });

  const { data: procDetail } = useQuery({
    queryKey: ['cms', 'processo', selected],
    queryFn: () => getProcesso(selected),
    enabled: !!selected,
    select: (r) => r?.processo,
  });

  const { data: meta } = useQuery({
    queryKey: ['cms', 'metadados'],
    queryFn: getMetadados,
    staleTime: 10 * 60 * 1000,
  });

  const tipos    = meta?.processo_financeiro_tipos    ?? [];
  const estados  = meta?.processo_financeiro_estados  ?? [];
  const docTipos = meta?.processo_financeiro_doc_tipos ?? [];

  const saveMut = useMutation({
    mutationFn: async (formData) => {
      const res = await saveProcesso(formData);
      const pk = res?.pk ?? formData.pk;
      if (procFile && pk) {
        // Se é criação, cria documento principal automaticamente
        // Se é edição com documentos existentes, faz upload para o primeiro
        const existingDoc = procDetail?.documentos?.[0];
        if (existingDoc) {
          await uploadProcessoDocFile(existingDoc.pk, procFile);
        } else {
          const docRes = await saveProcessoDoc({
            processo_fk: pk,
            titulo: formData.titulo,
            ts_tipo_doc: docTipos[0]?.pk ?? null,
            publicado: formData.visivel,
            ordem: 1,
          });
          if (docRes?.pk) await uploadProcessoDocFile(docRes.pk, procFile);
        }
      }
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'processos']);
      if (selected) qc.invalidateQueries(['cms', 'processo', selected]);
      notification.success(form.pk ? 'Processo atualizado' : 'Processo criado');
      setOpen(false);
    },
    onError: (e) => notification.error(e.message),
  });

  const saveDocMut = useMutation({
    mutationFn: async (data) => {
      const res = await saveProcessoDoc(data);
      if (docFile && res?.pk) {
        try { await uploadProcessoDocFile(res.pk, docFile); } catch { /* continua */ }
      }
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'processo', selected]);
      notification.success('Documento guardado');
      setDocOpen(false);
    },
    onError: (e) => notification.error(e.message),
  });

  const deleteDocMut = useMutation({
    mutationFn: deleteProcessoDoc,
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'processo', selected]);
      notification.success('Documento eliminado');
      setDeleteDocTarget(null);
    },
    onError: (e) => notification.error(e.message),
  });

  const openNew     = () => { setForm(EMPTY_PROC); setProcFile(null); setOpen(true); };
  const openEdit    = (row) => { setForm({ ...row }); setProcFile(null); setOpen(true); };
  const openNewDoc  = () => { setDocForm({ ...EMPTY_DOC, processo_fk: selected }); setDocFile(null); setDocOpen(true); };
  const openEditDoc = (row) => {
    setDocForm({ ...row, processo_fk: selected, data_publicacao: row.data_publicacao ? new Date(row.data_publicacao) : null });
    setDocFile(null);
    setDocOpen(true);
  };
  const set    = (f) => (e) => setForm(prev  => ({ ...prev,  [f]: e.target.value }));
  const setDoc = (f) => (e) => setDocForm(prev => ({ ...prev, [f]: e.target.value }));

  const columns = [
    { field: 'tipo',          headerName: 'Tipo',    flex: 1, minWidth: 140 },
    { field: 'ano_exercicio', headerName: 'Ano',     width: 80 },
    { field: 'titulo',        headerName: 'Título',  flex: 2, minWidth: 180 },
    { field: 'estado',        headerName: 'Estado',  flex: 1, minWidth: 120 },
    { field: 'num_documentos',headerName: 'Docs',    width: 70 },
    {
      field: 'visivel', headerName: 'Visível', width: 90,
      renderCell: ({ value }) => <Chip size="small" label={value ? 'Sim' : 'Não'} color={value ? 'success' : 'default'} />,
    },
    {
      field: '_actions', headerName: '', width: 120, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Gerir Documentos">
            <IconButton size="small" color="primary" onClick={() => setSelected(row.pk)}>
              <ExpandIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const docColumns = [
    { field: 'titulo',    headerName: 'Título',    flex: 2 },
    { field: 'tipo_doc',  headerName: 'Tipo',      flex: 1, minWidth: 120 },
    {
      field: 'provisorio', headerName: 'Provisório', width: 100,
      renderCell: ({ value }) => value ? <Chip size="small" label="Prov." color="warning" /> : null,
    },
    {
      field: 'publicado', headerName: 'Publicado', width: 100,
      renderCell: ({ value }) => <Chip size="small" label={value ? 'Sim' : 'Não'} color={value ? 'success' : 'default'} />,
    },
    {
      field: '_a', headerName: '', width: 90, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => openEditDoc(row)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={() => setDeleteDocTarget(row.pk)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <ModulePage
      title="Processos Financeiros"
      subtitle="Orçamentos, contas e documentos financeiros publicados no website"
      icon={FinIcon}
      color="#607d8b"
      breadcrumbs={[{ label: 'CMS Website' }, { label: 'Processos Financeiros' }]}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Novo Processo
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

      {/* ─── Painel de Documentos do Processo ─────────────────────────────── */}
      {selected && procDetail && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              Documentos — {procDetail.titulo} ({procDetail.ano_exercicio})
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openNewDoc}>
                Adicionar Documento
              </Button>
              <Button size="small" onClick={() => setSelected(null)}>Fechar</Button>
            </Stack>
          </Stack>
          <Box sx={{ height: 300 }}>
            <DataGrid
              rows={procDetail.documentos ?? []}
              columns={docColumns}
              getRowId={(r) => r.pk}
              disableRowSelectionOnClick
              hideFooter
            />
          </Box>
        </Paper>
      )}

      {/* ─── Processo Dialog ──────────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.pk ? 'Editar Processo' : 'Novo Processo'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select label="Tipo" value={form.ts_tipo || ''} onChange={set('ts_tipo')}>
                  {tipos.map(t => <MenuItem key={t.pk} value={t.pk}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Ano de Exercício" type="number" fullWidth value={form.ano_exercicio || ''} onChange={set('ano_exercicio')} />
            </Grid>
            <Grid size={12}>
              <TextField label="Título" fullWidth required value={form.titulo} onChange={set('titulo')} />
            </Grid>
            <Grid size={12}>
              <TextField label="Descrição" fullWidth multiline rows={2} value={form.descricao || ''} onChange={set('descricao')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select label="Estado" value={form.ts_estado || 1} onChange={set('ts_estado')}>
                  {estados.map(e => <MenuItem key={e.pk} value={e.pk}>{e.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch checked={!!form.visivel} onChange={(e) => setForm(f => ({ ...f, visivel: e.target.checked }))} />}
                label="Visível no website"
              />
            </Grid>
            <Grid size={12}>
              <Button variant="outlined" component="label" startIcon={<FileIcon />} fullWidth>
                {procFile ? procFile.name : form.pk ? 'Substituir ficheiro principal' : 'Anexar ficheiro (PDF)'}
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" hidden
                  onChange={(e) => setProcFile(e.target.files[0] ?? null)} />
              </Button>
              {!procFile && form.pk && procDetail?.documentos?.[0]?.ficheiro_url && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Ficheiro actual: {procDetail.documentos[0].ficheiro_url.split('/').pop()}
                </Typography>
              )}
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

      {/* ─── Documento Dialog ─────────────────────────────────────────────── */}
      <Dialog open={docOpen} onClose={() => setDocOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{docForm.pk ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={12}>
              <TextField label="Título" fullWidth required value={docForm.titulo} onChange={setDoc('titulo')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Documento</InputLabel>
                <Select label="Tipo de Documento" value={docForm.ts_tipo_doc || ''} onChange={setDoc('ts_tipo_doc')}>
                  {docTipos.map(t => <MenuItem key={t.pk} value={t.pk}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DatePicker
                label="Data Publicação" value={docForm.data_publicacao}
                onChange={(v) => setDocForm(f => ({ ...f, data_publicacao: v }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Ordem" type="number" fullWidth value={docForm.ordem ?? 0} onChange={setDoc('ordem')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch checked={!!docForm.provisorio} onChange={(e) => setDocForm(f => ({ ...f, provisorio: e.target.checked }))} />}
                label="Provisório"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch checked={!!docForm.publicado} onChange={(e) => setDocForm(f => ({ ...f, publicado: e.target.checked }))} />}
                label="Publicado"
              />
            </Grid>
            <Grid size={12}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button variant="outlined" component="label" startIcon={<FileIcon />}>
                  {docFile ? docFile.name : 'Escolher Ficheiro'}
                  <input type="file" hidden onChange={(e) => setDocFile(e.target.files[0])} />
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!docForm.titulo || saveDocMut.isPending} onClick={() => saveDocMut.mutate(docForm)}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteDocTarget} onClose={() => setDeleteDocTarget(null)}>
        <DialogTitle>Eliminar Documento?</DialogTitle>
        <DialogContent><Typography>Esta ação é irreversível.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDocTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => deleteDocMut.mutate(deleteDocTarget)}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </ModulePage>
  );
}
