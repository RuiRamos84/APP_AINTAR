import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  MenuItem,
  CircularProgress,
  Typography,
  Alert,
  Chip,
  IconButton,
  Grid,
  LinearProgress,
  Fade,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocIcon,
  TableChart as ExcelIcon,
  Close as CloseIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAddStep, useDocumentDetails } from '../../hooks/useDocuments';
import { useMetaData } from '@/core/hooks/useMetaData';
import { getAvailableSteps, getAvailableUsersForStep } from '../../utils/workflowUtils';
import VacationWarningBadge from '../vacation/VacationWarningBadge';
import { toast } from 'sonner';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per file
const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.docx,.xlsx,.eml,.msg,.mp4,.webm,.mov,.avi,.ogg';

const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <PdfIcon color="error" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <ImageIcon color="primary" />;
  if (['doc', 'docx'].includes(ext)) return <DocIcon color="info" />;
  if (['xls', 'xlsx'].includes(ext)) return <ExcelIcon color="success" />;
  return <FileIcon />;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Modal to Add a Step/Action to a Document
 * Uses workflow validation to show only valid transitions
 * Supports multi-file upload with drag-and-drop
 */
const AddStepModal = ({ open, onClose, documentId, document: propDocument, initialStep }) => {
  const theme = useTheme();
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // If document is passed as prop, use it. Otherwise try to fetch
  const { data: fetchedDocument } = useDocumentDetails(propDocument ? null : documentId);
  const document = propDocument || fetchedDocument;
  const { data: metaData } = useMetaData();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      step: initialStep || '',
      user: '',
      memo: '',
    },
  });

  // Pre-select step when initialStep changes
  React.useEffect(() => {
    if (initialStep && open) {
      setValue('step', initialStep);
    }
  }, [initialStep, open, setValue]);

  // Reset on open
  React.useEffect(() => {
    if (open) {
      reset({ step: initialStep || '', user: '', memo: '' });
      setFiles([]);
      setShowSuccess(false);
      setConfirmClose(false);
    }
  }, [open, reset, initialStep]);

  const selectedStep = watch('step');

  const addStepMutation = useAddStep();

  // Available steps based on workflow transitions
  const availableSteps = useMemo(() => {
    if (!document || !metaData) return [];
    return getAvailableSteps(document, metaData);
  }, [document, metaData]);

  // Available users for selected step
  const availableUsers = useMemo(() => {
    if (!selectedStep || !document || !metaData) return [];
    return getAvailableUsersForStep(Number(selectedStep), document, metaData);
  }, [selectedStep, document, metaData]);

  // --- File Handling ---
  const validateFileSize = useCallback((file) => {
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(
        `"${file.name}" é demasiado grande (${sizeMB}MB). Máximo: ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB por ficheiro.`
      );
      return false;
    }
    return true;
  }, []);

  const handleFileSelect = useCallback((event) => {
    const selectedFiles = Array.from(event.target.files || []);
    const remaining = MAX_FILES - files.length;
    const validFiles = selectedFiles.filter(f => validateFileSize(f));
    const newFiles = validFiles.slice(0, remaining).map((file) => ({
      file,
      description: '',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [files.length, validateFileSize]);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const droppedFiles = Array.from(event.dataTransfer.files || []);
    const remaining = MAX_FILES - files.length;
    const validFiles = droppedFiles.filter(f => validateFileSize(f));
    const newFiles = validFiles.slice(0, remaining).map((file) => ({
      file,
      description: '',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, [files.length, validateFileSize]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleRemoveFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDescriptionChange = useCallback((index, description) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, description } : f)));
  }, []);

  // --- Close Handling ---
  const hasUnsavedData = isDirty || files.length > 0;

  const handleRequestClose = () => {
    if (hasUnsavedData && !showSuccess) {
      setConfirmClose(true);
    } else {
      doClose();
    }
  };

  const doClose = () => {
    reset({ step: '', user: '', memo: '' });
    setFiles([]);
    setConfirmClose(false);
    setShowSuccess(false);
    addStepMutation.reset();
    onClose();
  };

  // --- Submit ---
  const onSubmit = (data) => {
    // Validate file descriptions
    if (files.length > 0) {
      const missingDesc = files.some((f) => !f.description.trim());
      if (missingDesc) {
        toast.error('Cada ficheiro deve ter uma descrição obrigatória.');
        return;
      }
    }

    if (!data.user) {
      toast.error('Deve selecionar um utilizador.');
      return;
    }

    const formData = new FormData();
    formData.append('tb_document', documentId);
    formData.append('what', data.step);
    formData.append('who', data.user);
    formData.append('memo', data.memo || '');

    files.forEach(({ file, description }) => {
      formData.append('files', file);
      formData.append('descr', description);
    });

    addStepMutation.mutate(
      { id: documentId, formData },
      {
        onSuccess: () => {
          setShowSuccess(true);
          setTimeout(() => {
            doClose();
          }, 1200);
        },
      }
    );
  };

  const isSubmitting = addStepMutation.isPending;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleRequestClose}
        fullWidth
        maxWidth="md"
        disableEscapeKeyDown={isSubmitting}
      >
        {/* Header */}
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <SendIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Nova Ação
              </Typography>
              {document?.regnumber && (
                <Chip
                  label={document.regnumber}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              )}
              {showSuccess && (
                <Fade in>
                  <CheckIcon sx={{ color: 'success.main', ml: 0.5 }} />
                </Fade>
              )}
            </Box>
            <IconButton
              onClick={handleRequestClose}
              disabled={isSubmitting}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Progress bar during submission */}
          {isSubmitting && (
            <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />
          )}
        </DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent dividers>
            <Grid container spacing={2.5}>
              {/* Info alert */}
              <Grid size={12}>
                <Alert
                  severity={showSuccess ? 'success' : 'info'}
                  sx={{ borderRadius: 2 }}
                >
                  {showSuccess
                    ? 'Passo adicionado com sucesso! A lista será atualizada.'
                    : 'Selecione o próximo passo e destinatário para encaminhar este pedido.'
                  }
                </Alert>
              </Grid>

              {/* Step + User side by side */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="step"
                  control={control}
                  rules={{ required: 'Selecione um passo' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Passo / Ação"
                      fullWidth
                      error={!!errors.step}
                      helperText={errors.step?.message}
                      disabled={isSubmitting}
                    >
                      {availableSteps.length > 0 ? (
                        availableSteps.map((s) => (
                          <MenuItem key={s.pk} value={s.pk}>
                            {s.step}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem value="" disabled>
                          {document ? 'Sem passos disponíveis' : 'A carregar...'}
                        </MenuItem>
                      )}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="user"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Destinatário"
                      fullWidth
                      disabled={!selectedStep || isSubmitting}
                      helperText={
                        !selectedStep
                          ? 'Selecione um passo primeiro'
                          : availableUsers.length === 0
                            ? 'Nenhum utilizador disponível'
                            : undefined
                      }
                    >
                      {availableUsers.map((u) => (
                        <MenuItem key={u.pk} value={u.pk}>
                          {u.name || u.username || `User ${u.pk}`}
                        </MenuItem>
                      ))}
                      {availableUsers.length === 0 && (
                        <MenuItem value="" disabled>
                          Sem utilizadores disponíveis
                        </MenuItem>
                      )}
                    </TextField>
                  )}
                />
              </Grid>

              {/* Vacation Warning */}
              {watch('user') && (
                <Grid size={12}>
                  <VacationWarningBadge
                    userId={watch('user')}
                    userName={
                      availableUsers.find((u) => u.pk === watch('user'))?.name || ''
                    }
                  />
                </Grid>
              )}

              {/* Memo */}
              <Grid size={12}>
                <Controller
                  name="memo"
                  control={control}
                  rules={{ required: 'A observação é obrigatória' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Observações"
                      multiline
                      rows={3}
                      fullWidth
                      error={!!errors.memo}
                      helperText={errors.memo?.message}
                      disabled={isSubmitting}
                      placeholder="Descreva as ações tomadas ou instruções..."
                    />
                  )}
                />
              </Grid>

              {/* File Upload Zone */}
              <Grid size={12}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Anexos (opcional — máx. {MAX_FILES} ficheiros)
                </Typography>

                {files.length < MAX_FILES && (
                  <Paper
                    variant="outlined"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      p: 2.5,
                      textAlign: 'center',
                      borderStyle: 'dashed',
                      borderColor: alpha(theme.palette.primary.main, 0.4),
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                      cursor: 'pointer',
                      borderRadius: 2,
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.06),
                      },
                    }}
                  >
                    <UploadIcon sx={{ fontSize: 32, color: 'primary.main', mb: 0.5 }} />
                    <Typography variant="body2" fontWeight={500}>
                      Arraste ficheiros ou clique para selecionar
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      PDF, Imagens, Office, Email
                    </Typography>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPTED_TYPES}
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </Paper>
                )}

                {/* File List */}
                {files.length > 0 && (
                  <List dense sx={{ mt: 1 }}>
                    {files.map((fileItem, index) => (
                      <ListItem
                        key={`${fileItem.file.name}-${index}`}
                        sx={{
                          bgcolor: alpha(theme.palette.background.default, 0.6),
                          border: `1px solid ${!fileItem.description.trim() ? theme.palette.error.main : theme.palette.divider}`,
                          borderRadius: 1.5,
                          mb: 0.5,
                          pr: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {getFileIcon(fileItem.file.name)}
                        </ListItemIcon>
                        <ListItemText
                          primary={fileItem.file.name}
                          secondary={formatFileSize(fileItem.file.size)}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 500, noWrap: true }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleRemoveFile(index)}
                            disabled={isSubmitting}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                        <Box sx={{ width: '100%', pl: 4.5, pb: 1, pt: 0.5 }}>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="Descrição do ficheiro *"
                            value={fileItem.description}
                            onChange={(e) => handleDescriptionChange(index, e.target.value)}
                            disabled={isSubmitting}
                            error={!fileItem.description.trim()}
                            helperText={!fileItem.description.trim() ? 'Descrição obrigatória' : ''}
                            variant="standard"
                            sx={{ '& .MuiInput-root': { fontSize: '0.85rem' } }}
                          />
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                )}

                {files.length >= MAX_FILES && (
                  <Alert severity="warning" sx={{ mt: 1, borderRadius: 2 }}>
                    Limite de {MAX_FILES} ficheiros atingido.
                  </Alert>
                )}
              </Grid>

              {/* Error */}
              {addStepMutation.isError && (
                <Grid size={12}>
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    Erro ao adicionar ação: {addStepMutation.error?.message}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={handleRequestClose}
              color="inherit"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color={showSuccess ? 'success' : 'primary'}
              disabled={isSubmitting || showSuccess}
              startIcon={
                isSubmitting
                  ? <CircularProgress size={20} />
                  : showSuccess
                    ? <CheckIcon />
                    : <SendIcon />
              }
            >
              {isSubmitting ? 'A enviar...' : showSuccess ? 'Concluído!' : 'Guardar e Enviar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Close Confirmation Dialog */}
      <Dialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        maxWidth="xs"
      >
        <DialogTitle>Descartar alterações?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Existem dados não guardados. Deseja realmente sair sem guardar?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClose(false)} autoFocus>
            Não
          </Button>
          <Button onClick={doClose} color="error">
            Sim, descartar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddStepModal;
