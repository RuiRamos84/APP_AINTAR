import React, { useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CloudUpload as UploadIcon,
  Description as FileIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Assignment as TypeIcon,
  LocationOn as LocationIcon,
  Notes as NotesIcon,
  AttachFile as AttachIcon,
} from '@mui/icons-material';

const Step3Review = ({ formData, setFormData, onFinish, onBack, isSubmitting }) => {
  const theme = useTheme();
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (selected) => {
    const newFiles = selected.map((file) => ({ file, description: file.name }));
    setFormData((prev) => ({ ...prev, files: [...prev.files, ...newFiles] }));
  };

  const handleFileChange = (e) => addFiles(Array.from(e.target.files || []));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files || []));
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const removeFile = (index) => {
    setFormData((prev) => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
  };

  const summaryRows = [
    {
      icon: <TypeIcon sx={{ fontSize: 18, color: 'primary.main' }} />,
      label: 'Tipo de Pedido',
      value: formData.typeName || '—',
    },
    {
      icon: <LocationIcon sx={{ fontSize: 18, color: 'primary.main' }} />,
      label: 'Localização',
      value: [formData.address, formData.postal].filter(Boolean).join(', ') || '—',
    },
    {
      icon: <NotesIcon sx={{ fontSize: 18, color: 'primary.main' }} />,
      label: 'Descrição',
      value: formData.text
        ? formData.text.length > 120
          ? formData.text.substring(0, 120) + '…'
          : formData.text
        : '—',
      italic: true,
    },
    {
      icon: <AttachIcon sx={{ fontSize: 18, color: 'primary.main' }} />,
      label: 'Anexos',
      value: formData.files.length > 0
        ? `${formData.files.length} ficheiro${formData.files.length > 1 ? 's' : ''}`
        : 'Nenhum anexo',
      chip: formData.files.length > 0,
    },
  ];

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        Finalizar Requerimento
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Anexe os documentos necessários e reveja os dados antes de submeter.
      </Typography>

      <Grid container spacing={4}>
        {/* Upload */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: 1.5,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UploadIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={700}>Anexos e Documentos</Typography>
            <Typography variant="caption" color="text.disabled">(opcional)</Typography>
          </Box>

          {/* Drop zone */}
          <Box
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            sx={{
              border: '2px dashed',
              borderColor: dragOver ? 'primary.main' : 'divider',
              borderRadius: 4,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              bgcolor: dragOver
                ? alpha(theme.palette.primary.main, 0.06)
                : alpha(theme.palette.primary.main, 0.02),
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              },
            }}
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <UploadIcon
              sx={{
                fontSize: 44, mb: 1,
                color: dragOver ? 'primary.main' : 'text.disabled',
                transition: 'color 0.2s',
              }}
            />
            <Typography variant="body2" fontWeight={600} gutterBottom>
              {dragOver ? 'Solte os ficheiros aqui' : 'Arraste ou clique para carregar'}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              PDF, Imagens — máx. 10 MB por ficheiro
            </Typography>
          </Box>

          {/* Lista de ficheiros */}
          {formData.files.length > 0 && (
            <List sx={{ mt: 2, p: 0 }}>
              {formData.files.map((f, i) => (
                <ListItem
                  key={i}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => removeFile(i)}
                      sx={{ color: 'error.main', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                  sx={{
                    bgcolor: alpha(theme.palette.divider, 0.04),
                    borderRadius: 2, mb: 1,
                    border: '1px solid', borderColor: 'divider',
                    pr: 6,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <FileIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={f.file.name}
                    secondary={`${(f.file.size / 1024).toFixed(1)} KB`}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Grid>

        {/* Resumo */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: 1.5,
              bgcolor: alpha(theme.palette.success.main, 0.1),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SendIcon sx={{ fontSize: 15, color: 'success.main' }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={700}>Resumo do Pedido</Typography>
          </Box>

          <Paper
            sx={{
              p: 0, borderRadius: 4, overflow: 'hidden',
              border: '1px solid', borderColor: 'divider',
              boxShadow: 'none',
            }}
          >
            {summaryRows.map((row, idx) => (
              <React.Fragment key={row.label}>
                <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ mt: 0.2, flexShrink: 0 }}>{row.icon}</Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {row.label}
                    </Typography>
                    {row.chip ? (
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={row.value}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: '0.78rem' }}
                        />
                      </Box>
                    ) : (
                      <Typography
                        variant="body2"
                        fontWeight={row.italic ? 400 : 600}
                        sx={{
                          fontStyle: row.italic ? 'italic' : 'normal',
                          color: row.italic ? 'text.secondary' : 'text.primary',
                          mt: 0.25,
                        }}
                      >
                        {row.value}
                      </Typography>
                    )}
                  </Box>
                </Box>
                {idx < summaryRows.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 6 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={onBack}
          disabled={isSubmitting}
          sx={{ borderRadius: '12px', px: 3 }}
        >
          Anterior
        </Button>
        <Button
          variant="contained"
          onClick={onFinish}
          disabled={isSubmitting}
          endIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
          sx={{
            borderRadius: '12px', px: 4,
            bgcolor: 'success.main',
            '&:hover': { bgcolor: 'success.dark' },
            boxShadow: `0 8px 16px ${alpha(theme.palette.success.main, 0.3)}`,
          }}
        >
          {isSubmitting ? 'A Submeter…' : 'Confirmar e Submeter'}
        </Button>
      </Box>
    </Box>
  );
};

export default Step3Review;
