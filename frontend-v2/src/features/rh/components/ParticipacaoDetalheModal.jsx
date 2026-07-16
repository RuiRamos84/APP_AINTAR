import { useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Stack, Typography, Chip, Divider, CircularProgress,
  List, ListItem, ListItemIcon, ListItemText, IconButton, Tooltip, Alert,
} from '@mui/material';
import {
  HowToReg as WorkflowIcon,
  WarningAmber as AvisoIcon,
  Schedule as HoraIcon,
  CalendarMonth as DiaIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon,
  AccessTime as PontoIcon,
  LocationOn as ForaLocalIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { useParticipacaoDetail, useParticipacaoWorkflow } from '../hooks/useParticipacao';
import { downloadAnexoParticipacao } from '../services/rhService';
import EstadoBadge from './EstadoBadge';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import ParticipacaoWfDialog from './ParticipacaoWfDialog';
import { fmtDate, fmtTime, stepFromEstado } from '../utils/rhUtils';

const FileIcon = ({ filename }) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  return ext === 'pdf'
    ? <PdfIcon fontSize="small" color="error" />
    : <ImageIcon fontSize="small" color="primary" />;
};

const fmtBytes = (b) => !b ? '' : b < 1024 * 1024
  ? `${(b / 1024).toFixed(0)} KB`
  : `${(b / 1048576).toFixed(1)} MB`;

// Drill-down de uma Participação de Ausência pendente — mostra ao
// supervisor/RH os dados recolhidos (motivo legal, pré-aviso, documentos
// justificativos, evidência do relógio de ponto) antes de validar/rejeitar.
const ParticipacaoDetalheModal = ({ open, onClose, pendente }) => {
  const [wfOpen, setWfOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const { hasPermission } = usePermissions();
  const isAdmin = hasPermission('rh.admin');

  const pk = pendente?.pk;
  const { participacao, isLoading, isError } = useParticipacaoDetail(open ? pk : null);
  const { workflow, isWorkflow } = useParticipacaoWorkflow();

  const handlePreview = useCallback(async (doc) => {
    setLoadingPreview(true);
    setPreview({ url: null, filename: doc.filename, nomeOriginal: doc.nome_original });
    try {
      const blob = await downloadAnexoParticipacao(pk, doc.filename);
      const url = URL.createObjectURL(blob);
      setPreview({ url, filename: doc.filename, nomeOriginal: doc.nome_original });
    } catch {
      toast.error('Erro ao carregar pré-visualização.');
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [pk]);

  const handleDownload = useCallback(async (doc) => {
    try {
      const blob = await downloadAnexoParticipacao(pk, doc.filename);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nome_original || doc.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao descarregar ficheiro.');
    }
  }, [pk]);

  const handleClosePreview = useCallback(() => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }, [preview]);

  if (!pendente) return null;

  const preAviso = participacao?.pre_aviso_dias;
  const preAvisoColor = preAviso == null ? 'default'
    : preAviso >= 5 ? 'success' : preAviso >= 0 ? 'warning' : 'error';
  const preAvisoLabel = preAviso == null ? ''
    : preAviso >= 5  ? `${preAviso} dias de antecedência`
    : preAviso === 0 ? 'Aviso no próprio dia'
    : preAviso > 0   ? `${preAviso} dia(s) de antecedência — inferior ao mínimo legal (5)`
    : `Registo retroativo (${Math.abs(preAviso)} dia(s) após o evento)`;

  const documentos = participacao?.documentos || [];
  const temPontoEvidencia = participacao?.ponto_saida_ts || participacao?.ponto_regresso_ts;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
            <Typography variant="h6" fontWeight={700}>
              {pendente.colaborador_nome}
            </Typography>
            <EstadoBadge descr={pendente.estado_descr} cor={pendente.estado_cor} />
          </Stack>
        </DialogTitle>

        <DialogContent>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : isError || !participacao ? (
            <Alert severity="error">Erro ao carregar os dados da participação.</Alert>
          ) : (
            <Stack spacing={2} sx={{ pt: 0.5 }}>
              <Box>
                <Chip
                  icon={participacao.tipo === 'parcial' ? <HoraIcon sx={{ fontSize: '14px !important' }} /> : <DiaIcon sx={{ fontSize: '14px !important' }} />}
                  label={participacao.tipo === 'parcial' ? 'Ausência parcial' : 'Dia(s) completo(s)'}
                  size="small" variant="outlined" sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Período: {fmtDate(participacao.data_inicio)}
                  {participacao.tipo === 'dia' && participacao.data_fim !== participacao.data_inicio
                    ? ` a ${fmtDate(participacao.data_fim)}` : ''}
                  {participacao.tipo === 'parcial'
                    ? ` · ${fmtTime(participacao.hora_inicio)} – ${fmtTime(participacao.hora_fim)}` : ''}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Motivo legal</Typography>
                {participacao.motivo_artigo ? (
                  <Typography variant="body2">
                    <strong>{participacao.motivo_artigo}</strong> — {participacao.motivo_descricao}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.disabled">Sem motivo especificado</Typography>
                )}
              </Box>

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Comunicado em {fmtDate(participacao.data_participacao)}
                  </Typography>
                  {preAviso !== null && (
                    <Chip icon={preAviso < 5 ? <AvisoIcon /> : undefined}
                      label={preAvisoLabel} color={preAvisoColor} size="small" variant="outlined" />
                  )}
                </Stack>
              </Box>

              {participacao.observacoes && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Observações</Typography>
                  <Typography variant="body2">{participacao.observacoes}</Typography>
                </Box>
              )}

              {temPontoEvidencia && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      Evidência do relógio de ponto
                    </Typography>
                    <Stack spacing={0.5}>
                      {participacao.ponto_saida_ts && (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <PontoIcon fontSize="small" color="action" />
                          <Typography variant="body2">Saída temporária: {fmtTime(participacao.ponto_saida_ts)}</Typography>
                          {participacao.ponto_saida_fora_local && (
                            <Tooltip title="Registada fora do local definido">
                              <ForaLocalIcon fontSize="small" color="warning" />
                            </Tooltip>
                          )}
                        </Stack>
                      )}
                      {participacao.ponto_regresso_ts && (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <PontoIcon fontSize="small" color="action" />
                          <Typography variant="body2">Regresso: {fmtTime(participacao.ponto_regresso_ts)}</Typography>
                          {participacao.ponto_regresso_fora_local && (
                            <Tooltip title="Registado fora do local definido">
                              <ForaLocalIcon fontSize="small" color="warning" />
                            </Tooltip>
                          )}
                        </Stack>
                      )}
                    </Stack>
                  </Box>
                </>
              )}

              <Divider />

              <Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Documentos justificativos {documentos.length > 0 ? `(${documentos.length})` : ''}
                </Typography>
                {documentos.length === 0 ? (
                  <Typography variant="body2" color="text.disabled">Sem documentos anexados</Typography>
                ) : (
                  <List dense disablePadding>
                    {documentos.map((doc) => (
                      <ListItem key={doc.pk} disablePadding
                        sx={{ borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                        secondaryAction={
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Pré-visualizar">
                              <IconButton size="small" onClick={() => handlePreview(doc)}>
                                <PreviewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Descarregar">
                              <IconButton size="small" onClick={() => handleDownload(doc)}>
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        }
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <FileIcon filename={doc.filename} />
                        </ListItemIcon>
                        <ListItemText
                          primary={doc.nome_original}
                          secondary={fmtBytes(doc.tamanho)}
                          primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Fechar</Button>
          <Button
            variant="contained"
            startIcon={<WorkflowIcon />}
            disabled={!participacao}
            onClick={() => setWfOpen(true)}
          >
            Validar / Rejeitar
          </Button>
        </DialogActions>
      </Dialog>

      <ParticipacaoWfDialog
        open={wfOpen}
        onClose={() => setWfOpen(false)}
        target={participacao}
        initialStep={stepFromEstado(participacao?.ts_estado_fk)}
        onConfirm={workflow}
        isLoading={isWorkflow}
        isAdmin={isAdmin}
      />

      <DocumentPreviewDialog
        open={!!preview}
        onClose={handleClosePreview}
        url={preview?.url}
        filename={preview?.filename}
        nomeOriginal={preview?.nomeOriginal}
        isLoading={loadingPreview}
        onDownload={() => handleDownload({ filename: preview.filename, nome_original: preview.nomeOriginal })}
      />
    </>
  );
};

export default ParticipacaoDetalheModal;
