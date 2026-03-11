import { useState } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
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
import EventNoteIcon from '@mui/icons-material/EventNote';
import DescriptionIcon from '@mui/icons-material/Description';
import ArticleIcon from '@mui/icons-material/Article';
import AssignmentIcon from '@mui/icons-material/Assignment';
import InfoIcon from '@mui/icons-material/Info';
import CircleIcon from '@mui/icons-material/Circle';
import EngineeringIcon from '@mui/icons-material/Engineering';
import { useSocket } from '@/core/contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

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
  } = useSocket();

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  // Filter notifications based on tab
  const getFilteredNotifications = () => {
    switch (tabValue) {
      case 0: return notifications;
      case 1: return notifications.filter((n) => n.type === 'task');
      case 2: return notifications.filter((n) => n.type === 'operacao');
      case 3: return notifications.filter((n) => n.type === 'document');
      default: return notifications;
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadTasks = notifications.filter((n) => n.type === 'task' && !n.read).length;
  const unreadOperacoes = notifications.filter((n) => n.type === 'operacao' && !n.read).length;
  const unreadDocs = notifications.filter((n) => n.type === 'document' && !n.read).length;

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    handleClose();

    if (notif.type === 'task' && notif.taskId) {
      navigate(`/tasks?taskId=${notif.taskId}`, {
        state: { refreshData: true, timestamp: Date.now() },
      });
    } else if (notif.type === 'operacao') {
      // Supervisor: tab "Controlo de Tarefas" (index 1); operador: as suas tarefas
      const route = notif.notification_type === 'nova_tarefa'
        ? '/operation/tasks'
        : '/operation/supervisor';
      navigate(route, { state: { tab: 1, timestamp: Date.now() } });
    } else if (notif.type === 'document' && notif.documentId) {
      navigate('/documents');
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
      case 'system':
        return <InfoIcon color="info" />;
      default:
        return <NotificationsIcon color="action" />;
    }
  };

  // Glassmorphism Styles
  const glassStyles = {
    backgroundColor: alpha(theme.palette.background.paper, 0.8),
    backdropFilter: 'blur(12px)',
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  };

  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: pt });
    } catch (e) {
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
            transition: 'all 0.2s',
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
            width: 360,
            maxWidth: '100vw',
            borderRadius: 3,
            boxShadow: theme.shadows[10],
            ...glassStyles,
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
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
                transition: 'all 0.2s',
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
            <Tab label={`Todas (${notifications.length})`} />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Tarefas
                  {unreadTasks > 0 && <Chip label={unreadTasks} size="small" color="error" sx={{ height: 16, fontSize: '0.65rem' }} />}
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Operações
                  {unreadOperacoes > 0 && <Chip label={unreadOperacoes} size="small" color="error" sx={{ height: 16, fontSize: '0.65rem' }} />}
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Docs
                  {unreadDocs > 0 && <Chip label={unreadDocs} size="small" color="error" sx={{ height: 16, fontSize: '0.65rem' }} />}
                </Box>
              }
            />
          </Tabs>
        </Box>

        <List sx={{ p: 0, maxHeight: 400, overflowY: 'auto' }}>
          {filteredNotifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <NotificationsIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
              <Typography variant="body2">Nenhuma notificação encontrada</Typography>
            </Box>
          ) : (
            filteredNotifications.map((notification) => (
              <ListItem
                key={notification.id}
                button
                onClick={() => handleNotificationClick(notification)}
                alignItems="flex-start"
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                  transition: 'all 0.2s',
                  bgcolor: notification.read ? 'transparent' : alpha(theme.palette.primary.main, 0.04),
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="body2" fontWeight={notification.read ? 400 : 700} sx={{ mr: 1, lineHeight: 1.3 }}>
                        {notification.title}
                      </Typography>
                      {!notification.read && (
                        <CircleIcon sx={{ fontSize: 10, color: theme.palette.primary.main, mt: 0.5 }} />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ lineHeight: 1.3, mb: 0.5 }}>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                        {formatTime(notification.timestamp)}
                      </Typography>
                    </Box>
                  }
                  disableTypography
                />
              </ListItem>
            ))
          )}
        </List>
      </Menu>
    </>
  );
};
