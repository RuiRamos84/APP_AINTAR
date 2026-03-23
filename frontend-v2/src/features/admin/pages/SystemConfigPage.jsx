/**
 * SystemConfigPage
 * Configurações do sistema — parâmetros globais, integrações e manutenção
 */

import { useState } from 'react';
import {
  Box, Grid, Paper, Typography, TextField, Button, Switch,
  FormControlLabel, Divider, Stack, Chip, Alert, Card, CardContent,
  Tooltip, IconButton, useTheme, alpha,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Storage as DBIcon,
  Email as EmailIcon,
  Wifi as SocketIcon,
  Security as SecurityIcon,
  Schedule as SchedulerIcon,
  CheckCircle as OkIcon,
  Warning as WarnIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import apiClient from '@/services/api/client';

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useSystemStatus = () =>
  useQuery({
    queryKey: ['system', 'status'],
    queryFn: () => apiClient.get('/admin/system/status'),
    staleTime: 30 * 1000,
    select: (res) => res?.status ?? res ?? null,
    retry: 1,
  });

// ─── Service Status Card ──────────────────────────────────────────────────────

const ServiceCard = ({ label, status, detail, icon: Icon, color }) => {
  const theme = useTheme();
  const ok = status === 'ok' || status === 'online' || status === true;
  return (
    <Card variant="outlined" sx={{ bgcolor: alpha(ok ? theme.palette.success.main : theme.palette.warning.main, 0.05) }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon sx={{ fontSize: 20, color: color || 'text.secondary' }} />
            <Typography variant="body2" fontWeight={600}>{label}</Typography>
          </Box>
          <Chip
            label={ok ? 'Online' : 'Alerta'}
            size="small"
            color={ok ? 'success' : 'warning'}
            icon={ok ? <OkIcon sx={{ fontSize: '14px !important' }} /> : <WarnIcon sx={{ fontSize: '14px !important' }} />}
          />
        </Box>
        {detail && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {detail}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const SystemConfigPage = () => {
  const { data: systemStatus, isLoading, refetch } = useSystemStatus();

  const [settings, setSettings] = useState({
    maintenanceMode: false,
    debugMode: false,
    cacheEnabled: true,
    emailNotifications: true,
    sessionTimeout: 480, // minutos
    maxUploadSize: 10,   // MB
  });

  const handleSave = async () => {
    try {
      await apiClient.post('/admin/system/config', settings);
      toast.success('Configurações guardadas com sucesso!');
    } catch {
      toast.error('Erro ao guardar configurações.');
    }
  };

  const handleClearCache = async () => {
    try {
      await apiClient.post('/admin/cache/clear');
      toast.success('Cache limpa com sucesso!');
    } catch {
      toast.error('Erro ao limpar cache.');
    }
  };

  // Serviços para mostrar (dados reais da API ou defaults)
  const services = systemStatus?.services ?? [
    { key: 'db',       label: 'Base de Dados',  icon: DBIcon,        color: '#2196f3', status: systemStatus?.database ?? 'ok',    detail: 'PostgreSQL' },
    { key: 'email',    label: 'Email (SMTP)',    icon: EmailIcon,     color: '#ff9800', status: systemStatus?.email ?? 'ok',       detail: 'Office365 SMTP' },
    { key: 'socket',   label: 'WebSockets',      icon: SocketIcon,    color: '#4caf50', status: systemStatus?.socket ?? 'ok',      detail: 'Socket.IO / Eventlet' },
    { key: 'cache',    label: 'Cache (Redis)',    icon: DBIcon,        color: '#9c27b0', status: systemStatus?.cache ?? 'ok',       detail: 'Redis' },
    { key: 'security', label: 'JWT / Auth',       icon: SecurityIcon,  color: '#f44336', status: systemStatus?.auth ?? 'ok',        detail: 'Flask-JWT-Extended' },
    { key: 'scheduler',label: 'Scheduler',        icon: SchedulerIcon, color: '#607d8b', status: systemStatus?.scheduler ?? 'ok',   detail: 'APScheduler' },
  ];

  return (
    <ModulePage
      title="Configurações do Sistema"
      subtitle="Parâmetros globais, estado dos serviços e manutenção"
      icon={SettingsIcon}
      color="#f44336"
      breadcrumbs={[{ label: 'Configurações' }]}
      actions={
        <Stack direction="row" spacing={1}>
          <Tooltip title="Atualizar estado"><IconButton onClick={refetch}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} size="small">Guardar</Button>
        </Stack>
      }
    >
      <Grid container spacing={3}>
        {/* Estado dos Serviços */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Estado dos Serviços
            </Typography>
            <Grid container spacing={1.5}>
              {services.map((svc) => (
                <Grid key={svc.key} size={{ xs: 12, sm: 6 }}>
                  <ServiceCard {...svc} />
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Configurações Gerais */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Configurações Gerais</Typography>
            <Stack spacing={2}>
              <FormControlLabel
                control={<Switch checked={settings.maintenanceMode} onChange={(e) => setSettings((p) => ({ ...p, maintenanceMode: e.target.checked }))} color="error" />}
                label={<Box><Typography variant="body2" fontWeight={500}>Modo Manutenção</Typography><Typography variant="caption" color="text.secondary">Bloqueia o acesso a utilizadores</Typography></Box>}
                labelPlacement="start" sx={{ justifyContent: 'space-between', ml: 0 }}
              />
              <Divider />
              <FormControlLabel
                control={<Switch checked={settings.cacheEnabled} onChange={(e) => setSettings((p) => ({ ...p, cacheEnabled: e.target.checked }))} color="primary" />}
                label={<Box><Typography variant="body2" fontWeight={500}>Cache Ativa</Typography><Typography variant="caption" color="text.secondary">Redis para queries e sessões</Typography></Box>}
                labelPlacement="start" sx={{ justifyContent: 'space-between', ml: 0 }}
              />
              <Divider />
              <FormControlLabel
                control={<Switch checked={settings.emailNotifications} onChange={(e) => setSettings((p) => ({ ...p, emailNotifications: e.target.checked }))} color="info" />}
                label={<Box><Typography variant="body2" fontWeight={500}>Notificações Email</Typography><Typography variant="caption" color="text.secondary">Alertas automáticos por email</Typography></Box>}
                labelPlacement="start" sx={{ justifyContent: 'space-between', ml: 0 }}
              />
              <Divider />
              <TextField
                size="small" type="number" label="Timeout de Sessão (min)"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings((p) => ({ ...p, sessionTimeout: Number(e.target.value) }))}
                helperText="Minutos de inatividade antes de expirar"
              />
              <TextField
                size="small" type="number" label="Tamanho máximo upload (MB)"
                value={settings.maxUploadSize}
                onChange={(e) => setSettings((p) => ({ ...p, maxUploadSize: Number(e.target.value) }))}
              />
            </Stack>
          </Paper>
        </Grid>

        {/* Ações de Manutenção */}
        <Grid size={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Ações de Manutenção</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button variant="outlined" color="warning" onClick={handleClearCache}>
                Limpar Cache
              </Button>
              <Button variant="outlined" color="info" onClick={() => apiClient.post('/admin/system/reload-config').then(() => toast.success('Configuração recarregada!')).catch(() => toast.error('Erro.'))}>
                Recarregar Configuração
              </Button>
              <Button variant="outlined" color="error" onClick={() => toast.info('Contacte o departamento de IT para reiniciar o servidor.')}>
                Reiniciar Servidor
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </ModulePage>
  );
};

export default SystemConfigPage;
