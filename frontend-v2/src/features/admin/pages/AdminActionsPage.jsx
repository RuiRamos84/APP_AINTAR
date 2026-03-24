/**
 * AdminActionsPage
 * Ações administrativas — ferramentas de manutenção e gestão do sistema
 */

import { useState } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Stack, Chip,
  Alert, LinearProgress, Divider, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, useTheme, alpha,
} from '@mui/material';
import {
  Build as ActionsIcon,
  DeleteSweep as CacheIcon,
  Backup as BackupIcon,
  PersonOff as LockUsersIcon,
  Notifications as NotifyIcon,
  Storage as DBIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  CheckCircle as OkIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import apiClient from '@/services/api/client';

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

const ConfirmDialog = ({ open, title, description, danger, onClose, onConfirm, loading }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {danger && <WarningIcon color="error" />}
          <Typography variant="h6" fontWeight={700}>{title}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </Box>
    </DialogTitle>
    <DialogContent>
      <Typography variant="body2" color={danger ? 'error.main' : 'text.secondary'}>{description}</Typography>
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onClose} disabled={loading}>Cancelar</Button>
      <Button variant="contained" color={danger ? 'error' : 'primary'} onClick={onConfirm} disabled={loading}>
        {loading ? 'A executar...' : 'Confirmar'}
      </Button>
    </DialogActions>
  </Dialog>
);

// ─── Action Card ──────────────────────────────────────────────────────────────

const ActionCard = ({ title, description, danger, icon: Icon, color, buttonLabel, onAction }) => {
  const theme = useTheme();
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderColor: danger ? alpha(theme.palette.error.main, 0.3) : theme.palette.divider,
        bgcolor: danger ? alpha(theme.palette.error.main, 0.03) : 'background.paper',
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: alpha(color, 0.15),
          }}>
            <Icon sx={{ color, fontSize: 22 }} />
          </Box>
          <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, mb: 2 }}>
          {description}
        </Typography>
        <Button
          variant={danger ? 'contained' : 'outlined'}
          color={danger ? 'error' : 'primary'}
          size="small"
          onClick={onAction}
          fullWidth
        >
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const AdminActionsPage = () => {
  const theme = useTheme();
  const [dialog, setDialog] = useState({ open: false, action: null });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const openDialog = (action) => setDialog({ open: true, action });
  const closeDialog = () => setDialog({ open: false, action: null });

  const runAction = async () => {
    if (!dialog.action) return;
    setLoading(true);
    const actionRef = dialog.action;
    closeDialog();
    const start = Date.now();
    try {
      const res = await apiClient.post(`/admin/actions/${actionRef.key}`);
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      const msg = res?.message || `${actionRef.title} concluído em ${duration}s`;
      toast.success(msg);
      setResults((prev) => [
        { key: actionRef.key, label: actionRef.title, ok: true, time: new Date(), duration },
        ...prev.slice(0, 9),
      ]);
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data?.erro || e.message;
      toast.error(msg);
      setResults((prev) => [
        { key: actionRef.key, label: actionRef.title, ok: false, time: new Date(), error: msg },
        ...prev.slice(0, 9),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const ACTIONS = [
    {
      key: 'clear-cache',
      title: 'Limpar Cache',
      description: 'Remove todos os dados em cache (Redis). Pode causar lentidão temporária até o cache ser reconstruído.',
      icon: CacheIcon, color: '#ff9800', danger: false,
      buttonLabel: 'Limpar Cache',
      confirmTitle: 'Limpar Cache do Sistema',
      confirmDesc: 'Esta ação elimina todo o cache Redis. O sistema ficará temporariamente mais lento.',
    },
    {
      key: 'backup-db',
      title: 'Backup da Base de Dados',
      description: 'Cria uma cópia de segurança completa da base de dados PostgreSQL.',
      icon: BackupIcon, color: '#2196f3', danger: false,
      buttonLabel: 'Criar Backup',
      confirmTitle: 'Criar Backup',
      confirmDesc: 'Será criado um backup completo da base de dados. Esta operação pode demorar vários minutos.',
    },
    {
      key: 'send-test-notification',
      title: 'Enviar Notificação Teste',
      description: 'Envia uma notificação de teste a todos os utilizadores online via WebSocket.',
      icon: NotifyIcon, color: '#4caf50', danger: false,
      buttonLabel: 'Enviar Teste',
      confirmTitle: 'Enviar Notificação de Teste',
      confirmDesc: 'Todos os utilizadores online receberão uma notificação de teste.',
    },
    {
      key: 'optimize-db',
      title: 'Otimizar Base de Dados',
      description: 'Executa VACUUM e ANALYZE nas tabelas principais para melhorar o desempenho.',
      icon: DBIcon, color: '#9c27b0', danger: false,
      buttonLabel: 'Otimizar',
      confirmTitle: 'Otimizar Base de Dados',
      confirmDesc: 'Serão executadas operações de VACUUM/ANALYZE. O sistema pode ficar lento durante o processo.',
    },
    {
      key: 'lock-all-users',
      title: 'Bloquear Todos os Utilizadores',
      description: 'Invalida todas as sessões ativas, forçando novo login. Útil em caso de incidente de segurança.',
      icon: LockUsersIcon, color: '#f44336', danger: true,
      buttonLabel: 'Bloquear Sessões',
      confirmTitle: 'Bloquear Todas as Sessões',
      confirmDesc: '⚠️ AÇÃO DESTRUTIVA: Todos os utilizadores serão desligados imediatamente e terão de fazer login novamente.',
    },
  ];

  const currentAction = dialog.action ? ACTIONS.find((a) => a.key === dialog.action?.key) : null;

  return (
    <ModulePage
      title="Ações Administrativas"
      subtitle="Ferramentas de manutenção, otimização e gestão do sistema"
      icon={ActionsIcon}
      color="#f44336"
      breadcrumbs={[{ label: 'Ações' }]}
    >
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Actions grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {ACTIONS.map((action) => (
          <Grid key={action.key} size={{ xs: 12, sm: 6, md: 4 }}>
            <ActionCard
              {...action}
              onAction={() => openDialog(action)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Results log */}
      {results.length > 0 && (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Histórico de Ações (Sessão Atual)</Typography>
          <Divider sx={{ mb: 1.5 }} />
          <Stack spacing={1}>
            {results.map((r, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {r.ok
                  ? <OkIcon fontSize="small" color="success" />
                  : <WarningIcon fontSize="small" color="error" />}
                <Typography variant="body2" sx={{ flex: 1 }}>{r.label}</Typography>
                {r.duration && <Typography variant="caption" color="text.secondary">{r.duration}s</Typography>}
                <Typography variant="caption" color="text.secondary">
                  {r.time.toLocaleTimeString('pt-PT')}
                </Typography>
                <Chip label={r.ok ? 'OK' : 'Erro'} size="small" color={r.ok ? 'success' : 'error'} />
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Confirm dialog */}
      {currentAction && (
        <ConfirmDialog
          open={dialog.open}
          title={currentAction.confirmTitle}
          description={currentAction.confirmDesc}
          danger={currentAction.danger}
          onClose={closeDialog}
          onConfirm={runAction}
          loading={loading}
        />
      )}
    </ModulePage>
  );
};

export default AdminActionsPage;
