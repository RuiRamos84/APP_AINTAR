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
  useTheme,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventNoteIcon from '@mui/icons-material/EventNote';
import CommentIcon from '@mui/icons-material/Comment';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DescriptionIcon from '@mui/icons-material/Description';
import TransferWithinAStationIcon from '@mui/icons-material/TransferWithinAStation';
import UpdateIcon from '@mui/icons-material/Update';
import ReplyIcon from '@mui/icons-material/Reply';
import { useSocket } from '../../../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { useDocumentNotifications } from '../../../pages/ModernDocuments/contexts/DocumentNotificationContext';
import { useMetaData } from '../../../contexts/MetaDataContext';

// Hook para documentos agora usa o contexto real (global)
const useDocumentNotificationsSafe = () => {
  // Sempre criar o fallback primeiro (hooks sempre na mesma ordem)
  const fallbackContext = React.useMemo(() => ({
    documentNotifications: [],
    unreadCount: 0,
    markNotificationAsRead: () => {},
    markAllAsRead: () => {},
    handleViewDocument: () => {}
  }), []);

  // Sempre chamar o hook real (pode dar erro mas não é condicional)
  const realContext = useDocumentNotifications();

  // Verificar se o contexto é válido
  const isValidContext = realContext &&
    typeof realContext === 'object' &&
    Array.isArray(realContext.documentNotifications);

  return isValidContext ? realContext : fallbackContext;
};

const UnifiedNotificationCenter = () => {
  const {
    taskNotifications,
    taskNotificationCount,
    markTaskNotificationAsRead,
    refreshTaskNotifications
  } = useSocket();
  const {
    documentNotifications,
    unreadCount: documentUnreadCount,
    markNotificationAsRead,
    markAllAsRead,
    handleViewDocument
  } = useDocumentNotificationsSafe();

  // Debug logs para UnifiedNotificationCenter
  React.useEffect(() => {
    console.log('🔥 DEBUG: UnifiedNotificationCenter - documentNotifications:', documentNotifications?.length || 0);
    console.log('🔥 DEBUG: UnifiedNotificationCenter - documentUnreadCount:', documentUnreadCount);
    console.log('🔥 DEBUG: UnifiedNotificationCenter - documentNotifications array:', documentNotifications);
  }, [documentNotifications, documentUnreadCount]);

  const [anchorEl, setAnchorEl] = useState(null);
  const [tabValue, setTabValue] = useState(0); // 0: Tarefas, 1: Documentos
  const { user } = useAuth();
  const isDarkMode = user?.dark_mode || false;
  const { metaData } = useMetaData();

  // Função para mapear metadados das notificações
  const getNotificationMappings = React.useCallback((notification) => {
    if (!metaData || !notification.metadata) {
      console.log('🔍 DEBUG: getNotificationMappings - sem metaData ou metadata:', { metaData: !!metaData, metadata: !!notification.metadata });
      return {};
    }

    console.log('🔍 DEBUG: getNotificationMappings - notification.metadata:', notification.metadata);
    console.log('🔍 DEBUG: getNotificationMappings - metaData keys:', Object.keys(metaData));

    const mappings = {};
    const flags = notification.metadata.requires_mapping || {};

    // Mapear tipo de documento usando document_type_id
    if (flags.document_type && notification.metadata.document_type_id) {
      mappings.documentType = metaData.param_doctype?.find(dt =>
        dt.pk === notification.metadata.document_type_id
      );
      console.log('🔍 DEBUG: Mapeando document_type_id:', notification.metadata.document_type_id, 'resultado:', mappings.documentType);
    }

    // Mapear ação/passo usando step_what_id
    if (flags.step_what && notification.metadata.step_what_id) {
      mappings.stepAction = metaData.what?.find(w =>
        w.pk === notification.metadata.step_what_id
      );
      console.log('🔍 DEBUG: Mapeando step_what_id:', notification.metadata.step_what_id, 'resultado:', mappings.stepAction);
    }

    // Mapear responsável usando step_who_id
    if (flags.step_who && notification.metadata.step_who_id) {
      mappings.stepResponsible = metaData.who?.find(w =>
        w.pk === notification.metadata.step_who_id
      );
      console.log('🔍 DEBUG: Mapeando step_who_id:', notification.metadata.step_who_id, 'resultado:', mappings.stepResponsible);
    }

    // Mapear entidade (se houver entity_mapping_id)
    if (flags.entity && notification.metadata.entity_mapping_id) {
      mappings.entity = metaData.ee?.find(e =>
        e.pk === notification.metadata.entity_mapping_id
      );
      console.log('🔍 DEBUG: Mapeando entity_mapping_id:', notification.metadata.entity_mapping_id, 'resultado:', mappings.entity);
    }

    // Mapear associado (se houver associate_mapping_id)
    if (flags.associate && notification.metadata.associate_mapping_id) {
      mappings.associate = metaData.associates?.find(a =>
        a.pk === notification.metadata.associate_mapping_id
      );
      console.log('🔍 DEBUG: Mapeando associate_mapping_id:', notification.metadata.associate_mapping_id, 'resultado:', mappings.associate);
    }

    // Mapear representante (se houver representative_mapping_id)
    if (flags.representative && notification.metadata.representative_mapping_id) {
      mappings.representative = metaData.who?.find(w =>
        w.pk === notification.metadata.representative_mapping_id
      );
    }

    // Mapear apresentação (se houver presentation_mapping_id)
    if (flags.presentation && notification.metadata.presentation_mapping_id) {
      mappings.presentation = metaData.presentation?.find(p =>
        p.pk === notification.metadata.presentation_mapping_id
      );
    }

    console.log('🔍 DEBUG: getNotificationMappings - resultado final:', mappings);
    return mappings;
  }, [metaData]);
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Calcular total de notificações
  const totalNotifications = taskNotificationCount + documentUnreadCount;

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
        // Marcar como lida
        await markTaskNotificationAsRead(notification.taskId, true);
        
        // Fechar o menu
        handleClose();
        
        // Determinar o destino
        let destination = '/tasks/my';
        const isOwner = user?.user_id === notification.ownerId;
        if (isOwner) {
            destination = '/tasks/all';
        }
        
        // Invalidar a query de tarefas para forçar a atualização.
        // O react-query tratará de buscar os dados mais recentes.
        queryClient.invalidateQueries({ queryKey: ['tasks'] });

        // Navegar para a página de tarefas. O componente de destino irá
        // renderizar os dados atualizados fornecidos pelo hook useTasks.
        navigate(`${destination}?taskId=${notification.taskId}`, {
            replace: true, // Evita que a página de notificação fique no histórico
            state: { highlightedTaskId: notification.taskId } // Passar o ID para destaque na UI
        });
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

  const getNotificationIcon = (type, category = 'task') => {
    if (category === 'document') {
      switch(type) {
        case 'document_transfer':
          return <TransferWithinAStationIcon fontSize="small" color="primary" />;
        case 'document_status_update':
          return <UpdateIcon fontSize="small" color="info" />;
        case 'document_rejected':
          return <ReplyIcon fontSize="small" color="warning" />;
        default:
          return <DescriptionIcon fontSize="small" color="secondary" />;
      }
    }

    // Tarefas (original)
    switch(type) {
      case 'new_note':
        return <CommentIcon fontSize="small" color="info" />;
      case 'status_update':
        return <EventNoteIcon fontSize="small" color="warning" />;
      default:
        return <NotificationsIcon fontSize="small" color="primary" />;
    }
  };

  const getNotificationText = (notification, category = 'task') => {
    if (category === 'document') {
      return notification.title || notification.message || 'Notificação de documento';
    }

    // Tarefas (original)
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
    try {
      if (tabValue === 0) {
        // Tarefas
        if (taskNotifications.length === 0) return;
        taskNotifications
          .filter(notif => !notif.read)
          .forEach(notif => {
            markTaskNotificationAsRead(notif.taskId, true);
          });
        window.dispatchEvent(new CustomEvent('task-refresh'));
      } else {
        // Documentos
        if (documentNotifications.length === 0) return;
        markAllAsRead();
      }

      handleClose();
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  // Função para marcar individual como lida
  const handleMarkAsRead = (e, id, category = 'task') => {
    e.stopPropagation();

    if (category === 'task') {
      markTaskNotificationAsRead(id, true);
      window.dispatchEvent(new CustomEvent('task-refresh'));
    } else {
      markNotificationAsRead(id);
    }
  };

  // Função para lidar com documentos
  const handleDocumentClick = (notification) => {
    try {
      // Marcar como lida
      if (!notification.read) {
        markNotificationAsRead(notification.id);
      }

      // Abrir documento
      handleViewDocument(notification.documentId);
      handleClose();
    } catch (error) {
      console.error('Erro ao abrir documento:', error);
    }
  };

  return (
    <>
      <Tooltip title="Notificações (Tarefas & Documentos)">
        <IconButton
          color="inherit"
          onClick={handleClick}
          sx={{ position: 'relative' }}
        >
          <Badge
            badgeContent={totalNotifications}
            color="error"
            overlap="circular"
            invisible={totalNotifications === 0}
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
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 1, pt: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', px: 1, pb: 1 }}>
            Central de Notificações
            {totalNotifications > 0 && (
              <Badge
                badgeContent={totalNotifications}
                color="error"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>

          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                fontSize: '0.875rem'
              }
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Tarefas
                  {taskNotificationCount > 0 && (
                    <Chip
                      size="small"
                      label={taskNotificationCount}
                      sx={{ height: 18, fontSize: '0.75rem' }}
                    />
                  )}
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Documentos
                  {documentUnreadCount > 0 && (
                    <Chip
                      size="small"
                      label={documentUnreadCount}
                      sx={{ height: 18, fontSize: '0.75rem' }}
                    />
                  )}
                </Box>
              }
            />
          </Tabs>
        </Box>

        <Box sx={{
          p: 1,
          display: 'flex',
          justifyContent: 'flex-end',
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          {((tabValue === 0 && taskNotificationCount > 0) ||
            (tabValue === 1 && documentUnreadCount > 0)) && (
            <Button
              size="small"
              startIcon={<CheckCircleIcon />}
              onClick={handleMarkAllAsRead}
            >
              Marcar todas
            </Button>
          )}
        </Box>

        {/* Conteúdo das Tabs */}
        {tabValue === 0 ? (
          // TAB TAREFAS
          !taskNotifications || taskNotifications.length === 0 ? (
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
                        {getNotificationIcon(notification.type, 'task')}
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
                          {getNotificationText(notification, 'task')}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatTimestamp(notification.timestamp)}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMarkAsRead(e, notification.taskId, 'task')}
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
          )
        ) : (
          // TAB DOCUMENTOS
          !documentNotifications || documentNotifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="textSecondary">Nenhuma notificação de documento</Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {documentNotifications.map((notification) => (
                <React.Fragment key={notification.id}>
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
                    onClick={() => handleDocumentClick(notification)}
                  >
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      width: '100%'
                    }}>
                      <Box sx={{ mr: 1.5, mt: 0.5 }}>
                        {getNotificationIcon(notification.type, 'document')}
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
                          {getNotificationText(notification, 'document')}
                        </Typography>

                        {/* Chips com informações mapeadas */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            label={`Doc. ${notification.documentNumber}`}
                            variant="outlined"
                            color="primary"
                            sx={{ height: 20, fontSize: '0.75rem' }}
                          />

                          {(() => {
                            const mappings = getNotificationMappings(notification);
                            return (
                              <>
                                {mappings.documentType && (
                                  <Chip
                                    size="small"
                                    label={mappings.documentType.name}
                                    variant="outlined"
                                    color="default"
                                    sx={{ height: 20, fontSize: '0.75rem' }}
                                  />
                                )}

                                {mappings.stepAction && (
                                  <Chip
                                    size="small"
                                    label={mappings.stepAction.name}
                                    variant="outlined"
                                    color="secondary"
                                    sx={{ height: 20, fontSize: '0.75rem' }}
                                  />
                                )}
                              </>
                            );
                          })()}
                        </Box>

                        {/* Linha com entidade e timestamp */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {(() => {
                            const mappings = getNotificationMappings(notification);
                            return mappings.entity ? (
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                                🏢 {mappings.entity.name}
                              </Typography>
                            ) : null;
                          })()}
                          <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                            {formatTimestamp(notification.timestamp)}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMarkAsRead(e, notification.id, 'document')}
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
          )
        )}
      </Menu>
    </>
  );
};

export default UnifiedNotificationCenter;