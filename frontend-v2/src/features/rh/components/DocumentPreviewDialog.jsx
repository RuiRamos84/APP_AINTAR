import { useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Stack, CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as DocIcon,
} from '@mui/icons-material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const IMG_EXTS  = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const PDF_EXTS  = new Set(['.pdf']);

function getExt(filename) {
  if (!filename) return '';
  return ('.' + filename.split('.').pop()).toLowerCase();
}

const DocumentPreviewDialog = ({ open, onClose, url, filename, nomeOriginal, onDownload, isLoading }) => {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const ext      = getExt(filename);
  const nome     = nomeOriginal || filename || 'documento';

  // Limpar object URL ao fechar
  useEffect(() => {
    if (!open && url) {
      const id = setTimeout(() => URL.revokeObjectURL(url), 300);
      return () => clearTimeout(id);
    }
  }, [open, url]);

  const renderConteudo = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!url) return null;

    if (PDF_EXTS.has(ext)) {
      return (
        <Box sx={{ width: '100%', height: isMobile ? '60vh' : '75vh' }}>
          <iframe
            src={url}
            title={nome}
            width="100%"
            height="100%"
            style={{ border: 'none', borderRadius: 4 }}
          />
        </Box>
      );
    }

    if (IMG_EXTS.has(ext)) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <img
            src={url}
            alt={nome}
            style={{
              maxWidth: '100%',
              maxHeight: isMobile ? '60vh' : '75vh',
              objectFit: 'contain',
              borderRadius: 4,
            }}
          />
        </Box>
      );
    }

    // Formato sem suporte para pré-visualização (DOCX, etc.)
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 200, gap: 2 }}>
        <DocIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Pré-visualização não disponível para este tipo de ficheiro.
        </Typography>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={onDownload}>
          Descarregar {nome}
        </Button>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { height: isMobile ? '100%' : '92vh' } }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ maxWidth: '80%' }}>
            {nome}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 1, sm: 2 }, overflow: 'auto' }}>
        {renderConteudo()}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        {url && !isLoading && (
          <Button startIcon={<DownloadIcon />} onClick={onDownload} sx={{ mr: 'auto' }}>
            Descarregar
          </Button>
        )}
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentPreviewDialog;
