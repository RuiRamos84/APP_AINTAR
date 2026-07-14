import { useRef, useState, useMemo, useCallback } from 'react';
import {
  Box, Stack, Typography, FormControl, InputLabel, Select, MenuItem,
  Button, List, ListItem, ListItemIcon, ListItemText, IconButton,
  Tooltip, Chip, CircularProgress, Alert, Divider, TextField,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  UploadFile as UploadIcon,
  PictureAsPdf as PdfIcon,
  Image as ImgIcon,
  Description as DocIcon,
  Visibility as PreviewIcon,
  EventBusy as ValidadeIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { useRhDocumentos, useTiposDocumento } from '../hooks/useRhDocumentos';
import { downloadDocumento } from '../services/rhService';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import { RH_COLOR as COLOR } from '../utils/rhUtils';

const TIPO_ICON = { '.pdf': PdfIcon, '.jpg': ImgIcon, '.jpeg': ImgIcon, '.png': ImgIcon };
const getIcon = (filename) => {
  const ext = ('.' + (filename || '').split('.').pop()).toLowerCase();
  const Icon = TIPO_ICON[ext] || DocIcon;
  return <Icon sx={{ fontSize: 20, color: 'text.secondary' }} />;
};

const fmtBytes = (b) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDate = (v) => v ? new Date(v).toLocaleDateString('pt-PT') : '—';

const currentYear = new Date().getFullYear();

// Mesma lógica de proximidade de prazo já usada em ColaboradorPerfilModal::SaldoTab
// (isLimiteProximo) — aqui devolve directamente a cor do chip.
const validadeCor = (dataValidade) => {
  if (!dataValidade) return null;
  const dias = (new Date(dataValidade) - new Date()) / (1000 * 60 * 60 * 24);
  if (dias < 0) return 'error';
  if (dias <= 30) return 'warning';
  return 'success';
};

const ColaboradorDocumentosTab = ({ colaborador }) => {
  const { hasPermission } = usePermissions();
  const isAdmin = hasPermission('rh.admin');

  const [anoSel, setAnoSel] = useState(currentYear);
  const [tipoUpload, setTipoUpload] = useState('');
  const [validadeUpload, setValidadeUpload] = useState('');
  const inputRef = useRef(null);

  const { tipos } = useTiposDocumento();
  const {
    documentos, isLoading, isError,
    upload, isUploading, remove, isRemoving, download,
  } = useRhDocumentos(colaborador?.pk);

  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const anosDisponiveis = useMemo(() => {
    const anos = new Set(documentos.filter(d => d.ano).map(d => d.ano));
    anos.add(currentYear);
    return Array.from(anos).sort((a, b) => b - a);
  }, [documentos]);

  const documentosFiltrados = useMemo(
    () => documentos.filter(d => anoSel === 'geral' ? !d.ano : d.ano === anoSel),
    [documentos, anoSel],
  );

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || !tipoUpload) return;
    upload({
      files,
      ano: anoSel === 'geral' ? null : anoSel,
      ttTipoFk: tipoUpload,
      dataValidade: validadeUpload || undefined,
    });
    setValidadeUpload('');
  }, [upload, anoSel, tipoUpload, validadeUpload]);

  const handlePreview = useCallback(async (doc) => {
    setLoadingPreview(true);
    setPreview({ url: null, filename: doc.filename, nomeOriginal: doc.nome_original });
    try {
      const blob = await downloadDocumento(doc.pk);
      const url = URL.createObjectURL(blob);
      setPreview({ url, filename: doc.filename, nomeOriginal: doc.nome_original, pk: doc.pk });
    } catch {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const handleClosePreview = useCallback(() => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }, [preview]);

  const handleRemove = useCallback(async (doc) => {
    if (!window.confirm(`Remover "${doc.nome_original}"?`)) return;
    await remove(doc.pk);
  }, [remove]);

  if (!colaborador) return null;

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Ano</InputLabel>
          <Select value={anoSel} label="Ano" onChange={e => setAnoSel(e.target.value)}>
            {anosDisponiveis.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            <MenuItem value="geral">Geral (sem ano)</MenuItem>
          </Select>
        </FormControl>

        {isAdmin && (
          <>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Categoria a carregar</InputLabel>
              <Select value={tipoUpload} label="Categoria a carregar" onChange={e => setTipoUpload(e.target.value)}>
                {tipos.map(t => <MenuItem key={t.pk} value={t.pk}>{t.descr}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label="Validade (opcional)"
              type="date"
              size="small"
              value={validadeUpload}
              onChange={e => setValidadeUpload(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 170 }}
            />
            <Tooltip title={!tipoUpload ? 'Escolha primeiro a categoria do documento' : ''}>
              <span>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={isUploading ? <CircularProgress size={16} /> : <UploadIcon />}
                  disabled={!tipoUpload || isUploading}
                  sx={{ borderColor: COLOR, color: COLOR }}
                >
                  Adicionar Ficheiros
                  <input ref={inputRef} type="file" hidden multiple
                    accept=".pdf,.jpg,.jpeg,.png,.docx,.doc" onChange={handleFileSelect} />
                </Button>
              </span>
            </Tooltip>
          </>
        )}
      </Stack>

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Erro ao carregar documentos.</Alert>}

      {isLoading ? (
        <CircularProgress size={24} />
      ) : documentosFiltrados.length === 0 ? (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
          Sem documentos {anoSel === 'geral' ? 'gerais' : `de ${anoSel}`}.
        </Alert>
      ) : (
        <List dense disablePadding>
          {documentosFiltrados.map((doc, i) => (
            <Box key={doc.pk}>
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
                      <IconButton size="small" onClick={() => download(doc.pk, doc.nome_original)}>
                        <DownloadIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    {isAdmin && (
                      <Tooltip title="Remover">
                        <IconButton size="small" color="error" disabled={isRemoving}
                          onClick={() => handleRemove(doc)}>
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                }
              >
                <ListItemIcon sx={{ minWidth: 32 }}>{getIcon(doc.filename)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 260 }}>
                        {doc.nome_original}
                      </Typography>
                      <Chip label={doc.tipo_descr} size="small" variant="outlined"
                        sx={{ bgcolor: alpha(COLOR, 0.06) }} />
                      {doc.data_validade && (
                        <Chip
                          icon={<ValidadeIcon sx={{ fontSize: '14px !important' }} />}
                          label={`Válido até ${fmtDate(doc.data_validade)}`}
                          size="small"
                          color={validadeCor(doc.data_validade)}
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {fmtBytes(doc.tamanho)} · {fmtDate(doc.created_at)}
                      {doc.uploaded_by_nome && ` · por ${doc.uploaded_by_nome}`}
                    </Typography>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            </Box>
          ))}
        </List>
      )}

      <DocumentPreviewDialog
        open={!!preview}
        onClose={handleClosePreview}
        url={preview?.url}
        filename={preview?.filename}
        nomeOriginal={preview?.nomeOriginal}
        isLoading={loadingPreview}
        onDownload={() => download(preview.pk, preview.nomeOriginal)}
      />
    </Box>
  );
};

export default ColaboradorDocumentosTab;
