/**
 * TaskCard - Componente de card de tarefa
 *
 * Características:
 * - Drag & drop (react-dnd)
 * - Animações suaves (framer-motion)
 * - Notificações visuais
 * - Indicadores de prioridade
 * - Responsivo
 * - Acessível
 *
 * @example
 * <TaskCard
 *   task={task}
 *   onTaskClick={handleClick}
 *   draggable
 *   columnId="pending"
 * />
 */

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Avatar,
  Tooltip,
  IconButton,
  useTheme,
  alpha,
  Stack,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from 'react-dnd';
import {
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  NotificationsActive as NotificationIcon,
  CheckCircle as CompletedIcon,
  DragIndicator as DragIcon,
  MoreVert as MoreIcon,
  Comment as CommentIcon,
  AttachFile as AttachIcon,
} from '@mui/icons-material';
import { useAuth } from '@/core/contexts/AuthContext';
import { useSocket } from '@/core/contexts/SocketContext';
import PropTypes from 'prop-types';

// Components
import QuickActionsMenu, { TASK_ACTIONS } from './QuickActionsMenu';

// Services
import taskService from '../services/taskService';

// Tipos de itens para drag & drop
const ItemTypes = {
  TASK: 'task',
};

/**
 * Obter ícone e cor de prioridade
 */
const getPriorityConfig = (priority) => {
  const configs = {
    urgente: {
      color: 'error',
      label: 'Urgente',
      icon: '🔴',
      gradient: ['#ff1744', '#ff5252'],
    },
    alta: {
      color: 'warning',
      label: 'Alta',
      icon: '🟠',
      gradient: ['#ff9800', '#ffb74d'],
    },
    media: {
      color: 'info',
      label: 'Média',
      icon: '🟡',
      gradient: ['#2196f3', '#64b5f6'],
    },
    baixa: {
      color: 'success',
      label: 'Baixa',
      icon: '🟢',
      gradient: ['#4caf50', '#81c784'],
    },
  };

  return configs[priority] || configs.media;
};

/**
 * Obter cor da borda baseada no status/coluna
 */
const getColumnColor = (theme, columnId, hasNotification) => {
  if (hasNotification) {
    return theme.palette.error.main;
  }

  const colors = {
    pending: theme.palette.warning.main,
    in_progress: theme.palette.info.main,
    completed: theme.palette.success.main,
    cancelled: theme.palette.grey[500],
  };

  return colors[columnId] || theme.palette.grey[500];
};

/**
 * Componente TaskCard
 */
export const TaskCard = ({
  task,
  onTaskClick,
  draggable = false,
  columnId,
  showClientName = false,
  compact = false,
  onMenuAction,
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { unreadTaskIds } = useSocket();

  const [anchorEl, setAnchorEl] = useState(null);

  // Verificar se é owner ou admin
  const isOwner = task.owner === user?.user_id;
  const isAdmin = user?.profile === 0;
  const isCompleted = task.status === 'completed' || task.when_stop;

  // Permissões do menu
  const menuPermissions = useMemo(() => ({
    canEdit: isOwner || isAdmin,
    canDelete: isAdmin,
    canComplete: (isOwner || isAdmin) && !isCompleted,
    canReopen: (isOwner || isAdmin) && isCompleted,
  }), [isOwner, isAdmin, isCompleted]);

  // Verificar permissões de drag
  // Regras de negócio:
  // - OWNER NÃO pode arrastar (mas pode fechar/reabrir)
  // - CLIENT (ts_client) pode arrastar para mudar status
  // - Se for OWNER E CLIENT ao mesmo tempo, pode arrastar
  const canDrag = useMemo(() => {
    if (!draggable) return false;
    if (!user?.user_id) return false;

    // Tarefa fechada não pode ser arrastada
    if (task.when_stop) return false;

    const isTaskOwner = task.owner === user.user_id;
    const isTaskClient = task.ts_client === user.user_id;

    // Se for owner E client, pode arrastar
    if (isTaskOwner && isTaskClient) return true;

    // Se for apenas client, pode arrastar
    if (isTaskClient) return true;

    // Owner sozinho NÃO pode arrastar
    return false;
  }, [draggable, task, user]);

  // Configurar drag & drop
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.TASK,
      item: {
        id: task.pk || task.id,
        task: task,
        columnId: columnId,
        canDrag: canDrag,
      },
      canDrag: canDrag,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [task, columnId, canDrag]
  );

  // Verificar notificações — deriva do feed central (fase B da unificação),
  // já filtrado por destinatário (ts_client) no backend.
  const hasNotification = unreadTaskIds.has(task.pk || task.id);

  // Formatação de datas
  const startDate = task.when_start
    ? new Date(task.when_start).toLocaleDateString('pt-PT')
    : null;
  const endDate = task.when_stop
    ? new Date(task.when_stop).toLocaleDateString('pt-PT')
    : null;

  // Config de prioridade
  const priorityConfig = getPriorityConfig(task.priority);

  // Cor da borda
  const borderColor = getColumnColor(theme, columnId, hasNotification);

  // Handle click
  const handleCardClick = async () => {
    // Não abrir se clicou no menu
    if (anchorEl) return;

    // Se tem notificação, marcar como lida
    if (hasNotification) {
      try {
        await taskService.markTaskAsRead(task.pk || task.id);
        // Disparar evento para atualizar UI
        window.dispatchEvent(new CustomEvent('task-refresh'));
      } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
      }
    }

    onTaskClick?.(task);
  };

  // Handle menu
  const handleMenuClick = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMenuAction = (action, data) => {
    handleMenuClose();

    switch (action) {
      case TASK_ACTIONS.VIEW:
        onTaskClick?.(task);
        break;
      case TASK_ACTIONS.EDIT:
        onTaskClick?.(task, 'edit');
        break;
      case TASK_ACTIONS.COMPLETE:
        onMenuAction?.('complete', task);
        break;
      case TASK_ACTIONS.REOPEN:
        onMenuAction?.('reopen', task);
        break;
      case TASK_ACTIONS.DELETE:
        onMenuAction?.('delete', task);
        break;
      case TASK_ACTIONS.CHANGE_PRIORITY:
        onMenuAction?.('priority', task, data);
        break;
      case TASK_ACTIONS.MOVE:
        onMenuAction?.('move', task, data);
        break;
      default:
        break;
    }
  };

  return (
    <Box
      sx={{
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isDragging ? (theme) => theme.shadows[6] : 'none',
        transition: 'opacity 0.2s, transform 0.2s, box-shadow 0.2s',
        position: 'relative',
      }}
    >
      <Card
        ref={drag}
        onClick={handleCardClick}
        sx={{
          position: 'relative',
          borderLeft: `${compact ? 3 : 4}px solid ${borderColor}`,
          borderRadius: compact ? 1.5 : 2,
          overflow: 'visible',
          cursor: canDrag ? 'grab' : 'pointer',
          bgcolor: hasNotification
            ? alpha(theme.palette.error.main, 0.05)
            : 'background.paper',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': compact
            ? {}
            : {
                boxShadow: theme.shadows[8],
                transform: canDrag ? 'translateY(-4px)' : 'translateY(-2px)',
              },
          '&:active': compact
            ? {
                transform: 'scale(0.98)',
              }
            : canDrag
              ? { cursor: 'grabbing' }
              : {},
        }}
      >
        {/* Badge de notificação */}
        <AnimatePresence>
          {hasNotification && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                zIndex: 1,
              }}
            >
              <Box
                sx={{
                  bgcolor: 'error.main',
                  color: 'error.contrastText',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: theme.shadows[4],
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.1)' },
                  },
                }}
              >
                <NotificationIcon sx={{ fontSize: 14 }} />
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        <CardContent sx={{ p: compact ? 1.25 : 2, '&:last-child': { pb: compact ? 1.25 : 2 } }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: compact ? 0.5 : 1, mb: compact ? 0.75 : 1 }}>
            {/* Drag handle - esconder em mobile */}
            {canDrag && !compact && (
              <DragIcon
                sx={{
                  color: 'text.secondary',
                  fontSize: 20,
                  cursor: 'grab',
                  '&:active': { cursor: 'grabbing' },
                }}
              />
            )}

            {/* Título */}
            <Typography
              variant={compact ? 'body2' : 'subtitle1'}
              fontWeight={600}
              sx={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: compact ? 2 : 2,
                WebkitBoxOrient: 'vertical',
                fontSize: compact ? '0.875rem' : undefined,
                lineHeight: compact ? 1.3 : undefined,
              }}
            >
              {task.title || task.name}
            </Typography>

            {/* Prioridade + Menu actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              {/* Chip de prioridade */}
              <Chip
                label={compact ? undefined : priorityConfig.label}
                color={priorityConfig.color}
                size="small"
                icon={<span style={{ fontSize: compact ? '0.75rem' : '0.875rem' }}>{priorityConfig.icon}</span>}
                sx={{
                  fontWeight: 600,
                  fontSize: compact ? '0.7rem' : '0.75rem',
                  height: compact ? 20 : 24,
                  ...(compact && {
                    '& .MuiChip-label': { display: 'none' },
                    '& .MuiChip-icon': { mr: 0, ml: 0.5 },
                    minWidth: 24,
                  }),
                }}
              />

              {/* Menu (3 pontinhos) */}
              <IconButton
                size="small"
                onClick={handleMenuClick}
                sx={{
                  opacity: 0.7,
                  '&:hover': { opacity: 1 },
                  p: compact ? 0.25 : 0.5,
                }}
              >
                <MoreIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Descrição (opcional) */}
          {!compact && task.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                mb: 1.5,
              }}
            >
              {task.description}
            </Typography>
          )}

          {/* Chips de info (status concluída e tags) */}
          {((task.status === 'completed' && !compact) || (!compact && task.tags?.length > 0)) && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5} mb={compact ? 0.75 : 1.5}>
              {/* Completada */}
              {task.status === 'completed' && !compact && (
                <Chip
                  label="Concluída"
                  color="success"
                  size="small"
                  icon={<CompletedIcon />}
                />
              )}

              {/* Tags customizadas - esconder em mobile */}
              {!compact && task.tags?.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
            </Stack>
          )}

          {/* Info footer - criador e datas na mesma linha */}
          <Stack spacing={compact ? 0.25 : 0.5}>
            {/* Linha única: Datas + Criador */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 0.5,
              }}
            >
              {/* Datas */}
              {(startDate || endDate) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarIcon sx={{ fontSize: compact ? 14 : 16, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: compact ? '0.7rem' : undefined }}>
                    {startDate && `${startDate}`}
                    {startDate && endDate && ' - '}
                    {endDate && `${endDate}`}
                  </Typography>
                </Box>
              )}

              {/* Criador */}
              {task.owner_name && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {compact ? (
                    <Avatar sx={{ width: 18, height: 18, fontSize: '0.65rem', bgcolor: borderColor }}>
                      {task.owner_name.charAt(0)}
                    </Avatar>
                  ) : (
                    <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: compact ? '0.7rem' : undefined }}>
                    {task.owner_name}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Nome do cliente - simplificar em mobile */}
            {showClientName && task.client_name && (
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: compact ? '0.7rem' : undefined }}>
                {compact ? task.client_name : `Cliente: ${task.client_name}`}
              </Typography>
            )}

            {/* Meta info - esconder em mobile */}
            {!compact && (
              <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                {task.comments_count > 0 && (
                  <Tooltip title={`${task.comments_count} comentário(s)`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <CommentIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {task.comments_count}
                      </Typography>
                    </Box>
                  </Tooltip>
                )}

                {task.attachments_count > 0 && (
                  <Tooltip title={`${task.attachments_count} anexo(s)`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <AttachIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {task.attachments_count}
                      </Typography>
                    </Box>
                  </Tooltip>
                )}
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Menu de ações rápidas */}
      <QuickActionsMenu
        anchorEl={anchorEl}
        onClose={handleMenuClose}
        onAction={handleMenuAction}
        task={task}
        canEdit={menuPermissions.canEdit}
        canDelete={menuPermissions.canDelete}
        canComplete={menuPermissions.canComplete}
        canReopen={menuPermissions.canReopen}
      />
    </Box>
  );
};

TaskCard.propTypes = {
  task: PropTypes.shape({
    pk: PropTypes.number,
    id: PropTypes.number,
    title: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    priority: PropTypes.oneOf(['baixa', 'media', 'alta', 'urgente']),
    status: PropTypes.string,
    owner: PropTypes.number,
    ts_client: PropTypes.number,
    owner_name: PropTypes.string,
    client_name: PropTypes.string,
    when_start: PropTypes.string,
    when_stop: PropTypes.string,
    notification_owner: PropTypes.number,
    notification_client: PropTypes.number,
    tags: PropTypes.arrayOf(PropTypes.string),
    comments_count: PropTypes.number,
    attachments_count: PropTypes.number,
  }).isRequired,
  onTaskClick: PropTypes.func,
  draggable: PropTypes.bool,
  columnId: PropTypes.string,
  showClientName: PropTypes.bool,
  compact: PropTypes.bool,
  onMenuAction: PropTypes.func,
};

export default TaskCard;
