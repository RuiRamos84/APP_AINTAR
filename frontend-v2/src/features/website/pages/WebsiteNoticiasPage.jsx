import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, FormControlLabel, Grid, IconButton, InputLabel,
  MenuItem, Select, Switch, TextField, Tooltip, Typography, Stack,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  Newspaper as NewsIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import notification from '@/core/services/notification';
import {
  getNoticias, saveNoticia, deleteNoticia, getMetadados,
} from '../api/websiteCmsService';
import NoticiasImagePanel from '../NoticiasImagePanel';

// ─── Estado lookup ────────────────────────────────────────────────────────────

const ESTADO_COLOR = { 1: 'default', 2: 'success', 3: 'warning' };
const ESTADO_LABEL = { 1: 'Rascunho', 2: 'Publicado', 3: 'Arquivado' };

// ─── Form defaults ────────────────────────────────────────────────────────────

const EMPTY = {
  pk: null, titulo: '', resumo: '', conteudo_html: '',
  ts_categoria: '', ts_estado: 1, destaque: false, data_publicacao: null,
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function WebsiteNoticiasPage() {
  const qc = useQueryClient();
  const [open, setOpen]         = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [savedPk, setSavedPk]   = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cms', 'noticias'],
    queryFn: getNoticias,
    select: (r) => r?.noticias ?? [],
  });

  const { data: meta } = useQuery({
    queryKey: ['cms', 'metadados'],
    queryFn: getMetadados,
    staleTime: 10 * 60 * 1000,
  });

  const categorias = meta?.noticia_categorias ?? [];

  const saveMut = useMutation({
    mutationFn: saveNoticia,
    onSuccess: (res) => {
      qc.invalidateQueries(['cms', 'noticias']);
      notification.success(form.pk ? 'Notícia atualizada' : 'Notícia criada');
      setOpen(false);
      setForm(EMPTY);
      setSavedPk(null);
    },
    onError: (e) => notification.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteNoticia,
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'noticias']);
      notification.success('Notícia eliminada');
      setDeleteTarget(null);
    },
    onError: (e) => notification.error(e.message),
  });

  const openNew  = () => { setForm(EMPTY); setSavedPk(null); setOpen(true); };
  const openEdit = (row) => {
    setForm({
      ...EMPTY,
      ...row,
      data_publicacao: row.data_publicacao ? new Date(row.data_publicacao) : null
    });
    setSavedPk(row.pk);
    setOpen(true);
  };
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const columns = [
    { field: 'titulo',    headerName: 'Título',     flex: 2, minWidth: 200 },
    { field: 'categoria', headerName: 'Categoria',  flex: 1, minWidth: 120 },
    {
      field: 'ts_estado', headerName: 'Estado', width: 120,
      renderCell: ({ value }) => (
        <Chip size="small" label={ESTADO_LABEL[value] ?? value} color={ESTADO_COLOR[value] ?? 'default'} />
      ),
    },
    {
      field: 'destaque', headerName: 'Destaque', width: 90,
      renderCell: ({ value }) => value ? <Chip size="small" label="★" color="warning" /> : null,
    },
    {
      field: 'data_publicacao', headerName: 'Publicação', width: 130,
      renderCell: ({ value }) => value ? new Date(value).toLocaleDateString('pt-PT') : '—',
    },
    {
      field: '_actions', headerName: '', width: 90, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
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

  return (
    <ModulePage
      title="Notícias do Website"
      subtitle="Gerir artigos e notícias publicadas no website público"
      icon={NewsIcon}
      color="#2196f3"
      breadcrumbs={[{ label: 'CMS Website' }, { label: 'Notícias' }]}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Nova Notícia
        </Button>
      }
    >
      <Box sx={{ height: 520 }}>
        <DataGrid
          rows={data ?? []}
          columns={columns}
          loading={isLoading}
          getRowId={(r) => r.pk}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>

      {/* ─── Form Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{form.pk ? 'Editar Notícia' : 'Nova Notícia'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={12}>
              <TextField label="Título" fullWidth required value={form.titulo || ''} onChange={set('titulo')} />
            </Grid>
            <Grid size={12}>
              <TextField label="Resumo" fullWidth multiline rows={2} value={form.resumo || ''} onChange={set('resumo')} />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Conteúdo (HTML)" fullWidth multiline rows={6}
                value={form.conteudo_html || ''} onChange={set('conteudo_html')}
                helperText="Aceita HTML básico: <p>, <b>, <ul>, <li>, <a>, etc."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select label="Categoria" value={form.ts_categoria} onChange={set('ts_categoria')}>
                  {categorias.map(c => <MenuItem key={c.pk} value={c.pk}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select label="Estado" value={form.ts_estado} onChange={set('ts_estado')}>
                  <MenuItem value={1}>Rascunho</MenuItem>
                  <MenuItem value={2}>Publicado</MenuItem>
                  <MenuItem value={3}>Arquivado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DatePicker
                label="Data de Publicação" value={form.data_publicacao}
                onChange={(v) => setForm(f => ({ ...f, data_publicacao: v }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch checked={!!form.destaque} onChange={(e) => setForm(f => ({ ...f, destaque: e.target.checked }))} />}
                label="Notícia em destaque"
              />
            </Grid>
            {(form.pk || savedPk) && (
              <>
                <Grid size={12}><Divider><Typography variant="caption" color="text.secondary">Imagens</Typography></Divider></Grid>
                <Grid size={12}>
                  <NoticiasImagePanel noticiaId={form.pk ?? savedPk} />
                </Grid>
              </>
            )}
            {!form.pk && !savedPk && (
              <Grid size={12}>
                <Typography variant="caption" color="text.secondary">
                  Guarda a notícia para adicionar imagens.
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!form.titulo || saveMut.isPending}
            onClick={() => saveMut.mutate(form)}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Delete Confirm ───────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Eliminar Notícia?</DialogTitle>
        <DialogContent>
          <Typography>Esta ação é irreversível. A notícia e a imagem associada serão eliminadas.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => deleteMut.mutate(deleteTarget)}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </ModulePage>
  );
}
