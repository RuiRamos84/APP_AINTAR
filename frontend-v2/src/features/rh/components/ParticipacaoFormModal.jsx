import { useEffect, useMemo, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select,
  MenuItem, Stack, ToggleButton, ToggleButtonGroup,
  Alert, Chip, Typography, Divider, Box, IconButton, Tooltip,
  List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  CalendarMonth as DiaIcon,
  Schedule as HoraIcon,
  WarningAmber as AvisoIcon,
  AttachFile as AttachIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon,
  Close as RemoveIcon,
  DeleteOutline as DeleteAnexoIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { downloadAnexoParticipacao } from '../services/rhService';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import { useMotivosParticipacao } from '../hooks/useParticipacao';
import { useColaboradores } from '../hooks/useRhLookups';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { useAuth } from '@/core/contexts/AuthContext';

const today = () => new Date().toISOString().slice(0, 10);

const toDate = (v) => {
  if (!v) return '';
  try { return new Date(v).toISOString().slice(0, 10); } catch { return ''; }
};

const toTime = (v) => {
  if (!v) return '';
  return String(v).slice(0, 5); // HH:MM
};

const diffDias = (dataInicio, dataParticipacao) => {
  if (!dataInicio || !dataParticipacao) return null;
  const d1 = new Date(dataInicio);
  const d2 = new Date(dataParticipacao);
  return Math.round((d1 - d2) / 86400000);
};

// ---------------------------------------------------------------------------

const FileIcon = ({ filename }) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  return ext === 'pdf'
    ? <PdfIcon fontSize="small" color="error" />
    : <ImageIcon fontSize="small" color="primary" />;
};

const fmtBytes = (b) => b < 1024 * 1024
  ? `${(b / 1024).toFixed(0)} KB`
  : `${(b / 1048576).toFixed(1)} MB`;

const ParticipacaoFormModal = ({
  open, onClose, onSave, isSaving, initial,
  onRemoveAnexo, isRemovendoAnexo,
}) => {
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const isAdmin = hasPermission('rh.admin');
  const [pendingFiles, setPendingFiles] = useState([]);

  // Anexos só podem ser removidos enquanto a participação está em Pendente
  // ou Validado Superior (fbo_rh_participacao bloqueia edição depois disso)
  // e por quem é dono do registo ou Admin RH.
  const canDeleteAnexo = !!initial
    && [1, 2].includes(initial.ts_estado_fk)
    && (isAdmin || initial.tb_user_fk === user?.user_id);

  const handleRemoveAnexo = useCallback(async (doc) => {
    if (!onRemoveAnexo || !initial) return;
    if (!window.confirm('Remover este anexo?')) return;
    await onRemoveAnexo({ pk: initial.pk, filename: doc.filename });
  }, [onRemoveAnexo, initial]);

  const { motivos } = useMotivosParticipacao();
  const { colaboradores } = useColaboradores();

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      user_fk:            '',
      tipo:               'dia',
      motivo_fk:          '',
      data_inicio:        today(),
      data_fim:           today(),
      hora_inicio:        '',
      hora_fim:           '',
      data_participacao:  today(),
      observacoes:        '',
    },
  });

  const tipo             = watch('tipo');
  const dataInicio       = watch('data_inicio');
  const dataParticipacao = watch('data_participacao');

  // Quando muda para 'dia', limpa as horas; quando muda data_inicio em dia, iguala data_fim
  useEffect(() => {
    if (tipo === 'dia') {
      setValue('hora_inicio', '');
      setValue('hora_fim', '');
      setValue('data_fim', dataInicio);
    }
  }, [tipo, dataInicio, setValue]);

  // Limpar ficheiros pendentes ao abrir/fechar
  useEffect(() => {
    if (!open) setPendingFiles([]);
  }, [open]);

  const handleFileSelect = useCallback((e) => {
    const selected = Array.from(e.target.files || []);
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const valid = selected.filter(f => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      return allowed.includes(ext);
    });
    if (valid.length < selected.length)
      toast.warning('Apenas PDF, JPEG e PNG são permitidos. Outros ficheiros foram ignorados.');
    setPendingFiles(prev => [...prev, ...valid].slice(0, 5));
    e.target.value = '';
  }, []);

  const removePending = useCallback((idx) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handleDownload = useCallback(async (doc) => {
    try {
      const blob = await downloadAnexoParticipacao(initial.pk, doc.filename);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nome_original || doc.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao descarregar ficheiro.');
    }
  }, [initial]);

  const handlePreview = useCallback(async (doc) => {
    setLoadingPreview(true);
    setPreview({ url: null, filename: doc.filename, nomeOriginal: doc.nome_original });
    try {
      const blob = await downloadAnexoParticipacao(initial.pk, doc.filename);
      const url = URL.createObjectURL(blob);
      setPreview({ url, filename: doc.filename, nomeOriginal: doc.nome_original });
    } catch {
      toast.error('Erro ao carregar pré-visualização.');
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [initial]);

  const handleClosePreview = useCallback(() => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }, [preview]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      reset({
        user_fk:           initial.tb_user_fk ?? '',
        tipo:              initial.tipo ?? 'dia',
        motivo_fk:         initial.ts_rh_falta_motivo_fk ?? '',
        data_inicio:       toDate(initial.data_inicio),
        data_fim:          toDate(initial.data_fim),
        hora_inicio:       toTime(initial.hora_inicio),
        hora_fim:          toTime(initial.hora_fim),
        data_participacao: toDate(initial.data_participacao) || today(),
        observacoes:       initial.observacoes ?? '',
      });
    } else {
      reset({
        user_fk: isAdmin ? '' : (user?.user_id ?? ''), tipo: 'dia', motivo_fk: '',
        data_inicio: today(), data_fim: today(),
        hora_inicio: '', hora_fim: '',
        data_participacao: today(), observacoes: '',
      });
    }
  }, [open, initial, reset, isAdmin, user]);

  const preAviso = useMemo(
    () => diffDias(dataInicio, dataParticipacao),
    [dataInicio, dataParticipacao],
  );

  // Filtra motivos por tipo seleccionado
  const motivosFiltrados = useMemo(
    () => tipo === 'parcial'
      ? motivos.filter(m => m.parcial_ok)
      : motivos,
    [motivos, tipo],
  );

  const onSubmit = (data) => {
    const payload = {
      user_fk:           Number(data.user_fk) || undefined,
      tipo:              data.tipo,
      motivo_fk:         data.motivo_fk ? Number(data.motivo_fk) : null,
      data_inicio:       data.data_inicio,
      data_fim:          data.tipo === 'parcial' ? data.data_inicio : data.data_fim,
      hora_inicio:       data.tipo === 'parcial' ? data.hora_inicio || null : null,
      hora_fim:          data.tipo === 'parcial' ? data.hora_fim    || null : null,
      data_participacao: data.data_participacao || null,
      observacoes:       data.observacoes || null,
    };
    if (initial) onSave({ pk: initial.pk, data: payload }, pendingFiles);
    else         onSave(payload, pendingFiles);
  };

  const preAvisoColor  = preAviso === null ? 'default'
    : preAviso >= 5  ? 'success'
    : preAviso >= 0  ? 'warning'
    : 'error';

  const preAvisoLabel  = preAviso === null ? ''
    : preAviso >= 5  ? `${preAviso} dias de antecedência`
    : preAviso === 0 ? 'Aviso no próprio dia'
    : preAviso > 0   ? `${preAviso} dia(s) de antecedência — inferior ao mínimo legal (5)`
    : `Registo retroativo (${Math.abs(preAviso)} dia(s) após o evento)`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle>
        {initial ? 'Editar Participação' : 'Nova Participação de Ausência'}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>

            {/* Tipo */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Tipo de ausência
              </Typography>
              <Controller name="tipo" control={control}
                render={({ field }) => (
                  <ToggleButtonGroup
                    {...field}
                    exclusive size="small"
                    onChange={(_, v) => { if (v) field.onChange(v); }}
                    sx={{ width: '100%' }}
                  >
                    <ToggleButton value="dia" sx={{ flex: 1, gap: 0.5 }}>
                      <DiaIcon fontSize="small" /> Dia(s) completo(s)
                    </ToggleButton>
                    <ToggleButton value="parcial" sx={{ flex: 1, gap: 0.5 }}>
                      <HoraIcon fontSize="small" /> Ausência parcial (horas)
                    </ToggleButton>
                  </ToggleButtonGroup>
                )}
              />
            </Box>

            {/* Colaborador — só visível para quem pode registar em nome de outros */}
            {!initial && isAdmin && (
              <Controller name="user_fk" control={control} rules={{ required: true }}
                render={({ field }) => (
                  <FormControl fullWidth size="small" error={!!errors.user_fk}>
                    <InputLabel>Colaborador *</InputLabel>
                    <Select {...field} label="Colaborador *">
                      {colaboradores.map(c => (
                        <MenuItem key={c.pk} value={c.pk}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            )}

            <Divider />

            {/* Datas */}
            {tipo === 'dia' ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller name="data_inicio" control={control} rules={{ required: true }}
                  render={({ field }) => (
                    <TextField {...field} label="Data início *" type="date" size="small"
                      fullWidth InputLabelProps={{ shrink: true }} error={!!errors.data_inicio} />
                  )}
                />
                <Controller name="data_fim" control={control} rules={{ required: true }}
                  render={({ field }) => (
                    <TextField {...field} label="Data fim *" type="date" size="small"
                      fullWidth InputLabelProps={{ shrink: true }} error={!!errors.data_fim} />
                  )}
                />
              </Stack>
            ) : (
              <>
                <Controller name="data_inicio" control={control} rules={{ required: true }}
                  render={({ field }) => (
                    <TextField {...field} label="Data *" type="date" size="small"
                      fullWidth InputLabelProps={{ shrink: true }} error={!!errors.data_inicio} />
                  )}
                />
                <Stack direction="row" spacing={2}>
                  <Controller name="hora_inicio" control={control} rules={{ required: tipo === 'parcial' }}
                    render={({ field }) => (
                      <TextField {...field} label="Hora saída *" type="time" size="small"
                        fullWidth InputLabelProps={{ shrink: true }} error={!!errors.hora_inicio} />
                    )}
                  />
                  <Controller name="hora_fim" control={control} rules={{ required: tipo === 'parcial' }}
                    render={({ field }) => (
                      <TextField {...field} label="Hora regresso *" type="time" size="small"
                        fullWidth InputLabelProps={{ shrink: true }} error={!!errors.hora_fim} />
                    )}
                  />
                </Stack>
              </>
            )}

            {/* Motivo legal */}
            <Controller name="motivo_fk" control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small">
                  <InputLabel>Motivo legal</InputLabel>
                  <Select {...field} label="Motivo legal">
                    <MenuItem value=""><em>— Sem motivo especificado —</em></MenuItem>
                    {motivosFiltrados.map(m => (
                      <MenuItem key={m.pk} value={m.pk}>
                        <Box>
                          <Typography variant="body2" component="span" fontWeight={600}>
                            {m.artigo}
                          </Typography>
                          <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 1 }}>
                            {m.descricao}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Divider />

            {/* Data de comunicação / pré-aviso */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Data de comunicação
                  {!isAdmin && ' (editável pelo RH)'}
                </Typography>
                {preAviso !== null && (
                  <Chip
                    icon={preAviso < 5 ? <AvisoIcon /> : undefined}
                    label={preAvisoLabel}
                    color={preAvisoColor}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
              <Controller name="data_participacao" control={control}
                render={({ field }) => (
                  <TextField {...field} label="Data em que comunicou a ausência" type="date"
                    size="small" fullWidth InputLabelProps={{ shrink: true }}
                    disabled={!isAdmin && !!initial}
                    helperText={
                      !isAdmin && !!initial
                        ? 'Apenas o Admin RH pode alterar a data de comunicação'
                        : 'Pode ser backdatada para reflectir comunicação verbal prévia'
                    }
                  />
                )}
              />
            </Box>

            {/* Aviso de pré-aviso tardio */}
            {preAviso !== null && preAviso < 5 && (
              <Alert severity="warning" icon={<AvisoIcon />}>
                <strong>Pré-aviso inferior ao mínimo legal (5 dias).</strong>{' '}
                {preAviso === 0
                  ? 'A ausência foi comunicada no próprio dia.'
                  : preAviso < 0
                    ? 'A ausência já ocorreu. O Admin RH pode corrigir a data de comunicação.'
                    : `A ausência foi comunicada com apenas ${preAviso} dia(s) de antecedência.`
                }
              </Alert>
            )}

            {/* Observações */}
            <Controller name="observacoes" control={control}
              render={({ field }) => (
                <TextField {...field} label="Observações"
                  multiline rows={2} size="small" fullWidth />
              )}
            />

            <Divider />

            {/* Anexos */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Documentos justificativos (PDF, JPEG, PNG · máx. 5)
                </Typography>
                <Button
                  component="label"
                  size="small"
                  variant="outlined"
                  startIcon={<AttachIcon />}
                  disabled={pendingFiles.length >= 5}
                >
                  Adicionar
                  <input
                    type="file" hidden multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                  />
                </Button>
              </Stack>

              {/* Ficheiros já guardados (edição) */}
              {initial?.documentos?.length > 0 && (
                <List dense disablePadding sx={{ mb: 1 }}>
                  {initial.documentos.map((doc) => (
                    <ListItem key={doc.pk} disablePadding
                      sx={{ borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                      secondaryAction={
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Pré-visualizar">
                            <IconButton size="small" edge="end" onClick={() => handlePreview(doc)}>
                              <PreviewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Descarregar">
                            <IconButton size="small" edge="end" onClick={() => handleDownload(doc)}>
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {canDeleteAnexo && (
                            <Tooltip title="Remover">
                              <IconButton size="small" edge="end" color="error"
                                disabled={isRemovendoAnexo}
                                onClick={() => handleRemoveAnexo(doc)}>
                                <DeleteAnexoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <FileIcon filename={doc.filename} />
                      </ListItemIcon>
                      <ListItemText
                        primary={doc.nome_original}
                        secondary={fmtBytes(doc.tamanho)}
                        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}

              {/* Ficheiros pendentes (a enviar com o save) */}
              {pendingFiles.length > 0 && (
                <List dense disablePadding>
                  {pendingFiles.map((f, i) => (
                    <ListItem key={i} disablePadding
                      sx={{ borderRadius: 1, bgcolor: 'action.selected' }}
                      secondaryAction={
                        <IconButton size="small" edge="end" onClick={() => removePending(i)}>
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <FileIcon filename={f.name} />
                      </ListItemIcon>
                      <ListItemText
                        primary={f.name}
                        secondary={fmtBytes(f.size)}
                        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSaving}
            sx={{ bgcolor: '#e11d48', '&:hover': { bgcolor: '#be123c' } }}>
            {isSaving ? 'A guardar…' : initial ? 'Actualizar' : 'Registar'}
          </Button>
        </DialogActions>
      </form>

      <DocumentPreviewDialog
        open={!!preview}
        onClose={handleClosePreview}
        url={preview?.url}
        filename={preview?.filename}
        nomeOriginal={preview?.nomeOriginal}
        isLoading={loadingPreview}
        onDownload={() => handleDownload({ filename: preview.filename, nome_original: preview.nomeOriginal })}
      />
    </Dialog>
  );
};

export default ParticipacaoFormModal;
