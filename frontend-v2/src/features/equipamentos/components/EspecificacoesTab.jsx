import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Grid, CircularProgress, Typography,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import * as svc from '../services/equipamentoService';

function SpecForm({ open, onClose, onSubmit, spec, specTipos = [] }) {
  const { control, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm({
    defaultValues: { specTipoId: '', valor: '' },
  });

  useEffect(() => {
    if (open) {
      reset(spec
        ? { specTipoId: specTipos.find((t) => t.value === spec.specTipo)?.pk ?? '', valor: spec.valor ?? '' }
        : { specTipoId: '', valor: '' });
    }
  }, [open, spec, reset]);

  const handleFormSubmit = async (values) => {
    await onSubmit(values);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{spec ? 'Editar Especificação' : 'Nova Especificação'}</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <Controller
                name="specTipoId"
                control={control}
                rules={{ required: 'Tipo obrigatório' }}
                render={({ field }) => (
                  <TextField {...field} select fullWidth label="Parâmetro *" size="small"
                    error={!!errors.specTipoId} helperText={errors.specTipoId?.message}>
                    {specTipos.map((t) => (
                      <MenuItem key={t.pk} value={t.pk}>{t.value}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={12}>
              <Controller
                name="valor"
                control={control}
                rules={{ required: 'Valor obrigatório' }}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Valor *" size="small"
                    error={!!errors.valor} helperText={errors.valor?.message} />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}
            startIcon={isSubmitting && <CircularProgress size={16} />}>
            {spec ? 'Guardar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function EspecificacoesTab({ equipamento, meta, canEdit }) {
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!equipamento?.id) return;
    setLoading(true);
    try {
      const list = await svc.getSpecs(equipamento.id);
      setSpecs(list);
    } catch {
      toast.error('Erro ao carregar especificações');
    } finally {
      setLoading(false);
    }
  }, [equipamento?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (data) => {
    try {
      if (editing) {
        await svc.updateSpec(equipamento.id, editing.id, data);
        toast.success('Especificação atualizada');
      } else {
        await svc.createSpec(equipamento.id, data);
        toast.success('Especificação adicionada');
      }
      setEditing(null);
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao guardar especificação';
      toast.error(msg);
      throw err; // mantém o dialog aberto
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar esta especificação?')) return;
    try {
      await svc.deleteSpec(equipamento.id, id);
      toast.success('Especificação eliminada');
      load();
    } catch {
      toast.error('Erro ao eliminar especificação');
    }
  };

  return (
    <Box>
      {canEdit && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" variant="outlined" startIcon={<AddIcon />}
            onClick={() => { setEditing(null); setFormOpen(true); }}>
            Nova Especificação
          </Button>
        </Box>
      )}

      {loading ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          A carregar...
        </Typography>
      ) : specs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Sem especificações registadas
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Parâmetro</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Valor</TableCell>
                {canEdit && <TableCell align="right" sx={{ fontWeight: 600 }}>Ações</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {specs.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.specTipo || '—'}</TableCell>
                  <TableCell>{s.valor}</TableCell>
                  {canEdit && (
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => { setEditing(s); setFormOpen(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleDelete(s.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <SpecForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        spec={editing}
        specTipos={meta?.specs ?? []}
      />
    </Box>
  );
}
