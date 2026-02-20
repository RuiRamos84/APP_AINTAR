import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Typography,
  Tooltip,
  Button,
  CircularProgress,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Videocam as VideoIcon,
  Visibility as PreviewIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { formatDate } from '../../utils/documentUtils';
import { useDocumentAnnexes } from '../../hooks/useDocuments';
import AddAnnexModal from '../modals/AddAnnexModal';
import AnnexPreviewModal, { isPreviewable } from './AnnexPreviewModal';

const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <PdfIcon color="error" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <ImageIcon color="primary" />;
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return <VideoIcon color="secondary" />;
  return <FileIcon />;
};

/**
 * Annexes List Component - fetches and displays document annexes
 * Supports inline preview for images and PDFs
 */
const DocumentAnnexes = ({ documentId, regnumber }) => {
  const theme = useTheme();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [previewAnnex, setPreviewAnnex] = useState(null);

  const { data: annexes, isLoading, error } = useDocumentAnnexes(documentId);

  const handleDownload = (annex) => {
    if (annex.url || annex.file_url) {
      window.open(annex.url || annex.file_url, '_blank');
    }
  };

  const handlePreview = (annex) => {
    if (isPreviewable(annex.filename) && regnumber) {
      setPreviewAnnex(annex);
    }
  };

  return (
    <Box>
      {/* Header with Add button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          Anexos
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={() => setIsAddOpen(true)}
        >
          Adicionar
        </Button>
      </Box>

      {/* Loading */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error */}
      {error && (
        <Typography color="error" sx={{ p: 2 }}>
          Erro ao carregar anexos.
        </Typography>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!annexes || annexes.length === 0) && (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: alpha(theme.palette.background.default, 0.5),
            borderRadius: 2,
          }}
        >
          <Typography color="text.secondary">
            Não existem anexos para este documento.
          </Typography>
        </Box>
      )}

      {/* Annexes List */}
      {!isLoading && annexes && annexes.length > 0 && (
        <List>
          {annexes.map((annex, index) => {
            const canPreview = isPreviewable(annex.filename) && regnumber;
            return (
              <ListItem
                key={annex.pk || index}
                sx={{
                  bgcolor: 'background.paper',
                  mb: 1,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  cursor: canPreview ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                  '&:hover': canPreview
                    ? {
                        borderColor: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                      }
                    : {},
                }}
                onClick={() => canPreview && handlePreview(annex)}
                secondaryAction={
                  <Box display="flex" gap={0.5}>
                    {canPreview && (
                      <Tooltip title="Pré-visualizar">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(annex);
                          }}
                        >
                          <PreviewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Descarregar">
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(annex);
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                    {getFileIcon(annex.filename)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {annex.descr || annex.filename}
                      </Typography>
                      {canPreview && (
                        <Chip
                          label={annex.filename?.split('.').pop()?.toUpperCase()}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ fontSize: '0.65rem', height: 20 }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(annex.data)} {annex.filename && `• ${annex.filename}`}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      )}

      {/* Add Annex Modal */}
      <AddAnnexModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        documentId={documentId}
      />

      {/* Preview Modal */}
      <AnnexPreviewModal
        open={!!previewAnnex}
        onClose={() => setPreviewAnnex(null)}
        annex={previewAnnex}
        regnumber={regnumber}
        annexes={annexes || []}
        onNavigate={(nextAnnex) => setPreviewAnnex(nextAnnex)}
      />
    </Box>
  );
};

export default DocumentAnnexes;
