import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Grid, CircularProgress,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import * as svc from '../services/equipamentoService';

const ALOC_COLORS = {
  Instalação: 'success',
  Armazém: 'default',
  Reparação: 'warning',
};

function AlocForm({ open, onClose, onSubmit, aloc, meta }) {
  const { alocTipos = [], instalacoes = [], localizacoes = [], clientes = [], alocInstalacaoPk } = meta || {};

  const { control, handleSubmit, watch, reset, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
      alocTipoId: '',
      instalacaoId: '',
      localizacaoId: '',
      clientId: '',
      startDate: new Date().toISOString().split('T')[0],
      stopDate: '',
      memo: '',
      ord: 1,
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        aloc
          ? {
              alocTipoId: alocTipos.find((t) => t.value === aloc.alocTipo)?.pk ?? '',
              instalacaoId: aloc.instalacaoId ?? '',
              localizacaoId: localizacoes.find((l) => l.value === aloc.localizacao)?.pk ?? '',
              clientId: clientes.find((c) => c.name === aloc.client)?.pk ?? '',
              startDate: aloc.startDate?.split('T')[0] ?? '',
              stopDate: aloc.stopDate?.split('T')[0] ?? '',
              memo: aloc.memo ?? '',
              ord: aloc.ord ?? 1,
            }
          : {
              alocTipoId: '',
              instalacaoId: '',
              localizacaoId: '',
              clientId: '',
              startDate: new Date().toISOString().split('T')[0],
              stopDate: '',
              memo: '',
              ord: 1,
            }
      );
    }
  }, [open, aloc, reset]);

  const selectedAlocId = watch('alocTipoId');
  const isInstalacao = selectedAlocId === alocInstalacaoPk;

  const handleFormSubmit = async (values) => {
    await onSubmit(values);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{aloc ? 'Editar Alocação' : 'Nova Alocação'}</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <Controller
                name="alocTipoId"
                control={control}
                rules={{ required: 'Tipo obrigatório' }}
                render={({ field }) => (
                  <TextField {...field} select fullWidth label="Tipo de Alocação *" size="small"
                    error={!!errors.alocTipoId} helperText={errors.alocTipoId?.message}>
                    {alocTipos.map((t) => (
                      <MenuItem key={t.pk} value={t.pk}>{t.value}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {isInstalacao && (
              <>
                <Grid size={12}>
                  <Controller
                    name="instalacaoId"
                    control={control}
                    rules={{ required: isInstalacao ? 'Instalação obrigatória' : false }}
                    render={({ field }) => (
                      <TextField {...field} select fullWidth label="Instalação *" size="small"
                        error={!!errors.instalacaoId} helperText={errors.instalacaoId?.message}>
                        {instalacoes.map((i) => (
                          <MenuItem key={i.pk} value={i.pk}>{i.nome}</MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid size={12}>
                  <Controller
                    name="localizacaoId"
                    control={control}
                    rules={{ required: isInstalacao ? 'Localização obrigatória' : false }}
                    render={({ field }) => (
                      <TextField {...field} select fullWidth label="Localização na Instalação *" size="small"
                        error={!!errors.localizacaoId} helperText={errors.localizacaoId?.message}>
                        {localizacoes.map((l) => (
                          <MenuItem key={l.pk} value={l.pk}>{l.value}</MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
              </>
            )}

            {clientes.length > 0 && (
              <Grid size={12}>
                <Controller
                  name="clientId"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select fullWidth label="Cliente" size="small">
                      <MenuItem value=""><em>— Sem cliente —</em></MenuItem>
                      {clientes.map((c) => (
                        <MenuItem key={c.pk} value={c.pk}>{c.name}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="startDate"
                control={control}
                rules={{ required: 'Data de início obrigatória' }}
                render={({ field }) => (
                  <TextField {...field} fullWidth type="date" label="Data Início *"
                    size="small" InputLabelProps={{ shrink: true }}
                    error={!!errors.startDate} helperText={errors.startDate?.message} />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="stopDate"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth type="date" label="Data Fim"
                    size="small" InputLabelProps={{ shrink: true }} />
                )}
              />
            </Grid>
            <Grid size={12}>
              <Controller
                name="memo"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Observações" size="small" multiline rows={2} />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}
            startIcon={isSubmitting && <CircularProgress size={16} />}>
            {aloc ? 'Guardar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function AlocacaoTab({ equipamento, meta, canEdit, onAlocChange }) {
  const [alocacoes, setAlocacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!equipamento?.id) return;
    setLoading(true);
    try {
      const list = await svc.getAloc(equipamento.id);
      setAlocacoes([...list].sort((a, b) => b.id - a.id));
    } catch {
      toast.error('Erro ao carregar alocações');
    } finally {
      setLoading(false);
    }
  }, [equipamento?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (data) => {
    try {
      if (editing) {
        await svc.updateAloc(equipamento.id, editing.id, data);
        toast.success('Alocação atualizada');
      } else {
        await svc.createAloc(equipamento.id, data);
        toast.success('Alocação registada');
      }
      setEditing(null);
      load();
      onAlocChange?.();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao guardar alocação';
      toast.error(msg);
      throw err; // mantém o dialog aberto
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar esta alocação?')) return;
    try {
      await svc.deleteAloc(equipamento.id, id);
      toast.success('Alocação eliminada');
      load();
      onAlocChange?.();
    } catch {
      toast.error('Erro ao eliminar alocação');
    }
  };

  return (
    <Box>
      {canEdit && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" variant="outlined" startIcon={<AddIcon />}
            onClick={() => { setEditing(null); setFormOpen(true); }}>
            Nova Alocação
          </Button>
        </Box>
      )}

      {loading ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          A carregar...
        </Typography>
      ) : alocacoes.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Sem alocações registadas
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Instalação</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Localização</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Início</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Fim</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Obs.</TableCell>
                {canEdit && <TableCell align="right" sx={{ fontWeight: 600 }}>Ações</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {alocacoes.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Chip
                      label={a.alocTipo || '—'}
                      size="small"
                      color={ALOC_COLORS[a.alocTipo] || 'default'}
                    />
                  </TableCell>
                  <TableCell>{a.instalacao || '—'}</TableCell>
                  <TableCell>{a.localizacao || '—'}</TableCell>
                  <TableCell>{a.client || '—'}</TableCell>
                  <TableCell>{a.startDate ? a.startDate.split('T')[0] : '—'}</TableCell>
                  <TableCell>{a.stopDate ? a.stopDate.split('T')[0] : '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.memo || '—'}
                  </TableCell>
                  {canEdit && (
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => { setEditing(a); setFormOpen(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleDelete(a.id)}>
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

      <AlocForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        aloc={editing}
        meta={meta}
      />
    </Box>
  );
}
