/**
 * ObrasForm — Dialog para criar / editar uma obra.
 */
import { useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, CircularProgress,
  Typography, Divider, Box, ToggleButtonGroup, ToggleButton,
  InputAdornment, Chip,
} from '@mui/material';
import {
  Construction as ObrasIcon,
  Save as SaveIcon,
  Add as AddIcon,
  CheckCircle as DoneIcon,
  RadioButtonUnchecked as PendingIcon,
  WarningAmber as WarningIcon,
  Euro as EuroIcon,
  CalendarMonth as CalIcon,
} from '@mui/icons-material';
import { useForm, Controller, useWatch } from 'react-hook-form';

const TIPOS_COM_INSTALACAO = [1, 2]; // ETAR e EEAR

function SectionLabel({ icon: Icon, label }) {
  return (
    <Grid size={12}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 0.5 }}>
        <Icon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {label}
        </Typography>
        <Divider sx={{ flex: 1 }} />
      </Box>
    </Grid>
  );
}

export default function ObrasForm({ open, onClose, onSubmit, obra, meta }) {
  const { tipoObra = [], urgencia = [], associates = [], instalacao = [] } = meta ?? {};

  const {
    control, handleSubmit, reset, setValue,
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: {
      nome: '', tipoObra: '', associadoId: '', instalacaoId: '',
      urgencia: '', estado: 0,
      dataPrevista: '', dataInicio: '', dataFim: '',
      valorEstimado: '', valorAintar: '', valorSubsidio: '', valorMunicipio: '',
      aviso: '', memo: '',
    },
  });

  const watchedTipo = useWatch({ control, name: 'tipoObra' });
  const watchedAssociado = useWatch({ control, name: 'associadoId' });
  const watchedInstalacao = useWatch({ control, name: 'instalacaoId' });

  const instalacaoRequired = TIPOS_COM_INSTALACAO.includes(Number(watchedTipo));

  const selectedAssociateName = useMemo(
    () => associates.find((a) => String(a.pk) === String(watchedAssociado))?.name ?? null,
    [associates, watchedAssociado]
  );

  const instalacoesFiltradas = useMemo(() => {
    if (!selectedAssociateName) return [];
    return instalacao.filter((i) => i.ts_entity === selectedAssociateName);
  }, [instalacao, selectedAssociateName]);

  // Auto-gerar nome quando tipo é ETAR/EEAR e instalação está selecionada (apenas em criação)
  useEffect(() => {
    if (!instalacaoRequired) return;
    if (obra) return; // em edição, preservar o nome existente
    const tipoLabel = tipoObra.find((t) => String(t.pk) === String(watchedTipo))?.value ?? '';
    const instNome = instalacao.find((i) => String(i.pk) === String(watchedInstalacao))?.nome ?? '';
    if (tipoLabel && instNome) setValue('nome', `${tipoLabel} de ${instNome}`);
  }, [watchedTipo, watchedInstalacao, instalacaoRequired, obra, tipoObra, instalacao, setValue]);

  useEffect(() => {
    if (!instalacaoRequired) setValue('instalacaoId', '');
  }, [instalacaoRequired, setValue]);

  useEffect(() => {
    if (!open) return;
    if (obra) {
      // Resolver PKs a partir dos labels retornados pela view
      const resolvedTipo = tipoObra.find((t) => t.value === obra.tipoObraLabel)?.pk ?? '';
      const resolvedAssociado = associates.find((a) => a.name === obra.associadoNome)?.pk ?? '';
      const resolvedUrgencia = urgencia.find((u) => u.value === obra.urgenciaLabel)?.code
        ?? urgencia.find((u) => u.value === obra.urgenciaLabel)?.pk ?? '';
      // A view formata como "Nome (ETAR)" / "Nome (EE)" — remover sufixo para comparar
      const nomeSemSufixo = obra.instalacaoNome?.replace(/ \(ETAR\)$/, '').replace(/ \(EE\)$/, '') ?? '';
      const resolvedInstalacao = instalacao.find((i) => (i.nome || i.value) === nomeSemSufixo)?.pk ?? '';

      reset({
        nome: obra.nome ?? '',
        tipoObra: resolvedTipo ? String(resolvedTipo) : '',
        associadoId: resolvedAssociado ? String(resolvedAssociado) : '',
        instalacaoId: resolvedInstalacao ? String(resolvedInstalacao) : '',
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
        nome: '', tipoObra: '', associadoId: '', instalacaoId: '',
        urgencia: '', estado: 0,
        dataPrevista: '', dataInicio: '', dataFim: '',
        valorEstimado: '', valorAintar: '', valorSubsidio: '', valorMunicipio: '',
        aviso: '', memo: '',
      });
    }
  }, [open, obra, reset, tipoObra, associates, urgencia, instalacao]);

  const handleFormSubmit = async (values) => {
    await onSubmit({
      nome: values.nome,
      tipoObra: values.tipoObra || null,
      associadoId: values.associadoId || null,
      instalacaoId: values.instalacaoId || null,
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
        {obra?.tipoObraLabel && (
          <Chip label={obra.tipoObraLabel} size="small" variant="outlined" sx={{ ml: 1 }} />
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
                  <TextField
                    {...field} fullWidth size="small" label="Nome *"
                    error={!!errors.nome}
                    helperText={errors.nome?.message || (instalacaoRequired ? 'Auto-gerado ao selecionar instalação' : '')}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="tipoObra"
                control={control}
                rules={{ required: 'Tipo de obra obrigatório' }}
                render={({ field }) => (
                  <TextField
                    {...field} select fullWidth size="small" label="Tipo de Obra *"
                    error={!!errors.tipoObra} helperText={errors.tipoObra?.message}
                  >
                    <MenuItem value=""><em>— Selecionar —</em></MenuItem>
                    {tipoObra.map((t) => (
                      <MenuItem key={t.pk} value={String(t.pk)}>{t.value}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="associadoId"
                control={control}
                rules={{ required: 'Associado obrigatório' }}
                render={({ field }) => (
                  <TextField
                    {...field} select fullWidth size="small" label="Associado *"
                    error={!!errors.associadoId} helperText={errors.associadoId?.message}
                  >
                    <MenuItem value=""><em>— Selecionar —</em></MenuItem>
                    {associates.map((a) => (
                      <MenuItem key={a.pk} value={String(a.pk)}>{a.name}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {instalacaoRequired && (
              <Grid size={12}>
                <Controller
                  name="instalacaoId"
                  control={control}
                  rules={{ required: 'Instalação obrigatória para este tipo' }}
                  render={({ field }) => (
                    <TextField
                      {...field} select fullWidth size="small" label="Instalação *"
                      disabled={!watchedAssociado}
                      error={!!errors.instalacaoId}
                      helperText={errors.instalacaoId?.message || (!watchedAssociado ? 'Selecione primeiro um Associado' : '')}
                    >
                      <MenuItem value=""><em>— Selecionar —</em></MenuItem>
                      {instalacoesFiltradas.map((i) => (
                        <MenuItem key={i.pk} value={String(i.pk)}>{i.nome || i.value}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
            )}

            {/* Urgência + Estado numa linha */}
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
                      <ToggleButton
                        key={u.code ?? u.pk}
                        value={String(u.code ?? u.pk)}
                        sx={{ fontSize: '0.75rem', py: 0.75 }}
                      >
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

            {/* ── Valores ── */}
            <SectionLabel icon={EuroIcon} label="Execução Financeira" />

            {[
              { name: 'valorEstimado', label: 'Estimado' },
              { name: 'valorAintar',   label: 'AINTAR' },
              { name: 'valorSubsidio', label: 'Subsídio' },
              { name: 'valorMunicipio',label: 'Município' },
            ].map(({ name, label }) => (
              <Grid key={name} size={{ xs: 6, sm: 3 }}>
                <Controller name={name} control={control} render={({ field }) => (
                  <TextField
                    {...field} fullWidth type="number" size="small" label={label}
                    inputProps={{ step: '0.01', min: 0 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">€</InputAdornment> }}
                  />
                )} />
              </Grid>
            ))}

            {/* ── Notas ── */}
            <SectionLabel icon={WarningIcon} label="Notas" />

            <Grid size={12}>
              <Controller name="aviso" control={control} render={({ field }) => (
                <TextField
                  {...field} fullWidth size="small" label="Aviso"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} /></InputAdornment>,
                  }}
                  helperText="Ao definir um aviso, o estado é automaticamente reposto para 'Por concluir'"
                />
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
          <Button
            type="submit" variant="contained" disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : obra ? <SaveIcon /> : <AddIcon />}
          >
            {obra ? 'Guardar alterações' : 'Criar Obra'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
