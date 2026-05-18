import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip,
  CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, Paper, Stack, Switch, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  LinkOff as DisconnectIcon,
  Sensors as SensorIcon,
  CheckCircle as ConnectedIcon,
  OpenInBrowser as OpenInBrowserIcon,
  GroupAdd as GroupAddIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import notification from '@/core/services/notification';
import { whatsappAlertasService } from '../api/whatsappAlertasService';

const WA_COLOR       = '#25d366';
const POLL_ACTIVE    = 3000;
const POLL_IDLE      = 30000;
const SEVERITY_COLOR = { critical: 'error', high: 'warning', medium: 'info', low: 'success' };

function StatusChip({ status }) {
  if (status === 'connected')    return <Chip icon={<ConnectedIcon />} label="Ligado"        color="success" size="small" />;
  if (status === 'browser_open') return <Chip icon={<WhatsAppIcon />}  label="Chrome aberto" color="info"    size="small" />;
  if (status === 'qr_pending')   return <Chip icon={<WhatsAppIcon />}  label="Aguarda scan"  color="warning" size="small" />;
  if (status === 'loading')      return <Chip                           label="A ligar..."                   size="small" />;
  return                                <Chip                           label="Desligado"    color="default" size="small" />;
}

// ── VBF — form para adicionar grupo via link de convite ──────────────────────
function AddGroupDialog({ open, onClose, onSuccess, isConnected }) {
  const [inviteLink, setInviteLink] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => { if (!open) { setInviteLink(''); setError(''); } }, [open]);

  const handleSubmit = async () => {
    setError('');
    const code = inviteLink.replace('https://chat.whatsapp.com/', '').trim();
    if (!code) { setError('Link de convite obrigatório'); return; }
    if (!isConnected) { setError('O WhatsApp tem de estar ligado para entrar num grupo'); return; }

    setLoading(true);
    try {
      const joinData = await whatsappAlertasService.entrarGrupo(code);
      const groupId  = joinData.groupId;
      if (!groupId) throw new Error('Não foi possível obter o ID do grupo');

      let groupName = groupId;
      try {
        const gruposData = await whatsappAlertasService.getGrupos();
        const match = (gruposData.groups ?? []).find(g => g.id === groupId);
        if (match) groupName = match.name;
      } catch { /* nome não crítico */ }

      const fullLink = inviteLink.startsWith('https://') ? inviteLink : `https://chat.whatsapp.com/${code}`;
      await whatsappAlertasService.addGrupoConfig(groupId, groupName, fullLink);
      notification.success(`Grupo "${groupName}" adicionado com sucesso`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao adicionar grupo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, borderTop: `4px solid ${WA_COLOR}` } } }}
    >
      <DialogTitle sx={{ pb: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <GroupAddIcon sx={{ color: WA_COLOR }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Adicionar Grupo</Typography>
            <Typography variant="caption" color="text.secondary">
              Introduz o link de convite do grupo WhatsApp
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!isConnected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            O WhatsApp precisa de estar ligado para entrar num grupo.
          </Alert>
        )}
        <TextField
          label="Link de convite"
          placeholder="https://chat.whatsapp.com/..."
          value={inviteLink}
          onChange={(e) => setInviteLink(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          fullWidth size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LinkIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          helperText="Cola o link de convite do grupo (ex: https://chat.whatsapp.com/AbCdEf...)"
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !inviteLink.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <GroupAddIcon />}
          sx={{ bgcolor: WA_COLOR, '&:hover': { bgcolor: '#1ebe57' }, minWidth: 140 }}
        >
          {loading ? 'A entrar...' : 'Entrar e Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function WhatsAppAlertasPage() {
  const [waStatus,      setWaStatus]      = useState('disconnected');
  const [alerta,        setAlerta]        = useState(null);
  const [grupos,        setGrupos]        = useState([]);
  const [sending,       setSending]       = useState({});
  const [loadingAlerta, setLoadingAlerta] = useState(false);
  const [addOpen,       setAddOpen]       = useState(false);

  // polling estado WhatsApp
  const fetchStatus = useCallback(async () => {
    try {
      const data = await whatsappAlertasService.getStatus();
      setWaStatus(data.status ?? 'disconnected');
    } catch { setWaStatus('disconnected'); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const isTransitional = waStatus === 'loading' || waStatus === 'browser_open';
  useEffect(() => {
    const id = setInterval(fetchStatus, isTransitional ? POLL_ACTIVE : POLL_IDLE);
    return () => clearInterval(id);
  }, [fetchStatus, isTransitional]);

  // grupos configurados (VBL)
  const loadGrupos = useCallback(async () => {
    try {
      const data = await whatsappAlertasService.getGruposConfig();
      setGrupos(data.groups ?? []);
    } catch {}
  }, []);

  useEffect(() => { loadGrupos(); }, [loadGrupos]);

  // último alerta
  const loadAlerta = useCallback(async () => {
    setLoadingAlerta(true);
    try {
      setAlerta(await whatsappAlertasService.getUltimoAlerta());
    } catch (err) {
      if (err?.response?.status !== 404) notification.error('Erro ao carregar alerta');
      setAlerta(null);
    } finally { setLoadingAlerta(false); }
  }, []);

  useEffect(() => { loadAlerta(); }, [loadAlerta]);

  // ações de ligação
  const handleAbrir = async () => {
    try {
      await whatsappAlertasService.abrirWhatsApp();
      setWaStatus('browser_open');
    } catch (err) {
      notification.error(err?.response?.data?.message ?? 'Erro ao abrir Chrome');
    }
  };

  const handleDesligar = () => {
    setWaStatus('disconnected');
    notification.info('Sessão WhatsApp terminada');
    whatsappAlertasService.desligar().catch(() => {});
  };

  // ações de grupos
  const handleToggle = async (grupo) => {
    try {
      await whatsappAlertasService.toggleGrupoConfig(grupo.pk, !grupo.ativo);
      setGrupos(prev => prev.map(g => g.pk === grupo.pk ? { ...g, ativo: !grupo.ativo } : g));
    } catch { notification.error('Erro ao actualizar estado do grupo'); }
  };

  const handleDelete = async (pk) => {
    try {
      await whatsappAlertasService.removeGrupoConfig(pk);
      setGrupos(prev => prev.filter(g => g.pk !== pk));
      notification.success('Grupo removido');
    } catch { notification.error('Erro ao remover grupo'); }
  };

  const handleEnviar = async (groupId, groupName) => {
    if (!alerta) { notification.warning('Nenhum alerta disponível'); return; }
    setSending(prev => ({ ...prev, [groupId]: true }));
    try {
      await whatsappAlertasService.enviarParaGrupo(groupId, alerta.pk ?? null);
      notification.success(`Alerta enviado para "${groupName}"`);
      loadAlerta();
    } catch (err) {
      notification.error(err?.response?.data?.message ?? 'Erro ao enviar');
    } finally { setSending(prev => ({ ...prev, [groupId]: false })); }
  };

  const isConnected = waStatus === 'connected';

  return (
    <ModulePage
      title="Alertas WhatsApp"
      subtitle="Envio manual de alertas de sensores via WhatsApp"
      icon={WhatsAppIcon}
      color={WA_COLOR}
      breadcrumbs={[{ label: 'Gestão' }, { label: 'Alertas WhatsApp' }]}
    >
      <Stack spacing={3} maxWidth={700}>

        {/* ── Ligação ─────────────────────────────────────────────── */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Ligação</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <StatusChip status={waStatus} />
                <Tooltip title="Actualizar">
                  <IconButton size="small" onClick={fetchStatus}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            {waStatus === 'disconnected' && (
              <Stack alignItems="center" spacing={2} py={2}>
                <WhatsAppIcon sx={{ fontSize: 52, color: WA_COLOR }} />
                <Button
                  variant="contained" size="large"
                  startIcon={<OpenInBrowserIcon />}
                  onClick={handleAbrir}
                  sx={{ bgcolor: WA_COLOR, '&:hover': { bgcolor: '#1ebe57' } }}
                >
                  Abrir WhatsApp Web
                </Button>
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  Abre o Chrome com web.whatsapp.com — faça o scan com o telemóvel
                </Typography>
              </Stack>
            )}

            {waStatus === 'browser_open' && (
              <Stack alignItems="center" spacing={2} py={2}>
                <Alert severity="info" sx={{ py: 0.5, width: '100%' }}>
                  <strong>Chrome aberto com web.whatsapp.com</strong><br />
                  No telemóvel: <strong>WhatsApp → Dispositivos Ligados → Ligar um dispositivo</strong><br />
                  Após o scan, <strong>feche o Chrome</strong> — a ligação é automática.
                </Alert>
                <CircularProgress size={28} sx={{ color: WA_COLOR }} />
              </Stack>
            )}

            {waStatus === 'loading' && (
              <Stack alignItems="center" spacing={2} py={3}>
                <CircularProgress size={36} sx={{ color: WA_COLOR }} />
                <Typography variant="body2" color="text.secondary">A ligar ao WhatsApp...</Typography>
              </Stack>
            )}

            {isConnected && (
              <Stack spacing={1.5}>
                <Alert severity="success" icon={<ConnectedIcon />} sx={{ py: 0.5 }}>
                  WhatsApp ligado. Pronto para enviar alertas.
                </Alert>
                <Button
                  variant="outlined" color="error" size="small"
                  startIcon={<DisconnectIcon />}
                  onClick={handleDesligar}
                >
                  Terminar sessão
                </Button>
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* ── Grupos configurados (VBL) ────────────────────────────── */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <WhatsAppIcon fontSize="small" sx={{ color: WA_COLOR }} />
                <Typography variant="h6">Grupos de Alertas</Typography>
              </Stack>
              <Button
                size="small" variant="outlined"
                startIcon={<GroupAddIcon />}
                onClick={() => setAddOpen(true)}
                sx={{
                  borderColor: WA_COLOR, color: WA_COLOR,
                  '&:hover': { borderColor: '#1ebe57', bgcolor: 'rgba(37,211,102,0.05)' },
                }}
              >
                Adicionar
              </Button>
            </Stack>

            {grupos.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}>
                <WhatsAppIcon sx={{ fontSize: 40, opacity: 0.2, mb: 1 }} />
                <Typography variant="body2">Nenhum grupo configurado.</Typography>
                <Typography variant="caption">
                  Clique em "Adicionar" para configurar um grupo de alertas.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}>
                        Grupo
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}>
                        Link de Convite
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, width: 80 }}>
                        Activo
                      </TableCell>
                      <TableCell sx={{ width: 90 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {grupos.map((g) => (
                      <TableRow key={g.pk} hover sx={{ opacity: g.ativo ? 1 : 0.5 }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{g.group_name}</Typography>
                          <Typography variant="caption" color="text.disabled" fontFamily="monospace" noWrap>
                            {g.group_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {g.invite_link ? (
                            <Tooltip title={g.invite_link}>
                              <Button
                                size="small" variant="text"
                                endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                                href={g.invite_link} target="_blank" rel="noopener noreferrer"
                                sx={{ color: WA_COLOR, fontSize: '0.75rem', p: 0, minWidth: 0, textTransform: 'none' }}
                              >
                                Abrir grupo
                              </Button>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            size="small"
                            checked={Boolean(g.ativo)}
                            onChange={() => handleToggle(g)}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': { color: WA_COLOR },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: WA_COLOR },
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title={
                              !isConnected ? 'WhatsApp desligado'
                              : !alerta    ? 'Sem alerta disponível'
                              :              'Enviar alerta para este grupo'
                            }>
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={!isConnected || !alerta || Boolean(sending[g.group_id])}
                                  onClick={() => handleEnviar(g.group_id, g.group_name)}
                                  sx={{ color: WA_COLOR }}
                                >
                                  {sending[g.group_id]
                                    ? <CircularProgress size={14} sx={{ color: WA_COLOR }} />
                                    : <SendIcon fontSize="small" />
                                  }
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Remover grupo">
                              <IconButton size="small" color="error" onClick={() => handleDelete(g.pk)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Último alerta de sensor ──────────────────────────────── */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <SensorIcon fontSize="small" color="primary" />
                <Typography variant="h6">Último Alerta de Sensor</Typography>
              </Stack>
              <Tooltip title="Recarregar">
                <IconButton size="small" onClick={loadAlerta} disabled={loadingAlerta}>
                  {loadingAlerta ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Stack>

            {alerta ? (
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip
                    label={alerta.alert_severity?.toUpperCase() ?? '—'}
                    color={SEVERITY_COLOR[alerta.alert_severity?.toLowerCase()] ?? 'default'}
                    size="small"
                  />
                  <Chip label={`Sensor: ${alerta.sensor_id}`} size="small" variant="outlined" />
                  <Chip
                    label={alerta.data ? new Date(alerta.data).toLocaleString('pt-PT') : '—'}
                    size="small" variant="outlined"
                  />
                  {alerta.whatsapp_sent && (
                    <Chip icon={<WhatsAppIcon />} label="Enviado" color="success" size="small" variant="outlined" />
                  )}
                </Stack>
                <Typography
                  variant="body2"
                  sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, whiteSpace: 'pre-wrap' }}
                >
                  {alerta.alert_message || '(sem mensagem)'}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {loadingAlerta ? 'A carregar...' : 'Nenhum alerta de sensor encontrado.'}
              </Typography>
            )}

            {!isConnected && alerta && (
              <Typography variant="caption" color="text.secondary" display="block" mt={1.5} textAlign="center">
                Ligue o WhatsApp para poder enviar alertas aos grupos.
              </Typography>
            )}
          </CardContent>
        </Card>

      </Stack>

      {/* VBF — dialog para adicionar grupo */}
      <AddGroupDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={loadGrupos}
        isConnected={isConnected}
      />

    </ModulePage>
  );
}
