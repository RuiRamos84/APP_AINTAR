import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, CircularProgress, Typography, Chip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import notification from '@/core/services/notification';
import * as svc from '../services/equipamentoService';

function RepairForm({ open, onClose, onSubmit, repair }) {
  const { control, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm({
    defaultValues: { data: '', valor: '', memo: '' },
  });

  useEffect(() => {
    if (open) {
      reset(
        repair
          ? {
              data: repair.data?.split('T')[0] ?? '',
              valor: repair.valor ?? '',
              memo: repair.memo ?? '',
            }
          : { data: new Date().toISOString().split('T')[0], valor: '', memo: '' }
      );
    }
  }, [open, repair, reset]);

  const handleFormSubmit = async (values) => {
    await onSubmit({ ...values, valor: values.valor ? parseFloat(values.valor) : null });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{repair ? 'Editar Manutenção' : 'Registar Manutenção'}</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="data"
                control={control}
                rules={{ required: 'Data obrigatória' }}
                render={({ field }) => (
                  <TextField {...field} fullWidth type="date" label="Data *"
                    size="small" InputLabelProps={{ shrink: true }}
                    error={!!errors.data} helperText={errors.data?.message} />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="valor"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth type="number" label="Custo (€)"
                    size="small" inputProps={{ min: 0, step: 0.01 }} />
                )}
              />
            </Grid>
            <Grid size={12}>
              <Controller
                name="memo"
                control={control}
                rules={{ required: 'Descrição obrigatória' }}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Descrição *" size="small"
                    multiline rows={3}
                    error={!!errors.memo} helperText={errors.memo?.message} />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}
            startIcon={isSubmitting && <CircularProgress size={16} />}>
            {repair ? 'Guardar' : 'Registar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

const formatCurrency = (val) =>
  val != null ? `${parseFloat(val).toFixed(2)} €` : '—';

export default function ManutencaoTab({ equipamento, canEdit }) {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!equipamento?.id) return;
    setLoading(true);
    try {
      const list = await svc.getRepairs(equipamento.id);
      setRepairs(list);
    } catch {
      notification.error('Erro ao carregar manutenções');
    } finally {
      setLoading(false);
    }
  }, [equipamento?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (data) => {
    try {
      if (editing) {
        await svc.updateRepair(equipamento.id, editing.id, data);
        notification.success('Manutenção atualizada');
      } else {
        await svc.createRepair(equipamento.id, data);
        notification.success('Manutenção registada');
      }
      setEditing(null);
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao guardar manutenção';
      notification.error(msg);
      throw err; // mantém o dialog aberto
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar este registo de manutenção?')) return;
    try {
      await svc.deleteRepair(equipamento.id, id);
      notification.success('Manutenção eliminada');
      load();
    } catch {
      notification.error('Erro ao eliminar manutenção');
    }
  };

  const total = repairs.reduce((sum, r) => sum + (r.valor ? parseFloat(r.valor) : 0), 0);

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {repairs.length > 0 && (
          <Chip
            label={`Total: ${total.toFixed(2)} €`}
            color="primary"
            variant="outlined"
            size="small"
          />
        )}
        {canEdit && (
          <Button size="small" variant="outlined" startIcon={<AddIcon />}
            sx={{ ml: 'auto' }}
            onClick={() => { setEditing(null); setFormOpen(true); }}>
            Registar Manutenção
          </Button>
        )}
      </Box>

      {loading ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          A carregar...
        </Typography>
      ) : repairs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Sem manutenções registadas
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Custo</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Descrição</TableCell>
                {canEdit && <TableCell align="right" sx={{ fontWeight: 600 }}>Ações</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {repairs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {r.data ? r.data.split('T')[0] : '—'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {formatCurrency(r.valor)}
                  </TableCell>
                  <TableCell>{r.memo}</TableCell>
                  {canEdit && (
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => { setEditing(r); setFormOpen(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleDelete(r.id)}>
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

      <RepairForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        repair={editing}
      />
    </Box>
  );
}
