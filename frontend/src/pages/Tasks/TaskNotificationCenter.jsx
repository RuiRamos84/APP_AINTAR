import React, { useState } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  List,
  ListItem,
  Divider,
  Button,
  Tooltip,
  useTheme
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventNoteIcon from '@mui/icons-material/EventNote';
import CommentIcon from '@mui/icons-material/Comment';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const TaskNotificationCenter = () => {
  const { 
    taskNotifications, 
    taskNotificationCount, 
    markTaskNotificationAsRead,
    refreshTaskNotifications 
  } = useSocket();
  const [anchorEl, setAnchorEl] = useState(null);
  const { user } = useAuth();
  const isDarkMode = user?.dark_mode || false;
  const theme = useTheme();
  const navigate = useNavigate();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    // Atualizar notificações ao abrir
    refreshTaskNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTaskClick = async (notification) => {
    try {
        console.log('Notificação clicada:', notification);
        
        // Marcar como lida
        await markTaskNotificationAsRead(notification.taskId, true);
        
        // Fechar o menu
        handleClose();
        
        // Determinar o destino com base no papel atual do utilizador
        let destination = '/tasks/my'; // Padrão para cliente
        
        // Verificar se o utilizador atual é owner ou client desta tarefa
        const isOwner = user?.user_id === notification.ownerId;
        const isClient = user?.user_id === notification.clientId;
        
        // Se o utilizador é owner, redirecionar para a lista de todas as tarefas
        if (isOwner) {
        destination = '/tasks/all';
        }
        
        console.log(`Navegando para ${destination} como ${isOwner ? 'owner' : 'client'}`);
        
        // Navegação forçada com refresh
        setTimeout(() => {
        navigate(`${destination}?taskId=${notification.taskId}`, { 
            replace: true,
            state: { 
            refreshData: true,
            timestamp: new Date().getTime() 
            }
        });
        }, 100);
    } catch (error) {
        console.error('Erro ao processar notificação:', error);
    }
    }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Data desconhecida';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMin < 60) {
        return `${diffMin} min atrás`;
      } else if (diffHours < 24) {
        return `${diffHours} horas atrás`;
      } else if (diffDays < 7) {
        return `${diffDays} dias atrás`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'new_note':
        return <CommentIcon fontSize="small" color="info" />;
      case 'status_update':
        return <EventNoteIcon fontSize="small" color="warning" />;
      default:
        return <NotificationsIcon fontSize="small" color="primary" />;
    }
  };

  const getNotificationText = (notification) => {
    switch(notification.type) {
      case 'new_note':
        return `Nova nota na tarefa "${notification.taskName}"`;
      case 'status_update':
        return `Status atualizado para ${notification.status || 'novo status'} na tarefa "${notification.taskName}"`;
      case 'unread_update':
        return `Atualizações não lidas na tarefa "${notification.taskName}"`;
      default:
        return `Notificação da tarefa "${notification.taskName}"`;
    }
  };

  const handleMarkAllAsRead = () => {
    if (taskNotifications.length === 0) return;
    
    try {
      // Para cada notificação não lida
      taskNotifications
        .filter(notif => !notif.read)
        .forEach(notif => {
          markTaskNotificationAsRead(notif.taskId, true);
        });
      
      handleClose();
      
      // Atualizar UI
      window.dispatchEvent(new CustomEvent('task-refresh'));
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  // Função separada para marcar uma notificação individual como lida
  const handleMarkAsRead = (e, taskId) => {
    e.stopPropagation(); // Impedir que o evento afete o item da lista
    markTaskNotificationAsRead(taskId, true);
    
    // Atualizar UI
    window.dispatchEvent(new CustomEvent('task-refresh'));
  };

  return (
    <>
      <Tooltip title="Notificações de Tarefas">
        <IconButton 
          color="inherit" 
          onClick={handleClick}
          sx={{ position: 'relative' }}
        >
          <Badge 
            badgeContent={taskNotificationCount} 
            color="error" 
            overlap="circular"
            invisible={taskNotificationCount === 0}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          elevation: 4,
          sx: {
            maxHeight: 400,
            width: 320,
            maxWidth: '100%',
            overflow: 'auto',
            mt: 1.5,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
            },
            bgcolor: isDarkMode ? theme.palette.background.paper : undefined
          },
        }}
      >
        <Box sx={{ 
          p: 1, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Notificações de Tarefas
            {taskNotificationCount > 0 && (
              <Badge 
                badgeContent={taskNotificationCount} 
                color="error" 
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          {taskNotificationCount > 0 && (
            <Button 
              size="small" 
              startIcon={<CheckCircleIcon />} 
              onClick={handleMarkAllAsRead}
            >
              Marcar todas
            </Button>
          )}
        </Box>
        
        {!taskNotifications || taskNotifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">Nenhuma notificação de tarefa</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {taskNotifications.map((notification) => (
              <React.Fragment key={notification.id || `${notification.taskId}-${notification.type}`}>
                <ListItem 
                  alignItems="flex-start" 
                  sx={{ 
                    bgcolor: notification.read ? 'transparent' : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(25, 118, 210, 0.08)'),
                    transition: 'background-color 0.3s',
                    '&:hover': {
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)'
                    },
                    cursor: 'pointer'
                  }}
                  onClick={() => handleTaskClick(notification)}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    width: '100%'
                  }}>
                    <Box sx={{ mr: 1.5, mt: 0.5 }}>
                      {getNotificationIcon(notification.type)}
                    </Box>
                    <Box sx={{ 
                      flex: 1, 
                      overflow: 'hidden',
                      mr: 1 
                    }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: notification.read ? 'normal' : 'bold',
                          mb: 0.5
                        }}
                      >
                        {getNotificationText(notification)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatTimestamp(notification.timestamp)}
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleMarkAsRead(e, notification.taskId)}
                      sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
};

export default TaskNotificationCenter;