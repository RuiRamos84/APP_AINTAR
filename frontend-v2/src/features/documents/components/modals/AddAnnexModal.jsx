import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Alert,
  Chip,
  Stack,
  CircularProgress,
  LinearProgress,
  Fade,
  Grid,
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
  Email as EmailIcon,
  Close as CloseIcon,
  AttachFile as AttachIcon,
  CheckCircle as CheckIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAddAnnex } from '../../hooks/useDocuments';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per file
const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.docx,.doc,.xlsx,.xls,.eml,.msg,.mp4,.webm,.mov,.avi,.ogg';

const FILE_TYPE_CHIPS = [
  { label: 'PDF', icon: <PdfIcon fontSize="small" />, color: 'error' },
  { label: 'Imagens', icon: <ImageIcon fontSize="small" />, color: 'success' },
  { label: 'Vídeo', icon: <ImageIcon fontSize="small" />, color: 'secondary' },
  { label: 'Word', icon: <DocIcon fontSize="small" />, color: 'info' },
  { label: 'Excel', icon: <ExcelIcon fontSize="small" />, color: 'primary' },
  { label: 'Email', icon: <EmailIcon fontSize="small" />, color: 'warning' },
];

const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <PdfIcon color="error" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <ImageIcon color="primary" />;
  if (['doc', 'docx'].includes(ext)) return <DocIcon color="info" />;
  if (['xls', 'xlsx'].includes(ext)) return <ExcelIcon color="success" />;
  if (['eml', 'msg'].includes(ext)) return <EmailIcon color="warning" />;
  return <FileIcon />;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Modal to add annexes to an existing document
 * Supports multi-file with drag-and-drop and mandatory descriptions
 */
const AddAnnexModal = ({ open, onClose, documentId, document: docProp }) => {
  const theme = useTheme();
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');
  const addAnnexMutation = useAddAnnex();

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setFiles([]);
      setShowSuccess(false);
      setConfirmClose(false);
      setValidationError('');
    }
  }, [open]);

  // --- File Handling ---
  const validateFileSize = useCallback((file) => {
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setValidationError(
        `"${file.name}" é demasiado grande (${sizeMB}MB). Máximo permitido: ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB por ficheiro.`
      );
      return false;
    }
    return true;
  }, []);

  const handleFileSelect = useCallback(
    (event) => {
      const selectedFiles = Array.from(event.target.files || []);
      const remaining = MAX_FILES - files.length;
      const validFiles = selectedFiles.filter(f => validateFileSize(f));
      const newFiles = validFiles.slice(0, remaining).map((file) => ({
        file,
        description: '',
      }));
      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
        setValidationError('');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [files.length, validateFileSize]
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      const droppedFiles = Array.from(event.dataTransfer.files || []);
      const remaining = MAX_FILES - files.length;
      const validFiles = droppedFiles.filter(f => validateFileSize(f));
      const newFiles = validFiles.slice(0, remaining).map((file) => ({
        file,
        description: '',
      }));
      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
        setValidationError('');
      }
    },
    [files.length, validateFileSize]
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleRemoveFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setValidationError('');
  }, []);

  const handleDescriptionChange = useCallback((index, description) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, description } : f)));
    setValidationError('');
  }, []);

  // --- Close Handling ---
  const handleRequestClose = () => {
    if (files.length > 0 && !showSuccess) {
      setConfirmClose(true);
    } else {
      doClose();
    }
  };

  const doClose = () => {
    setFiles([]);
    setConfirmClose(false);
    setShowSuccess(false);
    setValidationError('');
    addAnnexMutation.reset();
    onClose();
  };

  // --- Submit ---
  const handleSubmit = () => {
    if (files.length === 0) {
      setValidationError('Adicione pelo menos um ficheiro.');
      return;
    }

    // Check all files have descriptions
    const missingDesc = files.some((f) => !f.description.trim());
    if (missingDesc) {
      setValidationError('Todos os ficheiros devem ter uma descrição.');
      return;
    }

    const formData = new FormData();
    formData.append('tb_document', documentId);

    files.forEach((f) => {
      formData.append('files', f.file);
      formData.append('descr', f.description);
    });

    addAnnexMutation.mutate(formData, {
      onSuccess: () => {
        setShowSuccess(true);
        setTimeout(() => {
          doClose();
        }, 1200);
      },
    });
  };

  const isLoading = addAnnexMutation.isPending;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleRequestClose}
        fullWidth
        maxWidth="md"
        disableEscapeKeyDown={isLoading}
      >
        {/* Header */}
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <AttachIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Adicionar Anexos
              </Typography>
              {docProp?.regnumber && (
                <Chip
                  label={docProp.regnumber}
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
              disabled={isLoading}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {isLoading && (
            <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />
          )}
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={2.5}>
            {/* Info + Accepted types */}
            <Grid size={12}>
              <Alert
                severity={showSuccess ? 'success' : 'info'}
                sx={{ borderRadius: 2, mb: 1 }}
              >
                {showSuccess
                  ? 'Anexos adicionados com sucesso! A lista será atualizada.'
                  : 'Adicione ficheiros ao documento. Cada ficheiro deve ter uma descrição.'
                }
              </Alert>

              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, lineHeight: '24px' }}>
                  Formatos:
                </Typography>
                {FILE_TYPE_CHIPS.map((ft) => (
                  <Chip
                    key={ft.label}
                    icon={ft.icon}
                    label={ft.label}
                    size="small"
                    color={ft.color}
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 24 }}
                  />
                ))}
              </Stack>
            </Grid>

            {/* Drop Zone */}
            {files.length < MAX_FILES && (
              <Grid size={12}>
                <Paper
                  variant="outlined"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    p: 3,
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
                  <UploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 0.5 }} />
                  <Typography variant="body1" fontWeight={500}>
                    Arraste ficheiros ou clique para selecionar
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Máximo {MAX_FILES} ficheiros por upload
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
              </Grid>
            )}

            {/* File List with description fields */}
            {files.length > 0 && (
              <Grid size={12}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Ficheiros selecionados ({files.length}/{MAX_FILES})
                </Typography>

                <List dense disablePadding>
                  {files.map((f, index) => (
                    <ListItem
                      key={`${f.file.name}-${index}`}
                      disableGutters
                      sx={{
                        bgcolor: alpha(theme.palette.background.default, 0.6),
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                        mb: 1,
                        p: 1.5,
                        flexDirection: 'column',
                        alignItems: 'stretch',
                      }}
                    >
                      {/* File info row */}
                      <Box display="flex" alignItems="center" gap={1} width="100%">
                        {getFileIcon(f.file.name)}
                        <Box flex={1} minWidth={0}>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {f.file.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(f.file.size)}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveFile(index)}
                          disabled={isLoading}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      {/* Description field */}
                      <TextField
                        value={f.description}
                        onChange={(e) => handleDescriptionChange(index, e.target.value)}
                        placeholder="Descrição do ficheiro (obrigatório)"
                        variant="outlined"
                        size="small"
                        fullWidth
                        disabled={isLoading}
                        required
                        error={validationError && !f.description.trim()}
                        sx={{ mt: 1 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            )}

            {/* Validation / API errors */}
            {validationError && (
              <Grid size={12}>
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  {validationError}
                </Alert>
              </Grid>
            )}

            {files.length >= MAX_FILES && (
              <Grid size={12}>
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  Limite de {MAX_FILES} ficheiros atingido.
                </Alert>
              </Grid>
            )}

            {addAnnexMutation.isError && (
              <Grid size={12}>
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  Erro ao adicionar anexos: {addAnnexMutation.error?.message}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleRequestClose} color="inherit" disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={showSuccess ? 'success' : 'primary'}
            onClick={handleSubmit}
            disabled={files.length === 0 || isLoading || showSuccess}
            startIcon={
              isLoading
                ? <CircularProgress size={20} />
                : showSuccess
                  ? <CheckIcon />
                  : <AddIcon />
            }
          >
            {isLoading ? 'A enviar...' : showSuccess ? 'Concluído!' : 'Adicionar Anexos'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Confirmation Dialog */}
      <Dialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        maxWidth="xs"
      >
        <DialogTitle>Descartar ficheiros?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {files.length} ficheiro(s) selecionado(s) serão descartados. Deseja realmente sair?
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

export default AddAnnexModal;
