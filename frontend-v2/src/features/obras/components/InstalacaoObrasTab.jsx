/**
 * InstalacaoObrasTab — Tab de Obras para usar dentro de InstalacaoPage (ETAR/EE).
 *
 * Diferenças vs. módulo global:
 *  - Tipo de obra é automaticamente definido pelo tipo da instalação (ETAR=1, EE=2)
 *  - Instalação e associado são pré-preenchidos
 *  - Mostra apenas obras desta instalação
 *  - Inclui sub-tab de despesas de obras desta instalação
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Button, Tab, Tabs, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton,
  Tooltip, Chip, Typography, Skeleton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Grid,
  CircularProgress, Divider, InputAdornment, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Save as SaveIcon,
  Construction as ObrasIcon, Euro as EuroIcon,
  CalendarMonth as CalIcon, WarningAmber as WarningIcon,
  CheckCircle as DoneIcon, RadioButtonUnchecked as PendingIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { useMetaData } from '@/core/hooks/useMetaData';
import * as svc from '../services/obrasService';

const formatDate = (d) =>
  d ? new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('pt-PT') : '—';

const formatCurrency = (v) =>
  v != null ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v) : '—';

// vbl_obra_despesa já retorna tipoDespesaLabel (label string do JOIN).
// Fallback para lookup por pk caso a view não inclua os campos.
const lookupTipoDespesa = (d, meta) =>
  d.tipoDespesaLabel ?? meta?.despesaobra?.find((t) => t.pk === d.tipoDespesa)?.value ?? '—';
const lookupObraNome = (d, obras) =>
  d.obraNome ?? obras?.find((o) => o.id === d.obraId)?.nome ?? '—';

// Mapeamento tipo da instalação → pk tt_tipoobra
const INSTALACAO_TIPO_MAP = { etar: 1, ee: 2 };

// ─── Helper ────────────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }) {
  return (
    <Grid size={12}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 0.5 }}>
        <Icon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary" fontWeight={700}
          sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {label}
        </Typography>
        <Divider sx={{ flex: 1 }} />
      </Box>
    </Grid>
  );
}

// ─── Dialog: Obra ─────────────────────────────────────────────────────────────

function ObraDialog({ open, onClose, onSubmit, obra, tipoObraId, tipoObraLabel, instalacao, meta }) {
  const { urgencia = [] } = meta ?? {};

  const { control, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
      nome: '', urgencia: '', estado: 0,
      dataPrevista: '', dataInicio: '', dataFim: '',
      valorEstimado: '', valorAintar: '', valorSubsidio: '', valorMunicipio: '',
      aviso: '', memo: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (obra) {
      // Resolver PK de urgência a partir do label retornado pela view
      const resolvedUrgencia = urgencia.find((u) => u.value === obra.urgenciaLabel)?.code
        ?? urgencia.find((u) => u.value === obra.urgenciaLabel)?.pk ?? '';
      reset({
        nome: obra.nome ?? '',
        urgencia: resolvedUrgencia ? String(resolvedUrgencia) : '',
        estado: obra.estado ?? 0,
        dataPrevista: obra.dataPrevista ? obra.dataPrevista.split('T')[0] : '',
        dataInicio: obra.dataInicio ? obra.dataInicio.split('T')[0] : '',
        dataFim: obra.dataFim ? obra.dataFim.split('T')[0] : '',
        valorEstimado: obra.valorEstimado != null ? String(obra.valorEstimado) : '',
        valorAintar: obra.valorAintar != null ? String(obra.valorAintar) : '',
        valorSubsidio: obra.valorSubsidio != null ? String(obra.valorSubsidio) : '',
        valorMunicipio: obra.valorMunicipio != null ? String(obra.valorMunicipio) : '',
        aviso: obra.aviso ?? '',
        memo: obra.memo ?? '',
      });
    } else {
      reset({
        nome: instalacao ? `${tipoObraLabel} de ${instalacao.nome}` : '',
        urgencia: '', estado: 0,
        dataPrevista: '', dataInicio: '', dataFim: '',
        valorEstimado: '', valorAintar: '', valorSubsidio: '', valorMunicipio: '',
        aviso: '', memo: '',
      });
    }
  }, [open, obra, instalacao, tipoObraLabel, urgencia, reset]);

  const handleFormSubmit = async (values) => {
    await onSubmit({
      nome: values.nome,
      urgencia: values.urgencia || null,
      estado: Number(values.estado),
      dataPrevista: values.dataPrevista || null,
      dataInicio: values.dataInicio || null,
      dataFim: values.dataFim || null,
      valorEstimado: values.valorEstimado !== '' ? values.valorEstimado : null,
      valorAintar: values.valorAintar !== '' ? values.valorAintar : null,
      valorSubsidio: values.valorSubsidio !== '' ? values.valorSubsidio : null,
      valorMunicipio: values.valorMunicipio !== '' ? values.valorMunicipio : null,
      aviso: values.aviso || null,
      memo: values.memo || null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ObrasIcon fontSize="small" color="primary" />
        {obra ? 'Editar Obra' : 'Nova Obra'}
        <Chip label={tipoObraLabel} size="small" variant="outlined" sx={{ ml: 0.5 }} />
        {instalacao && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            {instalacao.nome}
          </Typography>
        )}
      </DialogTitle>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Grid container spacing={2}>

            {/* ── Identificação ── */}
            <SectionLabel icon={ObrasIcon} label="Identificação" />

            <Grid size={12}>
              <Controller
                name="nome"
                control={control}
                rules={{ required: 'Nome obrigatório' }}
                render={({ field }) => (
                  <TextField {...field} fullWidth size="small" label="Nome *"
                    error={!!errors.nome} helperText={errors.nome?.message} />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Urgência
              </Typography>
              <Controller
                name="urgencia"
                control={control}
                render={({ field }) => (
                  <ToggleButtonGroup
                    exclusive size="small" fullWidth
                    value={field.value}
                    onChange={(_, v) => field.onChange(v ?? '')}
                  >
                    <ToggleButton value="" sx={{ fontSize: '0.75rem', py: 0.75 }}>Nenhuma</ToggleButton>
                    {urgencia.map((u) => (
                      <ToggleButton key={u.code ?? u.pk} value={String(u.code ?? u.pk)}
                        sx={{ fontSize: '0.75rem', py: 0.75 }}>
                        {u.value}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Estado
              </Typography>
              <Controller
                name="estado"
                control={control}
                render={({ field }) => (
                  <ToggleButtonGroup
                    exclusive size="small" fullWidth
                    value={field.value}
                    onChange={(_, v) => { if (v !== null) field.onChange(v); }}
                  >
                    <ToggleButton value={0} sx={{ fontSize: '0.75rem', py: 0.75, gap: 0.5 }}>
                      <PendingIcon sx={{ fontSize: 14 }} /> Por concluir
                    </ToggleButton>
                    <ToggleButton value={1} sx={{ fontSize: '0.75rem', py: 0.75, gap: 0.5, '&.Mui-selected': { bgcolor: 'success.light', color: 'success.dark' } }}>
                      <DoneIcon sx={{ fontSize: 14 }} /> Concluído
                    </ToggleButton>
                  </ToggleButtonGroup>
                )}
              />
            </Grid>

            {/* ── Datas ── */}
            <SectionLabel icon={CalIcon} label="Datas" />

            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="dataPrevista" control={control} render={({ field }) => (
                <TextField {...field} fullWidth type="date" size="small" label="Data Prevista"
                  InputLabelProps={{ shrink: true }} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="dataInicio" control={control} render={({ field }) => (
                <TextField {...field} fullWidth type="date" size="small" label="Início"
                  InputLabelProps={{ shrink: true }} />
              )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="dataFim" control={control} render={({ field }) => (
                <TextField {...field} fullWidth type="date" size="small" label="Fim"
                  InputLabelProps={{ shrink: true }} />
              )} />
            </Grid>

            {/* ── Execução Financeira ── */}
            <SectionLabel icon={EuroIcon} label="Execução Financeira" />

            {[
              { name: 'valorEstimado', label: 'Estimado' },
              { name: 'valorAintar',   label: 'AINTAR' },
              { name: 'valorSubsidio', label: 'Subsídio' },
              { name: 'valorMunicipio',label: 'Município' },
            ].map(({ name, label }) => (
              <Grid key={name} size={{ xs: 6, sm: 3 }}>
                <Controller name={name} control={control} render={({ field }) => (
                  <TextField {...field} fullWidth type="number" size="small" label={label}
                    inputProps={{ step: '0.01', min: 0 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">€</InputAdornment> }} />
                )} />
              </Grid>
            ))}

            {/* ── Notas ── */}
            <SectionLabel icon={WarningIcon} label="Notas" />

            <Grid size={12}>
              <Controller name="aviso" control={control} render={({ field }) => (
                <TextField {...field} fullWidth size="small" label="Aviso"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} /></InputAdornment>,
                  }}
                  helperText="Ao definir um aviso, o estado é automaticamente reposto para 'Por concluir'" />
              )} />
            </Grid>

            <Grid size={12}>
              <Controller name="memo" control={control} render={({ field }) => (
                <TextField {...field} fullWidth size="small" label="Observações" multiline rows={2} />
              )} />
            </Grid>

          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : obra ? <SaveIcon /> : <AddIcon />}>
            {obra ? 'Guardar alterações' : 'Criar Obra'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ─── Dialog: Despesa ──────────────────────────────────────────────────────────

function DespesaDialog({ open, onClose, onSubmit, despesa, meta, obras }) {
  const { despesaobra = [] } = meta ?? {};
  const { control, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm({
    defaultValues: { obraId: '', tipoDespesa: '', data: '', valor: '', memo: '' },
  });

  useEffect(() => {
    if (open) {
      reset(despesa ? {
        obraId: despesa.obraId != null ? String(despesa.obraId) : '',
        tipoDespesa: despesa.tipoDespesa != null ? String(despesa.tipoDespesa) : '',
        data: despesa.data ? despesa.data.split('T')[0] : '',
        valor: despesa.valor != null ? String(despesa.valor) : '',
        memo: despesa.memo ?? '',
      } : { obraId: '', tipoDespesa: '', data: '', valor: '', memo: '' });
    }
  }, [open, despesa, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EuroIcon fontSize="small" color="primary" />
        {despesa ? 'Editar Despesa' : 'Nova Despesa de Obra'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Grid container spacing={2}>

            <SectionLabel icon={EuroIcon} label="Identificação" />

            <Grid size={12}>
              <Controller name="obraId" control={control} rules={{ required: 'Obra obrigatória' }}
                render={({ field }) => (
                  <TextField {...field} select fullWidth size="small" label="Obra *"
                    error={!!errors.obraId} helperText={errors.obraId?.message}>
                    <MenuItem value=""><em>— Selecionar —</em></MenuItem>
                    {obras.map((o) => <MenuItem key={o.id} value={String(o.id)}>{o.nome}</MenuItem>)}
                  </TextField>
                )} />
            </Grid>

            <Grid size={12}>
              <Controller name="tipoDespesa" control={control} rules={{ required: 'Tipo obrigatório' }}
                render={({ field }) => (
                  <TextField {...field} select fullWidth size="small" label="Tipo de Despesa *"
                    error={!!errors.tipoDespesa} helperText={errors.tipoDespesa?.message}>
                    <MenuItem value=""><em>— Selecionar —</em></MenuItem>
                    {despesaobra.map((d) => <MenuItem key={d.pk} value={String(d.pk)}>{d.value}</MenuItem>)}
                  </TextField>
                )} />
            </Grid>

            <SectionLabel icon={CalIcon} label="Valor e Data" />

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="valor" control={control} rules={{ required: 'Valor obrigatório' }}
                render={({ field }) => (
                  <TextField {...field} fullWidth type="number" size="small" label="Valor *"
                    inputProps={{ step: '0.01', min: 0 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">€</InputAdornment> }}
                    error={!!errors.valor} helperText={errors.valor?.message} />
                )} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="data" control={control} rules={{ required: 'Data obrigatória' }}
                render={({ field }) => (
                  <TextField {...field} fullWidth type="date" size="small" label="Data *"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.data} helperText={errors.data?.message} />
                )} />
            </Grid>

            <Grid size={12}>
              <Controller name="memo" control={control} render={({ field }) => (
                <TextField {...field} fullWidth size="small" label="Observações" multiline rows={2} />
              )} />
            </Grid>

          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : despesa ? <SaveIcon /> : <AddIcon />}>
            {despesa ? 'Guardar alterações' : 'Adicionar Despesa'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ─── Tab principal ─────────────────────────────────────────────────────────────

export default function InstalacaoObrasTab({ pk, instalacao, type, canEdit }) {
  const tipoObraId = INSTALACAO_TIPO_MAP[type] ?? 1;
  const [obras, setObras] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [obraDialog, setObraDialog] = useState(false);
  const [editObra, setEditObra] = useState(null);
  const [despesaDialog, setDespesaDialog] = useState(false);
  const [editDespesa, setEditDespesa] = useState(null);

  const { data: metaRaw } = useMetaData();
  const meta = useMemo(() => {
    if (!metaRaw) return null;
    return {
      tipoObra:    metaRaw.tipo_obra   ?? [],
      despesaobra: metaRaw.despesaobra ?? [],
      urgencia:    metaRaw.urgencia    ?? [],
      associates:  metaRaw.associates  ?? [],
      instalacao:  [...(metaRaw.etar ?? []), ...(metaRaw.ee ?? [])],
    };
  }, [metaRaw]);

  const tipoObraLabel = meta?.tipoObra?.find((t) => t.pk === tipoObraId)?.value ?? (type === 'etar' ? 'ETAR' : 'EEAR');

  const loadObras = useCallback(async () => {
    if (!pk) return;
    setLoading(true);
    try {
      const { obras: list } = await svc.getObrasByInstalacao(pk);
      setObras(list);
    } catch {
      toast.error('Erro ao carregar obras da instalação');
    } finally {
      setLoading(false);
    }
  }, [pk]);

  const loadDespesas = useCallback(async () => {
    if (!pk) return;
    try {
      const { despesas: list } = await svc.getDespesasByInstalacao(pk);
      setDespesas(list);
    } catch {
      toast.error('Erro ao carregar despesas');
    }
  }, [pk]);

  useEffect(() => {
    loadObras();
    loadDespesas();
  }, [loadObras, loadDespesas]);

  // ts_entity na instalação é o nome do associado (string), não o pk
  // Resolve para pk através da lista de associates da meta
  const resolveAssociadoPk = (entityName) => {
    if (!entityName || !meta?.associates) return null;
    return meta.associates.find((a) => a.name === entityName)?.pk ?? null;
  };

  const handleObraSubmit = async (data) => {
    // Injetar campos fixos da instalação
    const associadoPk = resolveAssociadoPk(instalacao?.ts_entity);
    const payload = {
      ...data,
      tipoObra: tipoObraId,
      instalacaoId: instalacao?.pk ?? null,
      associadoId: associadoPk,
    };
    try {
      if (editObra) {
        await svc.updateObra(editObra.id, payload);
        toast.success('Obra atualizada');
      } else {
        await svc.createObra(payload);
        toast.success('Obra criada com sucesso');
      }
      setObraDialog(false);
      setEditObra(null);
      await loadObras();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao guardar obra';
      toast.error(msg);
      throw err;
    }
  };

  const handleDespesaSubmit = async (values) => {
    try {
      if (editDespesa) {
        await svc.updateDespesa(editDespesa.id, values);
        toast.success('Despesa atualizada');
      } else {
        await svc.createDespesa(values);
        toast.success('Despesa adicionada');
      }
      setDespesaDialog(false);
      setEditDespesa(null);
      await loadDespesas();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao guardar despesa';
      toast.error(msg);
      throw err;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 1 }}>
        {[...Array(3)].map((_, i) => <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />)}
      </Box>
    );
  }

  return (
    <Box>
      {/* Sub-tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} size="small">
          <Tab label="Obras" icon={<ObrasIcon fontSize="small" />} iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600, minHeight: 40 }} />
          <Tab label="Despesas" icon={<EuroIcon fontSize="small" />} iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600, minHeight: 40 }} />
        </Tabs>
      </Box>

      {/* ── Tab 0: Obras ── */}
      {tab === 0 && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              {obras.length === 0
                ? 'Sem obras de requalificação'
                : `${obras.length} obra${obras.length !== 1 ? 's' : ''}`}
            </Typography>
            {canEdit && (
              <Button size="small" variant="outlined" startIcon={<AddIcon />}
                onClick={() => { setEditObra(null); setObraDialog(true); }}>
                Nova Obra
              </Button>
            )}
          </Box>

          {obras.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <ObrasIcon sx={{ fontSize: 40, opacity: 0.3 }} />
              <Typography variant="body2">Nenhuma obra registada para esta instalação.</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Urgência</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Data Prevista</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Início</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Fim</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Estimado (€)</TableCell>
                    {canEdit && <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {obras.map((obra) => (
                    <TableRow key={obra.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{obra.nome}</Typography>
                        {obra.aviso && (
                          <Typography variant="caption" color="warning.main" display="block">
                            ⚠ {obra.aviso}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {obra.urgenciaLabel
                          ? <Chip label={obra.urgenciaLabel} size="small" color="warning" />
                          : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        {formatDate(obra.dataPrevista)}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        {formatDate(obra.dataInicio)}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        {formatDate(obra.dataFim)}
                      </TableCell>
                      <TableCell>
                        {obra.estado === 1 ? (
                          <Chip icon={<DoneIcon />} label="Concluído" size="small" color="success" />
                        ) : (
                          <Chip icon={<PendingIcon />} label="Por concluir" size="small" />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{formatCurrency(obra.valorEstimado)}</TableCell>
                      {canEdit && (
                        <TableCell align="right">
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => { setEditObra(obra); setObraDialog(true); }}>
                              <EditIcon fontSize="small" />
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
        </Box>
      )}

      {/* ── Tab 1: Despesas ── */}
      {tab === 1 && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              {despesas.length === 0
                ? 'Sem despesas registadas'
                : `${despesas.length} despesa${despesas.length !== 1 ? 's' : ''}`}
            </Typography>
            {canEdit && (
              <Button size="small" variant="outlined" startIcon={<AddIcon />}
                onClick={() => { setEditDespesa(null); setDespesaDialog(true); }}>
                Nova Despesa
              </Button>
            )}
          </Box>

          {despesas.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <EuroIcon sx={{ fontSize: 40, opacity: 0.3 }} />
              <Typography variant="body2">Nenhuma despesa registada.</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Obra</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Tipo de Despesa</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Valor (€)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Observações</TableCell>
                    {canEdit && <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {despesas.map((d) => (
                    <TableRow key={d.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{lookupObraNome(d, obras)}</TableCell>
                      <TableCell>{lookupTipoDespesa(d, meta)}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        {formatDate(d.data)}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{formatCurrency(d.valor)}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        {d.memo || '—'}
                      </TableCell>
                      {canEdit && (
                        <TableCell align="right">
                          <Tooltip title="Editar">
                            <IconButton size="small"
                              onClick={() => { setEditDespesa(d); setDespesaDialog(true); }}>
                              <EditIcon fontSize="small" />
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
        </Box>
      )}

      {/* Dialogs */}
      <ObraDialog
        open={obraDialog}
        onClose={() => { setObraDialog(false); setEditObra(null); }}
        onSubmit={handleObraSubmit}
        obra={editObra}
        tipoObraId={tipoObraId}
        tipoObraLabel={tipoObraLabel}
        instalacao={instalacao}
        meta={meta}
      />
      <DespesaDialog
        open={despesaDialog}
        onClose={() => { setDespesaDialog(false); setEditDespesa(null); }}
        onSubmit={handleDespesaSubmit}
        despesa={editDespesa}
        meta={meta}
        obras={obras}
      />
    </Box>
  );
}
