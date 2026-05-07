import React, { useRef } from 'react';
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
  alpha,
  useTheme
} from '@mui/material';
import { 
  ArrowBack as BackIcon, 
  CloudUpload as UploadIcon,
  Description as FileIcon,
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
  Send as SendIcon
} from '@mui/icons-material';

const Step3Review = ({ formData, setFormData, onFinish, onBack, isSubmitting }) => {
  const theme = useTheme();
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles = selectedFiles.map(file => ({
      file,
      description: file.name
    }));
    setFormData(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
        Finalizar Requerimento
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Anexe os documentos necessários e reveja os dados antes de submeter.
      </Typography>

      <Grid container spacing={4}>
        {/* Upload de Ficheiros */}
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <UploadIcon color="primary" sx={{ fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={700}>Anexos e Documentos</Typography>
          </Box>
          
          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 4,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              bgcolor: alpha(theme.palette.primary.main, 0.02),
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.05)
              }
            }}
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <UploadIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Clique para carregar ficheiros
            </Typography>
            <Typography variant="caption" color="text.disabled">
              PDF, Imagens (Máx. 10MB por ficheiro)
            </Typography>
          </Box>

          <List sx={{ mt: 2 }}>
            {formData.files.map((f, i) => (
              <ListItem 
                key={i}
                secondaryAction={
                  <IconButton edge="end" onClick={() => removeFile(i)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
                sx={{ 
                  bgcolor: alpha(theme.palette.divider, 0.05), 
                  borderRadius: 2, 
                  mb: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <FileIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={f.file.name} 
                  secondary={`${(f.file.size / 1024).toFixed(1)} KB`}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                />
              </ListItem>
            ))}
          </List>
        </Grid>

        {/* Resumo */}
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SuccessIcon color="primary" sx={{ fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={700}>Resumo do Pedido</Typography>
          </Box>
          <Paper sx={{ p: 2.5, borderRadius: 4, bgcolor: alpha(theme.palette.divider, 0.03), border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.disabled">Tipo de Pedido</Typography>
                <Typography variant="body2" fontWeight={700}>{formData.typeName}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.disabled">Localização</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formData.address}, {formData.postal}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.disabled">Descrição</Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  "{formData.text.length > 100 ? formData.text.substring(0, 100) + '...' : formData.text}"
                </Typography>
              </Box>
            </Stack>
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
          endIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          sx={{ 
            borderRadius: '12px', 
            px: 4,
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`
          }}
        >
          {isSubmitting ? 'A Submeter...' : 'Confirmar e Submeter'}
        </Button>
      </Box>
    </Box>
  );
};

export default Step3Review;
