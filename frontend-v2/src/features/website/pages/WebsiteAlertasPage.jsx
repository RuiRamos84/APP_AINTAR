import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, Grid, IconButton, InputLabel,
  MenuItem, Select, Switch, TextField, Tooltip, Typography, Stack,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  NotificationsActive as AlertIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import notification from '@/core/services/notification';
import { getAlertas, saveAlerta, deleteAlerta, getMetadados } from '../api/websiteCmsService';

const EMPTY = { pk: null, mensagem: '', ts_tipo: 1, ativo: true, data_inicio: null, data_fim: null };

export default function WebsiteAlertasPage() {
  const qc = useQueryClient();
  const [open, setOpen]           = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cms', 'alertas'],
    queryFn: getAlertas,
    select: (r) => r?.alertas ?? [],
  });

  const { data: meta } = useQuery({
    queryKey: ['cms', 'metadados'],
    queryFn: getMetadados,
    staleTime: 10 * 60 * 1000,
  });

  const tipos = meta?.alerta_tipos ?? [];

  const saveMut = useMutation({
    mutationFn: saveAlerta,
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'alertas']);
      notification.success(form.pk ? 'Alerta atualizado' : 'Alerta criado');
      setOpen(false);
    },
    onError: (e) => notification.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAlerta,
    onSuccess: () => {
      qc.invalidateQueries(['cms', 'alertas']);
      notification.success('Alerta eliminado');
      setDeleteTarget(null);
    },
    onError: (e) => notification.error(e.message),
  });

  const openNew  = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (row) => setForm({
    ...row,
    data_inicio: row.data_inicio ? new Date(row.data_inicio) : null,
    data_fim:    row.data_fim    ? new Date(row.data_fim)    : null,
  });
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const columns = [
    { field: 'mensagem', headerName: 'Mensagem', flex: 3, minWidth: 250 },
    { field: 'tipo',     headerName: 'Tipo',     flex: 1, minWidth: 120 },
    {
      field: 'ativo', headerName: 'Ativo', width: 100,
      renderCell: ({ value }) => <Chip size="small" label={value ? 'Ativo' : 'Inativo'} color={value ? 'success' : 'default'} />,
    },
    {
      field: 'ativo_agora', headerName: 'Agora', width: 100,
      renderCell: ({ value }) => value ? <Chip size="small" label="Visível" color="warning" /> : null,
    },
    {
      field: 'data_inicio', headerName: 'Início', width: 120,
      renderCell: ({ value }) => value ? new Date(value).toLocaleDateString('pt-PT') : '—',
    },
    {
      field: 'data_fim', headerName: 'Fim', width: 120,
      renderCell: ({ value }) => value ? new Date(value).toLocaleDateString('pt-PT') : '—',
    },
    {
      field: '_actions', headerName: '', width: 90, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => { openEdit(row); setOpen(true); }}>
              <EditIcon fontSize="small" />
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

  return (
    <ModulePage
      title="Avisos do Website"
      subtitle="Gerir banners e avisos de serviço visíveis no website público"
      icon={AlertIcon}
      color="#ff9800"
      breadcrumbs={[{ label: 'CMS Website' }, { label: 'Avisos' }]}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Novo Aviso
        </Button>
      }
    >
      <Box sx={{ height: 480 }}>
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
        <DialogTitle>{form.pk ? 'Editar Aviso' : 'Novo Aviso'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={12}>
              <TextField label="Mensagem" fullWidth required multiline rows={3} value={form.mensagem} onChange={set('mensagem')} />
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select label="Tipo" value={form.ts_tipo} onChange={set('ts_tipo')}>
                  {tipos.map(t => <MenuItem key={t.pk} value={t.pk}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DatePicker
                label="Data de Início" value={form.data_inicio}
                onChange={(v) => setForm(f => ({ ...f, data_inicio: v }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DatePicker
                label="Data de Fim" value={form.data_fim}
                onChange={(v) => setForm(f => ({ ...f, data_fim: v }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={<Switch checked={!!form.ativo} onChange={(e) => setForm(f => ({ ...f, ativo: e.target.checked }))} />}
                label="Ativo"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!form.mensagem || saveMut.isPending} onClick={() => saveMut.mutate(form)}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Eliminar Aviso?</DialogTitle>
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
