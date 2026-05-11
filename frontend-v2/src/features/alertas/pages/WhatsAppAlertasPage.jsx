import { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip,
  CircularProgress, IconButton, Stack, Tooltip, Typography,
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  LinkOff as DisconnectIcon,
  Sensors as SensorIcon,
  CheckCircle as ConnectedIcon,
  OpenInBrowser as OpenInBrowserIcon,
} from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import notification from '@/core/services/notification';
import { whatsappAlertasService } from '../api/whatsappAlertasService';

const POLL_ACTIVE_MS = 3000;   // estados transitórios (browser_open, loading)
const POLL_IDLE_MS   = 30000;  // estados estáveis (connected, disconnected)
const SEVERITY_COLOR = { critical: 'error', high: 'warning', medium: 'info', low: 'success' };

function StatusChip({ status }) {
  if (status === 'connected')    return <Chip icon={<ConnectedIcon />} label="Ligado"        color="success" size="small" />;
  if (status === 'browser_open') return <Chip icon={<WhatsAppIcon />}  label="Chrome aberto" color="info"    size="small" />;
  if (status === 'qr_pending')   return <Chip icon={<WhatsAppIcon />}  label="Aguarda scan"  color="warning" size="small" />;
  if (status === 'loading')      return <Chip                           label="A ligar..."                   size="small" />;
  return                                <Chip                           label="Desligado"    color="default" size="small" />;
}

export default function WhatsAppAlertasPage() {
  const [waStatus,      setWaStatus]      = useState('disconnected');
  const [alerta,        setAlerta]        = useState(null);
  const [grupoNome,     setGrupoNome]     = useState(null);
  const [sending,       setSending]       = useState(false);
  const [loadingAlerta, setLoadingAlerta] = useState(false);

  // --- polling status ---
  const fetchStatus = useCallback(async () => {
    try {
      const data = await whatsappAlertasService.getStatus();
      setWaStatus(data.status ?? 'disconnected');
    } catch {
      setWaStatus('disconnected');
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Polling rápido em estados transitórios, lento quando estável
  const isTransitional = waStatus === 'loading' || waStatus === 'browser_open';
  useEffect(() => {
    const ms = isTransitional ? POLL_ACTIVE_MS : POLL_IDLE_MS;
    const id = setInterval(fetchStatus, ms);
    return () => clearInterval(id);
  }, [fetchStatus, isTransitional]);

  // --- grupo padrão guardado na BD ---
  const loadGrupoConfig = useCallback(async () => {
    try {
      const data = await whatsappAlertasService.getGruposConfig();
      const grupos = data.groups ?? [];
      if (grupos.length > 0) setGrupoNome(grupos[0].group_name);
    } catch {}
  }, []);

  useEffect(() => { loadGrupoConfig(); }, [loadGrupoConfig]);

  // --- último alerta (404 = sem alertas, não é erro) ---
  const loadAlerta = useCallback(async () => {
    setLoadingAlerta(true);
    try {
      const data = await whatsappAlertasService.getUltimoAlerta();
      setAlerta(data);
    } catch (err) {
      if (err?.response?.status !== 404) {
        notification.error('Erro ao carregar alerta');
      }
      setAlerta(null);
    } finally { setLoadingAlerta(false); }
  }, []);

  useEffect(() => { loadAlerta(); }, [loadAlerta]);

  // --- abrir Chrome com web.whatsapp.com ---
  const handleAbrir = async () => {
    try {
      await whatsappAlertasService.abrirWhatsApp();
      setWaStatus('browser_open');
    } catch (err) {
      notification.error(err?.response?.data?.message ?? 'Erro ao abrir Chrome');
    }
  };

  // --- desligar (imediato) ---
  const handleDesligar = () => {
    setWaStatus('disconnected');
    notification.info('Sessão WhatsApp terminada');
    whatsappAlertasService.desligar().catch(() => {});
  };

  // --- enviar alerta para o grupo padrão ---
  const handleEnviar = async () => {
    if (!alerta) { notification.warning('Nenhum alerta disponível'); return; }
    setSending(true);
    try {
      const res = await whatsappAlertasService.enviarGrupoPadrao(alerta.pk ?? null);
      const nome = res.group_name ?? grupoNome ?? 'grupo';
      if (!grupoNome && res.group_name) { setGrupoNome(res.group_name); loadGrupoConfig(); }
      notification.success(`Alerta enviado para "${nome}"`);
      loadAlerta();
    } catch (err) {
      notification.error(err?.response?.data?.message ?? 'Erro ao enviar');
    } finally { setSending(false); }
  };

  const isConnected = waStatus === 'connected';

  return (
    <ModulePage
      title="Alertas WhatsApp"
      subtitle="Envio manual de alertas de sensores via WhatsApp"
      icon={WhatsAppIcon}
      color="#25d366"
      breadcrumbs={[{ label: 'Gestão' }, { label: 'Alertas WhatsApp' }]}
    >
      <Stack spacing={3} maxWidth={600}>

        {/* Ligação */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Ligação</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <StatusChip status={waStatus} />
                <Tooltip title="Actualizar">
                  <IconButton size="small" onClick={fetchStatus}><RefreshIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            {/* Sem sessão */}
            {waStatus === 'disconnected' && (
              <Stack alignItems="center" spacing={2} py={2}>
                <WhatsAppIcon sx={{ fontSize: 52, color: '#25d366' }} />
                <Button
                  variant="contained" size="large"
                  startIcon={<OpenInBrowserIcon />}
                  onClick={handleAbrir}
                  sx={{ bgcolor: '#25d366', '&:hover': { bgcolor: '#1ebe57' } }}
                >
                  Abrir WhatsApp Web
                </Button>
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  Abre o Chrome com web.whatsapp.com — faça o scan com o telemóvel
                </Typography>
              </Stack>
            )}

            {/* Chrome aberto — aguarda scan e fecho */}
            {waStatus === 'browser_open' && (
              <Stack alignItems="center" spacing={2} py={2}>
                <Alert severity="info" sx={{ py: 0.5, width: '100%' }}>
                  <strong>Chrome aberto com web.whatsapp.com</strong><br />
                  No telemóvel: <strong>WhatsApp → Dispositivos Ligados → Ligar um dispositivo</strong><br />
                  Após o scan, <strong>feche o Chrome</strong> — a ligação é automática.
                </Alert>
                <CircularProgress size={28} sx={{ color: '#25d366' }} />
              </Stack>
            )}

            {/* A ligar */}
            {waStatus === 'loading' && (
              <Stack alignItems="center" spacing={2} py={3}>
                <CircularProgress size={36} sx={{ color: '#25d366' }} />
                <Typography variant="body2" color="text.secondary">A ligar ao WhatsApp...</Typography>
              </Stack>
            )}

            {/* Ligado */}
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

        {/* Alerta + envio */}
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
                <Typography variant="body2"
                  sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, whiteSpace: 'pre-wrap' }}>
                  {alerta.alert_message || '(sem mensagem)'}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {loadingAlerta ? 'A carregar...' : 'Nenhum alerta de sensor encontrado.'}
              </Typography>
            )}

            <Box mt={2}>
              {grupoNome && (
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Destino: <strong>{grupoNome}</strong>
                </Typography>
              )}
              <Button
                variant="contained" size="large" fullWidth
                startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                onClick={handleEnviar}
                disabled={sending || !alerta || !isConnected}
                sx={{ bgcolor: '#25d366', '&:hover': { bgcolor: '#1ebe57' } }}
              >
                {sending ? 'A enviar...' : 'Enviar Alerta Agora'}
              </Button>
              {!isConnected && alerta && (
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5} textAlign="center">
                  Ligue o WhatsApp para poder enviar.
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>

      </Stack>
    </ModulePage>
  );
}
