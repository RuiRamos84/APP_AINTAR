/**
 * EquipamentoModule
 * Módulo reutilizável para gestão de equipamentos instalados.
 * Pode ser usado como página standalone ou como tab em ETAR/EE.
 */
import { useState } from 'react';
import {
  Box, Button, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Grid,
  Typography, LinearProgress, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Close as CloseIcon, Build as BuildIcon, AttachFile as FileIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import { useMetaData } from '@/core/hooks/useMetaData';
import { useEquipamentosByInstalacao, useEquipamentoMutations } from '../hooks/useEquipamento';

const toDate = (str) => {
  if (!str) return null;
  const d = new Date(str.includes('T') ? str : str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (str) => {
  const d = toDate(str);
  return d ? d.toLocaleDateString('pt-PT') : '—';
};

const EMPTY_FORM = {
  tt_equiptipo: '',
  tt_equiplocalizacao: '',
  marca: '',
  modelo: '',
  serial: '',
  start_date: null,
  file_manual: null,
  file_specs: null,
  file_esquemas: null,
};

const FileInput = ({ label, value, onChange }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
      {label}
    </Typography>
    <Button
      component="label"
      variant="outlined"
      size="small"
      startIcon={<FileIcon />}
      sx={{ textTransform: 'none', width: '100%', justifyContent: 'flex-start' }}
    >
      {value ? value.name : 'Selecionar ficheiro (PDF / imagem)'}
      <input
        type="file"
        hidden
        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
        onChange={(e) => onChange(e.target.files[0] || null)}
      />
    </Button>
    {value && (
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 0.5 }}>
        <Chip label={value.name} size="small" onDelete={() => onChange(null)} />
      </Box>
    )}
  </Box>
);

const EquipamentoModal = ({ open, onClose, initialData, tbInstalacao, equipTypes, equipLocs, onSave, isSaving }) => {
  const isEdit = !!initialData?.pk;
  const [form, setForm] = useState(isEdit ? {
    tt_equiptipo: initialData.tt_equiptipo ?? '',
    tt_equiplocalizacao: initialData.tt_equiplocalizacao ?? '',
    marca: initialData.marca ?? '',
    modelo: initialData.modelo ?? '',
    serial: initialData.serial ?? '',
    start_date: toDate(initialData.start_date),
    file_manual: null,
    file_specs: null,
    file_esquemas: null,
  } : { ...EMPTY_FORM });

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('tb_instalacao', tbInstalacao);
    fd.append('tt_equiptipo', form.tt_equiptipo);
    fd.append('tt_equiplocalizacao', form.tt_equiplocalizacao);
    if (form.marca) fd.append('marca', form.marca);
    if (form.modelo) fd.append('modelo', form.modelo);
    if (form.serial) fd.append('serial', form.serial);
    if (form.start_date) fd.append('start_date', format(form.start_date, 'yyyy-MM-dd'));
    if (form.file_manual) fd.append('file_manual', form.file_manual);
    if (form.file_specs) fd.append('file_specs', form.file_specs);
    if (form.file_esquemas) fd.append('file_esquemas', form.file_esquemas);
    await onSave(isEdit ? { pk: initialData.pk, formData: fd } : fd);
    onClose();
  };

  return (
    <Dialog open={open} onClose={isSaving ? undefined : onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BuildIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              {isEdit ? 'Editar Equipamento' : 'Novo Equipamento'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" disabled={isSaving}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        {isSaving && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />}
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            {/* Tipo de equipamento */}
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth size="small" label="Tipo de Equipamento *"
                value={form.tt_equiptipo} onChange={(e) => set('tt_equiptipo', e.target.value)}
                required
              >
                <MenuItem value=""><em>— Selecionar —</em></MenuItem>
                {equipTypes.map((t) => (
                  <MenuItem key={t.pk} value={t.pk}>{t.nome || t.name || t.descricao}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Localização */}
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth size="small" label="Localização *"
                value={form.tt_equiplocalizacao} onChange={(e) => set('tt_equiplocalizacao', e.target.value)}
                required
              >
                <MenuItem value=""><em>— Selecionar —</em></MenuItem>
                {equipLocs.map((l) => (
                  <MenuItem key={l.pk} value={l.pk}>{l.nome || l.name || l.descricao}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Marca */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Marca"
                value={form.marca} onChange={(e) => set('marca', e.target.value)}
              />
            </Grid>

            {/* Modelo */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Modelo"
                value={form.modelo} onChange={(e) => set('modelo', e.target.value)}
              />
            </Grid>

            {/* Serial */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Nº de Série"
                value={form.serial} onChange={(e) => set('serial', e.target.value)}
              />
            </Grid>

            {/* Data de início */}
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Data de Instalação"
                value={form.start_date}
                onChange={(d) => set('start_date', d)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>

            {/* Ficheiros */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, mt: 0.5 }}>
                Documentos (opcional)
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FileInput label="Manual" value={form.file_manual} onChange={(f) => set('file_manual', f)} />
            </Grid>
            <Grid item xs={12}>
              <FileInput label="Ficha Técnica" value={form.file_specs} onChange={(f) => set('file_specs', f)} />
            </Grid>
            <Grid item xs={12}>
              <FileInput label="Esquemas" value={form.file_esquemas} onChange={(f) => set('file_esquemas', f)} />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={isSaving}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSaving} startIcon={<AddIcon />}>
            {isEdit ? 'Guardar' : 'Registar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

/**
 * @param {number|null} tbInstalacao - PK da instalação selecionada (obrigatório para filtrar)
 * @param {string}      color        - Cor do tema (opcional)
 */
const EquipamentoModule = ({ tbInstalacao, color = '#0097a7' }) => {
  const { data: meta } = useMetaData();
  const equipTypes = meta?.equiptipo || [];
  const equipLocs = meta?.equiplocalizacao || [];

  const { data: rawData, isLoading } = useEquipamentosByInstalacao(tbInstalacao);
  const rows = rawData?.equipamentos || [];

  const { create, isCreating, update, isUpdating, remove } = useEquipamentoMutations(tbInstalacao);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const getLabel = (list, pk, fallback = '—') => {
    const item = list.find((i) => i.pk === pk || i.pk === Number(pk));
    return item ? (item.nome || item.name || item.descricao || fallback) : fallback;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Equipamentos Instalados
        </Typography>
        <Button
          variant="contained" size="small" startIcon={<AddIcon />}
          disabled={!tbInstalacao}
          onClick={() => { setEditing(null); setModalOpen(true); }}
          sx={{ bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(0.9)' } }}
        >
          Adicionar
        </Button>
      </Box>

      {!tbInstalacao ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" variant="body2">
            Selecione uma instalação para ver os equipamentos.
          </Typography>
        </Box>
      ) : isLoading ? (
        <LinearProgress />
      ) : rows.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" variant="body2">
            Nenhum equipamento registado.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                <TableCell>Tipo</TableCell>
                <TableCell>Localização</TableCell>
                <TableCell>Marca</TableCell>
                <TableCell>Modelo</TableCell>
                <TableCell>Nº Série</TableCell>
                <TableCell>Instalação</TableCell>
                <TableCell>Docs</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.pk} hover>
                  <TableCell>{getLabel(equipTypes, row.tt_equiptipo)}</TableCell>
                  <TableCell>{getLabel(equipLocs, row.tt_equiplocalizacao)}</TableCell>
                  <TableCell>{row.marca || '—'}</TableCell>
                  <TableCell>{row.modelo || '—'}</TableCell>
                  <TableCell>{row.serial || '—'}</TableCell>
                  <TableCell>
                    {row.start_date ? (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <CalendarIcon fontSize="inherit" sx={{ color: 'text.secondary' }} />
                        <Typography variant="caption">{formatDate(row.start_date)}</Typography>
                      </Stack>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {row.file_manual && <Chip label="Manual" size="small" variant="outlined" />}
                      {row.file_specs && <Chip label="Ficha" size="small" variant="outlined" />}
                      {row.file_esquemas && <Chip label="Esquemas" size="small" variant="outlined" />}
                      {!row.file_manual && !row.file_specs && !row.file_esquemas && (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => { setEditing(row); setModalOpen(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => setConfirmDelete(row)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal criar/editar */}
      {modalOpen && (
        <EquipamentoModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          initialData={editing}
          tbInstalacao={tbInstalacao}
          equipTypes={equipTypes}
          equipLocs={equipLocs}
          onSave={editing ? update : create}
          isSaving={isCreating || isUpdating}
        />
      )}

      {/* Confirmação de eliminação */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar eliminação</DialogTitle>
        <DialogContent>
          <Typography>
            Tem a certeza que pretende eliminar este equipamento? Esta ação não pode ser revertida.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} color="inherit">Cancelar</Button>
          <Button
            color="error" variant="contained"
            onClick={async () => {
              await remove(confirmDelete.pk);
              setConfirmDelete(null);
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EquipamentoModule;
