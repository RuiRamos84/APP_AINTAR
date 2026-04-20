import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, Grid, IconButton, InputLabel,
  MenuItem, Select, Switch, TextField, Tooltip, Typography, Stack,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  AttachFile as FileIcon, Gavel as PubIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import notification from '@/core/services/notification';
import {
  getPublicacoes, savePublicacao, deletePublicacao, uploadPublicacaoFile, getMetadados,
} from '../api/websiteCmsService';

const EMPTY = {
  pk: null, titulo: '', ts_tipo: '', ts_subtipo: '', numero: '', ano: new Date().getFullYear(),
  data_publicacao: null, referencia_dr: '', e_retificacao: false, ativo: true, ficheiro_url: null,
};

export default function WebsitePublicacoesPage() {
  const qc = useQueryClient();
  const [open, setOpen]           = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [file, setFile]           = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cms', 'publicacoes'],
    queryFn: getPublicacoes,
    select: (r) => r?.publicacoes ?? [],
  });

  const { data: meta } = useQuery({
    queryKey: ['cms', 'metadados'],
    queryFn: getMetadados,
    staleTime: 10 * 60 * 1000,
  });

  const tipos    = meta?.publicacao_tipos    ?? [];
  const subtipos = meta?.publicacao_subtipos ?? [];

  const saveMut = useMutation({
    mutationFn: async (data) => {
      const res = await savePublicacao(data);
      if (file && res?.pk) {
        try { await uploadPublicacaoFile(res.pk, file); } catch { /* continua */ }
      }
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'publicacoes']);
      notification.success(form.pk ? 'Publicação atualizada' : 'Publicação criada');
      setOpen(false);
    },
    onError: (e) => notification.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deletePublicacao,
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'publicacoes']);
      notification.success('Publicação eliminada');
      setDeleteTarget(null);
    },
    onError: (e) => notification.error(e.message),
  });

  const openNew  = () => { setForm(EMPTY); setFile(null); setOpen(true); };
  const openEdit = (row) => {
    setForm({ ...row, data_publicacao: row.data_publicacao ? new Date(row.data_publicacao) : null });
    setFile(null);
    setOpen(true);
  };
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const columns = [
    { field: 'titulo',        headerName: 'Título',       flex: 2, minWidth: 200 },
    { field: 'tipo',          headerName: 'Tipo',         flex: 1, minWidth: 120 },
    { field: 'numero',        headerName: 'Número',       width: 90 },
    { field: 'ano',           headerName: 'Ano',          width: 80 },
    {
      field: 'data_publicacao', headerName: 'Publicação', width: 120,
      renderCell: ({ value }) => value ? new Date(value).toLocaleDateString('pt-PT') : '—',
    },
    {
      field: 'ativo', headerName: 'Ativo', width: 90,
      renderCell: ({ value }) => <Chip size="small" label={value ? 'Sim' : 'Não'} color={value ? 'success' : 'default'} />,
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
      title="Publicações"
      subtitle="Editais, regulamentos publicados no Diário da República e outros documentos oficiais"
      icon={PubIcon}
      color="#9c27b0"
      breadcrumbs={[{ label: 'CMS Website' }, { label: 'Publicações' }]}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Nova Publicação
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
        <DialogTitle>{form.pk ? 'Editar Publicação' : 'Nova Publicação'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={12}>
              <TextField label="Título" fullWidth required value={form.titulo} onChange={set('titulo')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select label="Tipo" value={form.ts_tipo || ''} onChange={set('ts_tipo')}>
                  {tipos.map(t => <MenuItem key={t.pk} value={t.pk}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Subtipo</InputLabel>
                <Select label="Subtipo" value={form.ts_subtipo || ''} onChange={set('ts_subtipo')}>
                  <MenuItem value="">—</MenuItem>
                  {subtipos.map(s => <MenuItem key={s.pk} value={s.pk}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Número" fullWidth value={form.numero || ''} onChange={set('numero')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Ano" type="number" fullWidth value={form.ano || ''} onChange={set('ano')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <DatePicker
                label="Data Publicação" value={form.data_publicacao}
                onChange={(v) => setForm(f => ({ ...f, data_publicacao: v }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid size={12}>
              <TextField label="Referência DR" fullWidth value={form.referencia_dr || ''} onChange={set('referencia_dr')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={<Switch checked={!!form.e_retificacao} onChange={(e) => setForm(f => ({ ...f, e_retificacao: e.target.checked }))} />}
                label="É retificação"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
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
        <DialogTitle>Eliminar Publicação?</DialogTitle>
        <DialogContent>
          <Typography>Esta ação é irreversível.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => deleteMut.mutate(deleteTarget)}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </ModulePage>
  );
}
