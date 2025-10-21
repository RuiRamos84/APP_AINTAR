import React from "react";
import { Box, Typography, Snackbar, Alert } from "@mui/material";
import { useDrop } from "react-dnd";
import { useAuth } from "../../contexts/AuthContext";
import TaskCard from "./TaskCard";
import { useTheme } from "@mui/material";


const ItemTypes = {
  TASK: "task",
};

const TaskColumn = ({ columnId, columnName, tasks, onTaskClick, moveTask, isMovingTask, isDarkMode }) => {
  const { user } = useAuth();
  const [error, setError] = React.useState(null);
  const theme = useTheme();
  
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.TASK,
    canDrop: (item) => item.canDrag,
    drop: (item) => {
      try {
        moveTask(item.id, columnId);
      } catch (error) {
        console.error("Erro ao processar o drop:", error);
        setError("Erro ao mover a tarefa");
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver() && monitor.canDrop(),
    }),
  });
  
  // Cores de fundo baseadas no tema
  const getBackgroundColor = () => {
    if (isOver) {
      return isDarkMode 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.05)';
    }
    
    return isDarkMode 
      ? theme.palette.background.paper 
      : '#f5f5f5';
  };
  
  const handleCloseError = () => {
    setError(null);
  };

  return (
    <>
      <Box 
        ref={drop} 
        sx={{ 
          minHeight: '100%',
          transition: 'background-color 0.3s',
          backgroundColor: getBackgroundColor(),
          borderRadius: 2,
          p: 2,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
        }}
      >
        {tasks.length === 0 ? (
          <Typography 
            variant="body2" 
            sx={{ 
              color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'text.secondary',
              textAlign: 'center',
              p: 3,
              fontStyle: 'italic',
              border: '2px dashed',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              borderRadius: 2
            }}
          >
            Nenhuma tarefa
          </Typography>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.pk}
              task={task}
              onTaskClick={onTaskClick}
              isDarkMode={isDarkMode}
              columnId={columnId}
              isUpdating={isMovingTask}
            />
          ))
        )}
      </Box>
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={4000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default TaskColumn;