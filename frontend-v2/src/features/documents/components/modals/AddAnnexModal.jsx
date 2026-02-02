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
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useAddAnnex } from '../../hooks/useDocuments';

const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <PdfIcon color="error" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <ImageIcon color="primary" />;
  return <FileIcon />;
};

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.docx,.xlsx,.eml,.msg';
const MAX_FILES = 5;

/**
 * Modal to add annexes to an existing document
 */
const AddAnnexModal = ({ open, onClose, documentId }) => {
  const theme = useTheme();
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const addAnnexMutation = useAddAnnex();

  const handleFileSelect = useCallback(
    (event) => {
      const selectedFiles = Array.from(event.target.files || []);
      const remaining = MAX_FILES - files.length;
      const newFiles = selectedFiles.slice(0, remaining).map((file) => ({
        file,
        description: '',
      }));
      setFiles((prev) => [...prev, ...newFiles]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [files.length]
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      const droppedFiles = Array.from(event.dataTransfer.files || []);
      const remaining = MAX_FILES - files.length;
      const newFiles = droppedFiles.slice(0, remaining).map((file) => ({
        file,
        description: '',
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length]
  );

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

  const handleClose = () => {
    setFiles([]);
    onClose();
  };

  const handleSubmit = () => {
    if (files.length === 0) return;

    const formData = new FormData();
    formData.append('tb_document', documentId);

    files.forEach((f) => {
      formData.append('files', f.file);
      formData.append('descr', f.description || f.file.name);
    });

    addAnnexMutation.mutate(formData, {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const isLoading = addAnnexMutation.isPending;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Adicionar Anexos</DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Drop Zone */}
          <Paper
            variant="outlined"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            sx={{
              p: 3,
              textAlign: 'center',
              borderStyle: 'dashed',
              borderColor: alpha(theme.palette.primary.main, 0.4),
              bgcolor: alpha(theme.palette.primary.main, 0.02),
              cursor: 'pointer',
              '&:hover': {
                borderColor: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              },
              borderRadius: 2,
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="body1" fontWeight={500}>
              Arraste ficheiros ou clique para selecionar
            </Typography>
            <Typography variant="caption" color="text.secondary">
              PDF, Imagens, Office, Email (max. {MAX_FILES} ficheiros)
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

          {/* File List */}
          {files.length > 0 && (
            <List dense>
              {files.map((f, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    <IconButton edge="end" size="small" onClick={() => handleRemoveFile(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                  sx={{
                    bgcolor: 'background.paper',
                    mb: 1,
                    borderRadius: 1,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <ListItemIcon>{getFileIcon(f.file.name)}</ListItemIcon>
                  <ListItemText
                    primary={f.file.name}
                    secondary={
                      <TextField
                        value={f.description}
                        onChange={(e) => handleDescriptionChange(index, e.target.value)}
                        placeholder="Descrição do ficheiro"
                        variant="standard"
                        size="small"
                        fullWidth
                        sx={{ mt: 0.5 }}
                      />
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}

          {files.length >= MAX_FILES && (
            <Alert severity="warning">Limite de {MAX_FILES} ficheiros atingido.</Alert>
          )}

          {addAnnexMutation.isError && (
            <Alert severity="error">
              Erro ao adicionar anexos: {addAnnexMutation.error?.message}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={files.length === 0 || isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Adicionar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddAnnexModal;
