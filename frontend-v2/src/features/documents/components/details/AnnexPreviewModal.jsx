import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import api from '../../../../services/api/client';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const PDF_EXTENSIONS = ['pdf'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'avi'];

const isPreviewable = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext) || PDF_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext);
};

const getFileType = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  return 'other';
};

/**
 * Modal for previewing image and PDF annexes
 * Fetches files via authenticated API and renders them inline
 */
const AnnexPreviewModal = ({ open, onClose, annex, regnumber, annexes = [], onNavigate }) => {
  const theme = useTheme();
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);

  const fileType = getFileType(annex?.filename);

  // Find current index for navigation
  const previewableAnnexes = annexes.filter((a) => isPreviewable(a.filename));
  const currentIndex = previewableAnnexes.findIndex((a) => a.pk === annex?.pk);

  // Fetch the file as blob when annex changes
  useEffect(() => {
    if (!open || !annex?.filename || !regnumber) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setBlobUrl(null);
    setZoom(1);

    const fetchFile = async () => {
      try {
        const response = await api.get(`/files/${regnumber}/${annex.filename}`, {
          responseType: 'blob',
          // Skip the default response interceptor that extracts .data
          transformResponse: undefined,
        });

        if (cancelled) return;

        // The interceptor may have already extracted .data, so handle both cases
        const rawData = response instanceof Blob ? response : response?.data || response;
        const blob = rawData instanceof Blob ? rawData : new Blob([rawData]);
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err) {
        if (!cancelled) {
          setError('Não foi possível carregar o ficheiro.');
          console.error('Preview fetch error:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFile();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [open, annex?.filename, annex?.pk, regnumber]);

  // Cleanup on close
  const handleClose = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setZoom(1);
    onClose();
  };

  // Download
  const handleDownload = () => {
    if (blobUrl) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = annex.filename;
      link.click();
    }
  };

  // Navigation
  const handlePrev = () => {
    if (currentIndex > 0 && onNavigate) {
      onNavigate(previewableAnnexes[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < previewableAnnexes.length - 1 && onNavigate) {
      onNavigate(previewableAnnexes[currentIndex + 1]);
    }
  };

  // Zoom (images only)
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  if (!annex) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            height: '85vh',
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
          },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          pb: 1,
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box minWidth={0} flex={1}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {annex.descr || annex.filename}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {annex.filename}
              {previewableAnnexes.length > 1 && ` — ${currentIndex + 1} de ${previewableAnnexes.length}`}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            {fileType === 'image' && (
              <>
                <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
                <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </Typography>
                <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= 3}>
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </>
            )}
            <IconButton size="small" onClick={handleDownload} disabled={!blobUrl}>
              <DownloadIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      {/* Content */}
      <DialogContent
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 0,
          position: 'relative',
          overflow: 'auto',
        }}
      >
        {loading && (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              A carregar pré-visualização...
            </Typography>
          </Box>
        )}

        {error && (
          <Typography color="error" variant="body1">
            {error}
          </Typography>
        )}

        {!loading && !error && blobUrl && fileType === 'image' && (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              p: 2,
            }}
          >
            <Box
              component="img"
              src={blobUrl}
              alt={annex.descr || annex.filename}
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transform: `scale(${zoom})`,
                transformOrigin: 'center',
                transition: 'transform 0.2s ease',
                borderRadius: 1,
              }}
            />
          </Box>
        )}

        {!loading && !error && blobUrl && fileType === 'pdf' && (
          <Box
            component="iframe"
            src={blobUrl}
            title={annex.descr || annex.filename}
            sx={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        )}

        {!loading && !error && blobUrl && fileType === 'video' && (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
              bgcolor: '#000',
            }}
          >
            <Box
              component="video"
              src={blobUrl}
              controls
              autoPlay={false}
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: 1,
                outline: 'none',
              }}
            >
              O seu browser não suporta a reprodução deste vídeo.
            </Box>
          </Box>
        )}

        {/* Navigation arrows */}
        {previewableAnnexes.length > 1 && (
          <>
            <IconButton
              onClick={handlePrev}
              disabled={currentIndex <= 0}
              sx={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                '&:hover': { bgcolor: alpha(theme.palette.background.paper, 0.95) },
                boxShadow: 1,
              }}
            >
              <PrevIcon />
            </IconButton>
            <IconButton
              onClick={handleNext}
              disabled={currentIndex >= previewableAnnexes.length - 1}
              sx={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                '&:hover': { bgcolor: alpha(theme.palette.background.paper, 0.95) },
                boxShadow: 1,
              }}
            >
              <NextIcon />
            </IconButton>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { isPreviewable };
export default AnnexPreviewModal;
