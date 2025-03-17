// TaskColumn.jsx (Corrigido)
import React from "react";
import { Box, Typography, Snackbar, Alert } from "@mui/material";
import { useDrop } from "react-dnd";
import { useAuth } from "../../contexts/AuthContext";
import TaskCard from "./TaskCard";

const ItemTypes = {
  TASK: "task",
};

const TaskColumn = ({ columnId, columnName, tasks, onTaskClick, moveTask, isDarkMode }) => {
  const { user } = useAuth();
  const [error, setError] = React.useState(null);
  
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.TASK,
    canDrop: (item) => {
      // Verificar se o item pode ser arrastado (com base nas informações passadas)
      return item.canDrag;
    },
    drop: (item) => {
      try {
        console.log("Item recebido no drop:", item);
        console.log("Coluna de destino:", columnId);
        
        // Não usamos tasks.find aqui pois a tarefa não está na coluna destino ainda
        // Apenas enviamos o ID da tarefa e o ID do novo status para a função moveTask
        
        // Chamar a função do useTasks para atualizar o status
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
  
  const backgroundColor = isOver 
    ? (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)')
    : 'transparent';
    
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
          backgroundColor,
          borderRadius: 1,
          p: 1
        }}
      >
        {tasks.length === 0 ? (
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              textAlign: 'center',
              p: 3,
              fontStyle: 'italic'
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
            />
          ))
        )}
      </Box>
      
      {/* Mensagem de erro ao tentar mover tarefas sem permissão */}
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