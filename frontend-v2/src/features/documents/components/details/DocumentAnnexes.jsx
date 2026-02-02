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
  useTheme,
  alpha,
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { formatDate } from '../../utils/documentUtils';
import { useDocumentAnnexes } from '../../hooks/useDocuments';
import AddAnnexModal from '../modals/AddAnnexModal';

const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <PdfIcon color="error" />;
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <ImageIcon color="primary" />;
  return <FileIcon />;
};

/**
 * Annexes List Component - fetches and displays document annexes
 */
const DocumentAnnexes = ({ documentId }) => {
  const theme = useTheme();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: annexes, isLoading, error } = useDocumentAnnexes(documentId);

  const handleDownload = (annex) => {
    if (annex.url || annex.file_url) {
      window.open(annex.url || annex.file_url, '_blank');
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
          {annexes.map((annex, index) => (
            <ListItem
              key={annex.pk || index}
              sx={{
                bgcolor: 'background.paper',
                mb: 1,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
              }}
              secondaryAction={
                <Tooltip title="Descarregar">
                  <IconButton edge="end" onClick={() => handleDownload(annex)}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              }
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                  {getFileIcon(annex.filename)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={annex.descr || annex.filename}
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(annex.data)} {annex.filename && `\u2022 ${annex.filename}`}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Add Annex Modal */}
      <AddAnnexModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        documentId={documentId}
      />
    </Box>
  );
};

export default DocumentAnnexes;
