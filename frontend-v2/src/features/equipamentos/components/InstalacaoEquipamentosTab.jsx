/**
 * InstalacaoEquipamentosTab
 * Tab de equipamentos para usar dentro de InstalacaoPage (ETAR/EE).
 *
 * Funcionalidades:
 *  - Lista equipamentos ativos na instalação
 *  - Alocar equipamento existente à instalação
 *  - Realocar equipamento (armazém / reparação)
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Tooltip, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Grid, CircularProgress,
  Typography, Skeleton, Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  SwapHoriz as ReallocarIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import * as svc from '../services/equipamentoService';

// ─── Dialog: Alocar equipamento à instalação ──────────────────────────

function AlocarDialog({
  open, onClose, onSubmit,
  instalacaoPk, meta,
  allEquipamentos,
}) {
  const { localizacoes = [], alocTipos = [], alocInstalacaoPk } = meta || {};
  const ALOC_ID = alocInstalacaoPk ?? 1;

  const {
    control, handleSubmit, reset,
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: {
      equipamentoPk: '',
      localizacaoId: '',
      startDate: new Date().toISOString().split('T')[0],
      memo: '',
    },
  });

  useEffect(() => {
    if (open) reset({
      equipamentoPk: '',
      localizacaoId: '',
      startDate: new Date().toISOString().split('T')[0],
      memo: '',
    });
  }, [open, reset]);

  const handleFormSubmit = async (values) => {
    await onSubmit({
      equipamentoPk: values.equipamentoPk,
      data: {
        alocTipoId: ALOC_ID,
        instalacaoId: instalacaoPk,
        localizacaoId: values.localizacaoId,
        startDate: values.startDate,
        memo: values.memo || null,
      },
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BuildIcon fontSize="small" color="primary" />
        Alocar Equipamento
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Selecionar equipamento */}
            <Grid size={12}>
              <Controller
                name="equipamentoPk"
                control={control}
                rules={{ required: 'Selecione um equipamento' }}
                render={({ field }) => (
                  <TextField
                    {...field} select fullWidth
                    label="Equipamento *" size="small"
                    error={!!errors.equipamentoPk}
                    helperText={errors.equipamentoPk?.message}
                  >
                    {allEquipamentos.map((eq) => (
                      <MenuItem key={eq.id} value={eq.id}>
                        <Box>
                          <Typography variant="body2">
                            {eq.marca} {eq.modelo}
                          </Typography>
                          {eq.serial && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              S/N: {eq.serial}
                            </Typography>
                          )}
                          {eq.estado && (
                            <Typography
                              variant="caption"
                              color="warning.main"
                              sx={{ ml: 1 }}
                            >
                              • {eq.estado}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Localização na instalação */}
            <Grid size={12}>
              <Controller
                name="localizacaoId"
                control={control}
                rules={{ required: 'Localização obrigatória' }}
                render={({ field }) => (
                  <TextField
                    {...field} select fullWidth
                    label="Localização na Instalação *" size="small"
                    error={!!errors.localizacaoId}
                    helperText={errors.localizacaoId?.message}
                  >
                    {localizacoes.map((l) => (
                      <MenuItem key={l.pk} value={l.pk}>
                        {l.value}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Data de entrada */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="startDate"
                control={control}
                rules={{ required: 'Data obrigatória' }}
                render={({ field }) => (
                  <TextField
                    {...field} fullWidth type="date"
                    label="Data de Entrada *" size="small"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.startDate}
                    helperText={errors.startDate?.message}
                  />
                )}
              />
            </Grid>

            {/* Observações */}
            <Grid size={12}>
              <Controller
                name="memo"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field} fullWidth label="Observações"
                    size="small" multiline rows={2}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="submit" variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting
              ? <CircularProgress size={16} />
              : <AddIcon />
            }
          >
            Alocar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ─── Dialog: Realocar (armazém / reparação) ────────────────────────────

const DESTINOS_LABEL = {
  2: 'Armazém',
  3: 'Reparação',
};

function ReallocarDialog({ open, onClose, onSubmit, equipamento, meta }) {
  const { alocTipos = [] } = meta || {};
  // Exclui "Instalação" — não faz sentido realocar para instalação aqui
  const destinos = alocTipos.filter((t) => t.value !== 'Instalação');

  const {
    control, handleSubmit, reset,
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: { alocTipoId: '', data: '', memo: '' },
  });

  useEffect(() => {
    if (open) reset({
      alocTipoId: '',
      data: new Date().toISOString().split('T')[0],
      memo: '',
    });
  }, [open, reset]);

  const handleFormSubmit = async (values) => {
    await onSubmit({
      equipamentoPk: equipamento.id,
      data: {
        alocTipoId: values.alocTipoId,
        data: values.data,
        memo: values.memo || null,
      },
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ReallocarIcon fontSize="small" color="warning" />
        Realocar Equipamento
      </DialogTitle>
      {equipamento && (
        <Box sx={{ px: 3, pb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {equipamento.marca} {equipamento.modelo}
            {equipamento.serial ? ` • S/N: ${equipamento.serial}` : ''}
          </Typography>
        </Box>
      )}
      <Divider />
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <Controller
                name="alocTipoId"
                control={control}
                rules={{ required: 'Destino obrigatório' }}
                render={({ field }) => (
                  <TextField
                    {...field} select fullWidth
                    label="Destino *" size="small"
                    error={!!errors.alocTipoId}
                    helperText={errors.alocTipoId?.message}
                  >
                    {destinos.map((t) => (
                      <MenuItem key={t.pk} value={t.pk}>
                        {t.value}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={12}>
              <Controller
                name="data"
                control={control}
                rules={{ required: 'Data obrigatória' }}
                render={({ field }) => (
                  <TextField
                    {...field} fullWidth type="date"
                    label="Data de Saída *" size="small"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.data}
                    helperText={errors.data?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={12}>
              <Controller
                name="memo"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field} fullWidth label="Motivo / Observações"
                    size="small" multiline rows={2}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="submit" variant="contained" color="warning"
            disabled={isSubmitting}
            startIcon={isSubmitting
              ? <CircularProgress size={16} />
              : <ReallocarIcon />
            }
          >
            Realocar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ─── Tab principal ─────────────────────────────────────────────────────

const CHIP_COLOR = {
  Instalação: 'success',
  Armazém: 'default',
  Reparação: 'warning',
};

export default function InstalacaoEquipamentosTab({
  pk,
  meta,
  canEdit,
}) {
  const [equipamentos, setEquipamentos] = useState([]);
  const [allEquipamentos, setAllEquipamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alocarOpen, setAlocarOpen] = useState(false);
  const [reallocarTarget, setReallocarTarget] = useState(null);

  const load = useCallback(async () => {
    if (!pk) return;
    setLoading(true);
    try {
      const list = await svc.getEquipamentosByInstalacao(pk);
      setEquipamentos(list);
    } catch {
      toast.error('Erro ao carregar equipamentos da instalação');
    } finally {
      setLoading(false);
    }
  }, [pk]);

  // Carrega catálogo completo para o picker (sempre atualizado ao abrir dialog)
  const loadAll = useCallback(async () => {
    try {
      const { equipamentos: all } = await svc.getEquipamentos();
      // Apenas equipamentos disponíveis (não instalados noutro local)
      setAllEquipamentos(all.filter((eq) => eq.estado !== 'Instalação'));
    } catch {
      toast.error('Erro ao carregar catálogo de equipamentos');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAlocar = async ({ equipamentoPk, data }) => {
    try {
      await svc.createAloc(equipamentoPk, data);
      toast.success('Equipamento alocado com sucesso');
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message
        || 'Erro ao alocar equipamento';
      toast.error(msg);
      throw err;
    }
  };

  const handleReallocar = async ({ equipamentoPk, data }) => {
    try {
      await svc.reallocarEquipamento(equipamentoPk, data);
      toast.success('Equipamento realocado com sucesso');
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message
        || 'Erro ao realocar equipamento';
      toast.error(msg);
      throw err;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 1 }}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {equipamentos.length === 0
            ? 'Sem equipamentos nesta instalação'
            : `${equipamentos.length} equipamento${equipamentos.length !== 1 ? 's' : ''}`}
        </Typography>
        {canEdit && (
          <Button
            size="small" variant="outlined" startIcon={<AddIcon />}
            onClick={() => {
              loadAll();
              setAlocarOpen(true);
            }}
          >
            Alocar Equipamento
          </Button>
        )}
      </Box>

      {equipamentos.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center', py: 6,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 1,
            color: 'text.secondary',
          }}
        >
          <BuildIcon sx={{ fontSize: 40, opacity: 0.3 }} />
          <Typography variant="body2">
            Nenhum equipamento alocado a esta instalação
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Marca / Modelo</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>N.º Série</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Localização</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Desde</TableCell>
                {canEdit && (
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Ações
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {equipamentos.map((eq) => (
                <TableRow key={eq.id} hover>
                  <TableCell>
                    <Chip
                      label={eq.tipo || '—'}
                      size="small" variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {eq.marca} {eq.modelo}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                    {eq.serial || '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={eq.localizacao || '—'}
                      size="small"
                      color={CHIP_COLOR[eq.estado] || 'default'}
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    {eq.startDate
                      ? new Date(eq.startDate).toLocaleDateString('pt-PT')
                      : '—'}
                  </TableCell>
                  {canEdit && (
                    <TableCell align="right">
                      <Tooltip title="Realocar (avaria / substituição)">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => setReallocarTarget(eq)}
                        >
                          <ReallocarIcon fontSize="small" />
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

      {/* Dialog: Alocar */}
      <AlocarDialog
        open={alocarOpen}
        onClose={() => setAlocarOpen(false)}
        onSubmit={handleAlocar}
        instalacaoPk={pk}
        meta={meta}
        allEquipamentos={allEquipamentos}
      />

      {/* Dialog: Realocar */}
      <ReallocarDialog
        open={!!reallocarTarget}
        onClose={() => setReallocarTarget(null)}
        onSubmit={handleReallocar}
        equipamento={reallocarTarget}
        meta={meta}
      />
    </Box>
  );
}
