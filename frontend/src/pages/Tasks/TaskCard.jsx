import React from "react";
import { Card, CardContent, Typography, Tooltip, Box, Badge, Chip } from "@mui/material";
import { useDrag } from "react-dnd";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonIcon from "@mui/icons-material/Person";
import { getPriorityIcons } from "./utils";
import { useAuth } from "../../contexts/AuthContext";

const ItemTypes = {
  TASK: "task",
};

const TaskCard = ({ task, onTaskClick, isDarkMode, columnId }) => {
  const { user } = useAuth();
  // Apenas o cliente pode arrastar tarefas não fechadas
  const canDrag = task.ts_client === user?.user_id && !task.when_stop;

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: { 
      id: task.pk, 
      columnId: columnId,
      canDrag: canDrag // Passamos a informação para o drop target
    },
    canDrag: canDrag, // Ativar a condição de permissão
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const startDate = task.when_start ? new Date(task.when_start).toLocaleDateString() : "-";

  return (
    <Badge
        color="error"
        variant="dot"
        invisible={!(
          (task.owner === user.user_id && task.notification_owner === 1) || 
          (task.ts_client === user.user_id && task.notification_client === 1)
        )}
        sx={{ display: 'block', width: '100%' }}
      >
      <Card
        ref={drag}
        onClick={() => onTaskClick(task)}
        sx={{
          cursor: canDrag ? 'grab' : 'default',
          boxShadow: 2,
          borderLeft: '4px solid',
          borderColor: theme => {
            switch (columnId) {
              case 1: return theme.palette.warning.main; // A Fazer
              case 2: return theme.palette.info.main;    // Em Progresso
              case 3: return theme.palette.success.main; // Concluído
              default: return theme.palette.grey[500];
            }
          },
          '&:hover': {
            transform: canDrag ? 'translateY(-4px)' : 'none',
            boxShadow: canDrag ? 4 : 2,
            transition: 'transform 0.2s, box-shadow 0.2s'
          },
          bgcolor: isDarkMode ? 'background.paper' : '#fff'
        }}
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
                    whiteSpace: 'nowrap'
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
              WebkitBoxOrient: "vertical"
            }}
          >
            {task.name}
          </Typography>
          
          {task.memo && (
            <Typography 
              variant="body2"
              color="text.secondary"
              sx={{ 
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                minHeight: "4.5em",
                maxHeight: "4.5em",
                mb: 2
              }}
            >
              {task.memo}
            </Typography>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <CalendarMonthIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="caption">{startDate}</Typography>
            </Box>
            
            {task.owner_name && (
              <Tooltip title={`Responsável: ${task.owner_name}`}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography 
                    variant="caption"
                    sx={{
                      maxWidth: '100px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {task.owner_name}
                  </Typography>
                </Box>
              </Tooltip>
            )}
          </Box>
        </CardContent>
      </Card>
    </Badge>
  );
};

export default TaskCard;