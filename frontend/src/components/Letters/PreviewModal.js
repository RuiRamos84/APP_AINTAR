import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Box
} from '@mui/material';
import { Preview, Download } from '@mui/icons-material';
import api from '../../services/api';

const PreviewModal = ({ open, onClose, letterId, formData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (open && letterId && formData) {
      generatePreview();
    }

    // Cleanup ao fechar
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [open, letterId, formData]);

  const generatePreview = async () => {
    setLoading(true);
    setError(null);

    try {
      // Chamar endpoint de preview
      const response = await api.post(
        `/letters/${letterId}/preview`,
        formData,
        {
          responseType: 'blob',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Criar URL do blob
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error('Erro ao gerar preview:', err);
      setError(
        err.response?.data?.error ||
        'Erro ao gerar preview do ofício. Verifique os dados fornecidos.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = 'preview_oficio.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Preview />
          Pré-visualização do Ofício
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="400px"
          >
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {pdfUrl && !loading && (
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '600px',
              border: 'none'
            }}
            title="Preview do Ofício"
          />
        )}
      </DialogContent>

      <DialogActions>
        {pdfUrl && (
          <Button
            startIcon={<Download />}
            onClick={handleDownload}
            variant="outlined"
          >
            Baixar PDF
          </Button>
        )}
        <Button onClick={onClose}>
          Fechar
        </Button>
        {error && (
          <Button
            onClick={generatePreview}
            color="primary"
            variant="contained"
          >
            Tentar Novamente
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PreviewModal;
