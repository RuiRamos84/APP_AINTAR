import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, Grid, IconButton, InputLabel,
  MenuItem, Select, Switch, TextField, Tooltip, Typography, Stack,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  AttachFile as FileIcon, FolderOpen as DocIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import notification from '@/core/services/notification';
import {
  getDocumentos, saveDocumento, deleteDocumento, uploadDocumentoFile, getMetadados,
} from '../api/websiteCmsService';

const EMPTY = {
  pk: null, titulo: '', descricao: '', ts_categoria: '', subcategoria: '',
  ano: new Date().getFullYear(), ordem: 0, ativo: true, ficheiro_url: null,
};

export default function WebsiteDocumentosPage() {
  const qc = useQueryClient();
  const [open, setOpen]           = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [file, setFile]           = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cms', 'documentos'],
    queryFn: getDocumentos,
    select: (r) => r?.documentos ?? [],
  });

  const { data: meta } = useQuery({
    queryKey: ['cms', 'metadados'],
    queryFn: getMetadados,
    staleTime: 10 * 60 * 1000,
  });

  const categorias = meta?.documento_categorias ?? [];

  const saveMut = useMutation({
    mutationFn: async (data) => {
      const res = await saveDocumento(data);
      if (file && res?.pk) {
        try { await uploadDocumentoFile(res.pk, file); } catch { /* continua */ }
      }
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'documentos']);
      notification.success(form.pk ? 'Documento atualizado' : 'Documento criado');
      setOpen(false);
    },
    onError: (e) => notification.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDocumento,
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'documentos']);
      notification.success('Documento eliminado');
      setDeleteTarget(null);
    },
    onError: (e) => notification.error(e.message),
  });

  const openNew  = () => { setForm(EMPTY); setFile(null); setOpen(true); };
  const openEdit = (row) => { setForm({ ...row }); setFile(null); setOpen(true); };
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const columns = [
    { field: 'titulo',      headerName: 'Título',     flex: 2, minWidth: 200 },
    { field: 'categoria',   headerName: 'Categoria',  flex: 1, minWidth: 140 },
    { field: 'subcategoria',headerName: 'Subcategoria', flex: 1, minWidth: 120 },
    { field: 'ano',         headerName: 'Ano',        width: 80 },
    {
      field: 'ativo', headerName: 'Ativo', width: 90,
      renderCell: ({ value }) => <Chip size="small" label={value ? 'Sim' : 'Não'} color={value ? 'success' : 'default'} />,
    },
    {
      field: 'ficheiro_url', headerName: 'Ficheiro', width: 90,
      renderCell: ({ value }) => value ? <FileIcon fontSize="small" color="primary" /> : null,
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
      title="Documentos do Website"
      subtitle="Tarifários, regulamentos, formulários e outros documentos públicos"
      icon={DocIcon}
      color="#4caf50"
      breadcrumbs={[{ label: 'CMS Website' }, { label: 'Documentos' }]}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Novo Documento
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

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.pk ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={12}>
              <TextField label="Título" fullWidth required value={form.titulo} onChange={set('titulo')} />
            </Grid>
            <Grid size={12}>
              <TextField label="Descrição" fullWidth multiline rows={2} value={form.descricao || ''} onChange={set('descricao')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select label="Categoria" value={form.ts_categoria || ''} onChange={set('ts_categoria')}>
                  {categorias.map(c => <MenuItem key={c.pk} value={c.pk}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Subcategoria" fullWidth value={form.subcategoria || ''} onChange={set('subcategoria')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Ano" type="number" fullWidth value={form.ano || ''} onChange={set('ano')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Ordem" type="number" fullWidth value={form.ordem ?? 0} onChange={set('ordem')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch checked={!!form.ativo} onChange={(e) => setForm(f => ({ ...f, ativo: e.target.checked }))} />}
                label="Ativo"
              />
            </Grid>
            <Grid size={12}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button variant="outlined" component="label" startIcon={<FileIcon />}>
                  {file ? file.name : 'Escolher Ficheiro'}
                  <input type="file" hidden onChange={(e) => setFile(e.target.files[0])} />
                </Button>
                {form.ficheiro_url && !file && (
                  <Typography variant="caption" color="text.secondary">Atual: {form.ficheiro_url}</Typography>
                )}
              </Stack>
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

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Eliminar Documento?</DialogTitle>
        <DialogContent>
          <Typography>Esta ação é irreversível. O ficheiro associado também será eliminado.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => deleteMut.mutate(deleteTarget)}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </ModulePage>
  );
}
