import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  CircularProgress,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { documentsService } from '../../api/documentsService';

const FILE_TYPE_GROUPS = {
  pdf: ['pdf'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
  office: ['doc', 'docx', 'odt', 'rtf', 'xls', 'xlsx', 'csv', 'ods'],
  email: ['msg', 'eml', 'oft'],
};

const getFileGroup = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  for (const [group, exts] of Object.entries(FILE_TYPE_GROUPS)) {
    if (exts.includes(ext)) return group;
  }
  return 'unknown';
};

const getFileIconComponent = (filename) => {
  const group = getFileGroup(filename);
  if (group === 'pdf') return <PdfIcon fontSize="large" color="error" />;
  if (group === 'image') return <ImageIcon fontSize="large" color="primary" />;
  return <FileIcon fontSize="large" />;
};

/**
 * File Preview Modal - supports PDF, images, and provides download for other types
 */
const FilePreview = ({ open, onClose, regnumber, filename, displayName }) => {
  const theme = useTheme();
  const [fileUrl, setFileUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);

  const fileGroup = getFileGroup(filename);
  const canPreview = fileGroup === 'pdf' || fileGroup === 'image';

  const fetchFile = useCallback(async () => {
    if (!regnumber || !filename) return;
    setLoading(true);
    setError(null);

    try {
      const result = await documentsService.previewFile(regnumber, filename);
      setFileUrl(result.url);
    } catch (err) {
      console.error('Erro ao carregar ficheiro:', err);
      setError(err.response?.status === 404 ? 'Ficheiro não encontrado.' : 'Erro ao carregar ficheiro.');
    } finally {
      setLoading(false);
    }
  }, [regnumber, filename]);

  useEffect(() => {
    if (open && canPreview) {
      fetchFile();
    }
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
        setFileUrl(null);
      }
    };
  }, [open, canPreview, fetchFile]);

  const handleDownload = async () => {
    try {
      await documentsService.downloadFile(regnumber, filename, displayName || filename);
    } catch (err) {
      console.error('Erro ao descarregar:', err);
    }
  };

  const handleClose = () => {
    setZoom(1);
    setError(null);
    onClose();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 400, gap: 2 }}>
          {getFileIconComponent(filename)}
          <Typography color="error">{error}</Typography>
          <Button variant="outlined" onClick={fetchFile}>
            Tentar Novamente
          </Button>
        </Box>
      );
    }

    if (!canPreview) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 300, gap: 2 }}>
          {getFileIconComponent(filename)}
          <Typography variant="h6">{displayName || filename}</Typography>
          <Typography color="text.secondary">
            {fileGroup === 'email'
              ? 'Pré-visualização não disponível para ficheiros de email. Use o botão de download.'
              : 'Pré-visualização não disponível para este tipo de ficheiro.'}
          </Typography>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload}>
            Descarregar
          </Button>
        </Box>
      );
    }

    if (!fileUrl) return null;

    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          overflow: 'auto',
        }}
      >
        {fileGroup === 'pdf' ? (
          <iframe
            src={fileUrl}
            title="Visualizador PDF"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease',
            }}
          />
        ) : (
          <img
            src={fileUrl}
            alt={displayName || filename}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              transform: `scale(${zoom})`,
              transition: 'transform 0.2s ease',
            }}
          />
        )}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            height: { xs: '90vh', sm: '80vh' },
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 3,
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getFileIconComponent(filename)}
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {displayName || filename || 'Visualizador'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <DialogContent
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          p: 1,
        }}
      >
        {renderContent()}
      </DialogContent>

      {/* Footer with zoom controls + download */}
      {canPreview && (
        <DialogActions
          sx={{
            justifyContent: 'space-between',
            borderTop: `1px solid ${theme.palette.divider}`,
            px: 2,
            py: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Diminuir zoom">
              <span>
                <IconButton onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))} disabled={zoom <= 0.5}>
                  <ZoomOutIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Repor zoom">
              <span>
                <IconButton onClick={() => setZoom(1)} disabled={zoom === 1}>
                  <FullscreenIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Aumentar zoom">
              <span>
                <IconButton onClick={() => setZoom((z) => Math.min(z + 0.25, 3))} disabled={zoom >= 3}>
                  <ZoomInIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {Math.round(zoom * 100)}%
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={!fileUrl && canPreview}
            size="small"
          >
            Descarregar
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default FilePreview;
