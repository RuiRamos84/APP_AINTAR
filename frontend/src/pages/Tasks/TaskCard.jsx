import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, Typography, Tooltip, Box, Chip } from "@mui/material";
import { useDrag } from "react-dnd";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonIcon from "@mui/icons-material/Person";
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { getPriorityIcons } from "./utils";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTheme } from "@mui/material";

const ItemTypes = {
  TASK: "task",
};

const TaskCard = ({ task, onTaskClick, isDarkMode, columnId }) => {
  const { user } = useAuth();
  const { markTaskNotificationAsRead } = useSocket();
  const theme = useTheme();
  const [forceUpdate, setForceUpdate] = useState(false);
  
  // Apenas o cliente pode arrastar tarefas não fechadas
  const canDrag = task.ts_client === user?.user_id && !task.when_stop;

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: { 
      id: task.pk, 
      columnId: columnId,
      canDrag: canDrag
    },
    canDrag: canDrag,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const startDate = task.when_start ? new Date(task.when_start).toLocaleDateString() : "-";
  const endDate = task.when_stop ? new Date(task.when_stop).toLocaleDateString() : null;

  // Define cores baseadas no tema atual
  const getBorderColor = () => {
    if (hasNotification) {
      return theme.palette.error.main;
    }
    
    switch (columnId) {
      case 1: return theme.palette.warning.main;
      case 2: return theme.palette.info.main;  
      case 3: return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  useEffect(() => {
    const handleRefresh = () => setForceUpdate(prev => !prev);
    window.addEventListener('task-refresh', handleRefresh);
    return () => window.removeEventListener('task-refresh', handleRefresh);
  }, []);

  // Substitua as verificações de notificação por:
  const hasOwnerNotification = useMemo(() => 
    task.notification_owner === 1 && task.owner === user?.user_id,
    [task, user, forceUpdate]
  );

  const hasClientNotification = useMemo(() => 
    task.notification_client === 1 && task.ts_client === user?.user_id,
    [task, user, forceUpdate]
  );

  const hasNotification = useMemo(() => 
    hasOwnerNotification || hasClientNotification,
    [hasOwnerNotification, hasClientNotification]
  );

  // Função para limpar a notificação e abrir o card
  const handleClick = () => {
    if (hasNotification) {
      // Marcar notificação como lida com true para forçar atualização 
      markTaskNotificationAsRead(task.pk, true);
      
      // Atualizar estado local imediatamente
      // Isto deve ser adicionado ao markTaskNotificationAsRead no SocketContext
      window.dispatchEvent(new CustomEvent('task-refresh'));
    }
    
    // Abrir o card
    onTaskClick(task);
  };

  // Estilo para o card com notificação
  const getCardStyle = () => {
    const baseStyle = {
      cursor: canDrag ? 'grab' : 'default',
      boxShadow: isDarkMode ? '0 4px 8px rgba(0, 0, 0, 0.5)' : 3,
      borderLeft: '4px solid',
      borderColor: getBorderColor,
      borderRadius: '8px',
      position: 'relative',
      '&:hover': {
        transform: canDrag ? 'translateY(-4px)' : 'none',
        boxShadow: isDarkMode ? '0 6px 12px rgba(0, 0, 0, 0.7)' : 6,
        transition: 'transform 0.2s, box-shadow 0.2s'
      },
      bgcolor: isDarkMode ? 'background.paper' : '#fff',
      outline: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
    };
    
    // Adicionar estilos específicos para notificações
    if (hasNotification) {
      return {
        ...baseStyle,
        boxShadow: `0 4px 12px ${theme.palette.error.main}${isDarkMode ? '50' : '30'}`,
        '&:hover': {
          ...baseStyle['&:hover'],
          boxShadow: `0 6px 16px ${theme.palette.error.main}${isDarkMode ? '70' : '50'}`,
        },
        animation: 'pulseBorder 2s infinite',
        '@keyframes pulseBorder': {
          '0%': { boxShadow: `0 0 5px 0px ${theme.palette.error.main}40` },
          '50%': { boxShadow: `0 0 10px 4px ${theme.palette.error.main}60` },
          '100%': { boxShadow: `0 0 5px 0px ${theme.palette.error.main}40` }
        }
      };
    }
    
    return baseStyle;
  };

  return (
    <Box 
      sx={{ 
        display: 'block', 
        width: '100%', 
        mb: 3,
        opacity: isDragging ? 0.5 : 1,
        transition: 'opacity 0.2s',
        position: 'relative'
      }}
    >
      {/* Sino animado fora do card */}
      {hasNotification && (
        <NotificationsActiveIcon 
          sx={{ 
            position: 'absolute', 
            top: -10, 
            right: -10, 
            zIndex: 10,
            color: theme.palette.error.main,
            fontSize: '1.5rem',
            animation: 'bellShake 0.9s cubic-bezier(.36,.07,.19,.97) infinite',
            transformOrigin: 'top',
            '@keyframes bellShake': {
              '0%': { transform: 'rotate(0)' },
              '10%': { transform: 'rotate(10deg)' },
              '20%': { transform: 'rotate(-8deg)' },
              '30%': { transform: 'rotate(6deg)' },
              '40%': { transform: 'rotate(-4deg)' },
              '50%': { transform: 'rotate(2deg)' },
              '60%': { transform: 'rotate(0)' },
              '100%': { transform: 'rotate(0)' }
            }
          }} 
        />
      )}
      
      <Card
        ref={drag}
        onClick={handleClick}
        sx={getCardStyle()}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, alignItems: 'center' }}>
            {task.ts_client_name && (
              <Tooltip title={`Cliente: ${task.ts_client_name}`}>
                <Chip 
                  size="small" 
                  label={task.ts_client_name}
                  sx={{ 
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : undefined,
                    color: isDarkMode ? 'white' : undefined,
                    fontWeight: isDarkMode ? 'medium' : undefined,
                  }}
                />
              </Tooltip>
            )}
            <Box>{getPriorityIcons(task.ts_priority)}</Box>
          </Box>
          
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: "600",
              mb: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              color: isDarkMode ? 'white' : 'text.primary'
            }}
          >
            {task.name}
          </Typography>
          
          {task.memo && (
            <Typography 
              variant="body2"
              sx={{ 
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                minHeight: "4.5em",
                maxHeight: "4.5em",
                mb: 2,
                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'text.secondary'
              }}
            >
              {task.memo}
            </Typography>
          )}
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mt: 1,
            pt: 1,
            borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
          }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <CalendarMonthIcon 
                fontSize="small" 
                sx={{ 
                  mr: 0.5,
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined 
                }} 
              />
              <Typography 
                variant="caption"
                sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined }}
              >
                {startDate}
              </Typography>
            </Box>
            
            {task.owner_name && (
              <Tooltip title={`Responsável: ${task.owner_name}`}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <PersonIcon 
                    fontSize="small" 
                    sx={{ 
                      mr: 0.5,
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined 
                    }} 
                  />
                  <Typography 
                    variant="caption"
                    sx={{
                      maxWidth: '100px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
                    }}
                  >
                    {task.owner_name}
                  </Typography>
                </Box>
              </Tooltip>
            )}
          </Box>
          
          {/* Exibir data de conclusão se estiver encerrada */}
          {endDate && (
            <Box sx={{ 
              mt: 1, 
              pt: 1, 
              borderTop: '1px solid', 
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: isDarkMode ? theme.palette.success.light : theme.palette.success.dark
                }}
              >
                <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} />
                Concluída em: {endDate}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default TaskCard;