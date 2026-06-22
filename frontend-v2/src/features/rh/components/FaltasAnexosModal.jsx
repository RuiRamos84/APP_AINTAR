import { useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Typography, Box, Divider, IconButton,
  Tooltip, Chip, CircularProgress, Alert, List, ListItem,
  ListItemText,
} from '@mui/material';
import {
  AttachFile as AnexoIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  UploadFile as UploadIcon,
  PictureAsPdf as PdfIcon,
  Image as ImgIcon,
  Description as DocIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useFaltasAnexos } from '../hooks/useFaltasAnexos';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { downloadAnexoFalta } from '../services/rhService';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import { RH_COLOR as COLOR } from '../utils/rhUtils';

const TIPO_ICON = {
  '.pdf':  PdfIcon,
  '.jpg':  ImgIcon,
  '.jpeg': ImgIcon,
  '.png':  ImgIcon,
};

const getIcon = (filename) => {
  const ext = ('.' + filename.split('.').pop()).toLowerCase();
  const Icon = TIPO_ICON[ext] || DocIcon;
  return <Icon sx={{ fontSize: 20, color: 'text.secondary' }} />;
};

const fmtBytes = (b) => {
  if (!b) return '';
  if (b < 1024)       return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const ALLOWED = '.pdf,.jpg,.jpeg,.png,.docx,.doc';

const ZonaUpload = ({ onFiles, isUploading }) => {
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) onFiles(files);
    e.target.value = '';
  };

  return (
    <Box
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      sx={{
        border: `2px dashed`,
        borderColor: alpha(COLOR, 0.4),
        borderRadius: 2,
        p: 3,
        textAlign: 'center',
        cursor: isUploading ? 'wait' : 'pointer',
        bgcolor: alpha(COLOR, 0.03),
        transition: 'all 0.15s',
        '&:hover': { bgcolor: alpha(COLOR, 0.07), borderColor: COLOR },
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED}
        multiple
        hidden
        onChange={handleChange}
      />
      {isUploading ? (
        <Stack alignItems="center" spacing={1}>
          <CircularProgress size={28} sx={{ color: COLOR }} />
          <Typography variant="body2" color="text.secondary">A carregar…</Typography>
        </Stack>
      ) : (
        <Stack alignItems="center" spacing={0.5}>
          <UploadIcon sx={{ fontSize: 32, color: alpha(COLOR, 0.5) }} />
          <Typography variant="body2" fontWeight={600}>
            Arraste ficheiros aqui ou clique para seleccionar
          </Typography>
          <Typography variant="caption" color="text.secondary">
            PDF, JPEG, PNG, DOCX — máx. 10 ficheiros
          </Typography>
        </Stack>
      )}
    </Box>
  );
};


const FaltasAnexosModal = ({ open, onClose, falta }) => {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('rh.edit');

  const { upload, isUploading, remove, isRemoving, download } = useFaltasAnexos(falta?.pk);

  const [preview, setPreview] = useState(null); // { url, filename, nomeOriginal }
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handlePreview = async (doc) => {
    setLoadingPreview(true);
    setPreview({ url: null, filename: doc.filename, nomeOriginal: doc.nome_original });
    try {
      const blob = await downloadAnexoFalta(falta.pk, doc.filename);
      const url  = URL.createObjectURL(blob);
      setPreview({ url, filename: doc.filename, nomeOriginal: doc.nome_original });
    } catch {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const documentos = falta?.documentos || [];

  const handleFiles = async (files) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    await upload(formData);
  };

  const handleRemove = async (filename) => {
    if (!window.confirm('Remover este anexo?')) return;
    await remove(filename);
  };

  if (!falta) return null;

  const dataLabel = falta.data
    ? new Date(falta.data + 'T00:00:00').toLocaleDateString('pt-PT', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <AnexoIcon sx={{ color: COLOR }} />
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              Anexos da Falta
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {falta.colaborador_nome} · {dataLabel} · {falta.tipo_descr}
            </Typography>
          </Box>
          <Chip
            label={`${documentos.length} ficheiro${documentos.length !== 1 ? 's' : ''}`}
            size="small"
            color={documentos.length > 0 ? 'primary' : 'default'}
            variant="outlined"
            sx={{ ml: 'auto' }}
          />
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {/* Zona de upload (apenas quem pode editar) */}
        {canEdit && (
          <Box sx={{ mb: 2 }}>
            <ZonaUpload onFiles={handleFiles} isUploading={isUploading} />
          </Box>
        )}

        {/* Lista de anexos */}
        {documentos.length === 0 ? (
          <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
            Sem anexos. {canEdit ? 'Carregue documentos acima.' : ''}
          </Alert>
        ) : (
          <List dense disablePadding>
            {documentos.map((doc, i) => (
              <Box key={doc.pk || i}>
                {i > 0 && <Divider component="li" />}
                <ListItem
                  sx={{ px: 0, py: 0.75 }}
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Pré-visualizar">
                        <IconButton size="small" onClick={() => handlePreview(doc)}>
                          <PreviewIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Descarregar">
                        <IconButton
                          size="small"
                          onClick={() => download(doc.filename, doc.nome_original)}
                        >
                          <DownloadIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      {canEdit && (
                        <Tooltip title="Remover">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={isRemoving}
                              onClick={() => handleRemove(doc.filename)}
                            >
                              <DeleteIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Stack>
                  }
                >
                  <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                    {getIcon(doc.filename)}
                  </Box>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 260 }}>
                        {doc.nome_original || doc.filename}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {fmtBytes(doc.tamanho)}
                        {doc.data && ` · ${new Date(doc.data).toLocaleDateString('pt-PT')}`}
                      </Typography>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>

      <DocumentPreviewDialog
        open={!!preview}
        onClose={handleClosePreview}
        url={preview?.url}
        filename={preview?.filename}
        nomeOriginal={preview?.nomeOriginal}
        isLoading={loadingPreview}
        onDownload={() => download(preview.filename, preview.nomeOriginal)}
      />
    </Dialog>
  );
};

export default FaltasAnexosModal;
