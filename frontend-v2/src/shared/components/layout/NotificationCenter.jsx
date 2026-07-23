import { useState, useMemo } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  Typography,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Button,
  Tooltip,
  useTheme,
  Tabs,
  Tab,
  Chip,
  alpha,
  Avatar,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArticleIcon from '@mui/icons-material/Article';
import AssignmentIcon from '@mui/icons-material/Assignment';
import InfoIcon from '@mui/icons-material/Info';
import CircleIcon from '@mui/icons-material/Circle';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import EuroIcon from '@mui/icons-material/Euro';
import { useSocket } from '@/core/contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { IS_PORTAL } from '@/core/config/appContext';

// Tabs config-driven: tipo novo na central = uma linha aqui.
// backofficeOnly esconde a tab no portal de clientes.
const NOTIFICATION_TABS = [
  { key: 'all', label: 'Todas', type: null },
  { key: 'task', label: 'Tarefas', type: 'task', backofficeOnly: true },
  { key: 'operacao', label: 'Operações', type: 'operacao', backofficeOnly: true },
  { key: 'document', label: 'Docs', type: 'document' },
  { key: 'rh', label: 'RH', type: 'rh', backofficeOnly: true },
  { key: 'licenca', label: 'Licenças', type: 'licenca', backofficeOnly: true },
  { key: 'fleet', label: 'Frota', type: 'fleet', backofficeOnly: true },
  { key: 'payment', label: 'Pagamentos', type: 'payment', backofficeOnly: true },
];

// notification_type de frota que aponta para um registo de manutenção (avaria
// reportada ou lembrete de revisão) — vai para a tab "Manutenções". O resto
// (seguro/inspeção/IUC a expirar) é sobre o próprio veículo — vai para "Veículos".
const FLEET_MAINTENANCE_TYPES = ['avaria_reportada', 'manutencao_atencao', 'manutencao_atraso'];

export const NotificationCenter = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loadMoreNotifications,
    hasMoreNotifications,
  } = useSocket();

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const tabs = NOTIFICATION_TABS.filter((t) => !IS_PORTAL || !t.backofficeOnly);
  const activeTab = tabs[tabValue] ?? tabs[0];
  const filteredNotifications = activeTab.type
    ? notifications.filter((n) => n.type === activeTab.type)
    : notifications;

  // Não-lidas por tipo numa só passagem — alimenta os chips das tabs
  const unreadByType = useMemo(() => {
    const counts = {};
    for (const n of notifications) {
      if (!n.read) counts[n.type] = (counts[n.type] || 0) + 1;
    }
    return counts;
  }, [notifications]);

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    handleClose();

    if (notif.type === 'task' && notif.taskId) {
      navigate(`/intern/tasks?taskId=${notif.taskId}`, {
        state: { refreshData: true, timestamp: Date.now() },
      });
    } else if (notif.type === 'operacao') {
      const route =
        notif.notification_type === 'nova_tarefa' ? '/operation/tasks' : '/operation/supervisor';
      navigate(route, { state: { tab: 1, timestamp: Date.now() } });
    } else if (notif.type === 'document' && notif.documentId) {
      navigate(IS_PORTAL ? `/pedidos/${notif.documentId}` : `/documents?id=${notif.documentId}`);
    } else if (notif.type === 'rh') {
      navigate(notif.route || '/rh/pessoal/faltas');
    } else if (notif.type === 'fleet') {
      // FleetDashboard.jsx lê estes query params (useSearchParams) para
      // pré-selecionar a tab e destacar o veículo/manutenção de origem.
      const tab = FLEET_MAINTENANCE_TYPES.includes(notif.notification_type)
        ? 'maintenance'
        : 'vehicles';
      const params = new URLSearchParams({ tab });
      if (notif.tbVehicle != null) params.set('vehiclePk', notif.tbVehicle);
      navigate(`/fleet?${params.toString()}`);
    } else if (notif.route) {
      // Tipos sem tratamento específico (licenca, fleet, futuros): a própria
      // notificação transporta a rota de destino, persistida pelo backend.
      navigate(notif.route);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'task':
        return <AssignmentIcon color="primary" />;
      case 'operacao':
        return <EngineeringIcon sx={{ color: '#1565c0' }} />;
      case 'document':
        return <ArticleIcon color="secondary" />;
      case 'rh':
        return <BadgeIcon sx={{ color: '#be123c' }} />;
      case 'licenca':
        return <WorkspacePremiumIcon sx={{ color: '#2e7d32' }} />;
      case 'fleet':
        return <DirectionsCarIcon sx={{ color: '#455a64' }} />;
      case 'payment':
        return <EuroIcon sx={{ color: '#ed6c02' }} />;
      case 'system':
        return <InfoIcon color="info" />;
      default:
        return <NotificationsIcon color="action" />;
    }
  };

  const glassStyles = {
    backgroundColor: alpha(theme.palette.background.paper, 0.8),
    backdropFilter: 'blur(12px)',
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  };

  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: pt });
    } catch {
      return 'agora mesmo';
    }
  };

  return (
    <>
      <Tooltip title="Notificações">
        <IconButton
          onClick={handleOpen}
          sx={{
            mr: 2,
            color: theme.palette.text.secondary,
            transition: 'color 0.2s, background-color 0.2s, transform 0.2s',
            '&:hover': {
              color: theme.palette.primary.main,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              transform: 'scale(1.05)',
            },
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
              },
            }}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 1.5,
            width: { xs: 'calc(100vw - 32px)', sm: 360 },
            maxWidth: { xs: 'calc(100vw - 32px)', sm: 360 },
            borderRadius: 3,
            boxShadow: theme.shadows[10],
            ...glassStyles,
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              Notificações
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                startIcon={<CheckCircleIcon />}
                onClick={markAllAsRead}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Marcar todas
              </Button>
            )}
          </Box>

          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 36,
              '& .MuiTab-root': {
                minHeight: 36,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                borderRadius: 2,
                transition: 'background-color 0.2s, color 0.2s',
              },
              '& .MuiTabs-indicator': {
                height: 0,
                borderRadius: 1,
              },
              '& .Mui-selected': {
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
              },
            }}
          >
            {tabs.map((t) =>
              t.type ? (
                <Tab
                  key={t.key}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {t.label}
                      {(unreadByType[t.type] || 0) > 0 && (
                        <Chip
                          label={unreadByType[t.type]}
                          size="small"
                          color="error"
                          sx={{ height: 16, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                  }
                />
              ) : (
                <Tab key={t.key} label={`${t.label} (${notifications.length})`} />
              )
            )}
          </Tabs>
        </Box>

        <List sx={{ p: 0, maxHeight: { xs: '50vh', sm: 400 }, overflowY: 'auto' }}>
          {filteredNotifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <NotificationsIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
              <Typography variant="body2">Nenhuma notificação encontrada</Typography>
            </Box>
          ) : (
            filteredNotifications.map((notification) => (
              <ListItemButton
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                alignItems="flex-start"
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                  transition: 'background-color 0.2s',
                  bgcolor: notification.read
                    ? 'transparent'
                    : alpha(theme.palette.primary.main, 0.04),
                  gap: 2,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    boxShadow: 1,
                    color: theme.palette.primary.main,
                  }}
                >
                  {getIcon(notification.type)}
                </Avatar>

                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={notification.read ? 400 : 700}
                        sx={{ mr: 1, lineHeight: 1.3 }}
                      >
                        {notification.title}
                      </Typography>
                      {!notification.read && (
                        <CircleIcon
                          sx={{ fontSize: 10, color: theme.palette.primary.main, mt: 0.5 }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                        sx={{ lineHeight: 1.3, mb: 0.5 }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ fontSize: '0.7rem' }}
                      >
                        {formatTime(notification.timestamp)}
                      </Typography>
                    </Box>
                  }
                  disableTypography
                />
              </ListItemButton>
            ))
          )}
          {hasMoreNotifications && filteredNotifications.length > 0 && (
            <Box sx={{ p: 1, textAlign: 'center' }}>
              <Button
                size="small"
                onClick={loadMoreNotifications}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Ver mais antigas
              </Button>
            </Box>
          )}
        </List>
      </Menu>
    </>
  );
};
