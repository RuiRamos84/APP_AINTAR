import React, { useEffect } from "react";
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Grid, 
  Paper,
  Chip
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTasks } from "../../hooks/useTasks";
import { useAuth } from "../../contexts/AuthContext";
import TaskCard from "./TaskCard";

const CompletedTasks = () => {
  const { tasks, loading, error, setFetchType } = useTasks('completed');
  const { user } = useAuth();
  const isDarkMode = user?.dark_mode || false;

  // Atualizar o tipo de busca para tarefas concluídas
  useEffect(() => {
    setFetchType('completed');
  }, [setFetchType]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="error">
          Erro ao carregar tarefas concluídas
        </Typography>
        <Typography>{error.message}</Typography>
      </Box>
    );
  }

  // Extrair todas as tarefas concluídas de todos os clientes
  const allCompletedTasks = Object.values(tasks).flatMap(client =>
    Object.values(client.tasks).flat()
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tarefas Concluídas</Typography>
        <Chip 
          icon={<CheckCircleIcon />} 
          label={`Total: ${allCompletedTasks.length}`}
          color="success"
          variant="outlined"
        />
      </Box>

      {allCompletedTasks.length === 0 ? (
        <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
          Nenhuma tarefa concluída encontrada.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {allCompletedTasks.map((task) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={task.pk}>
              <Paper 
                sx={{ 
                  p: 0, 
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Overlay para indicar que a tarefa está concluída */}
                <Box sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  zIndex: 2
                }}>
                  <Chip 
                    size="small"
                    icon={<CheckCircleIcon />} 
                    label="Concluída" 
                    color="success"
                  />
                </Box>
                
                <TaskCard 
                  task={task} 
                  onTaskClick={(task) => window.dispatchEvent(new CustomEvent('open-task-modal', { detail: task }))}
                  isDarkMode={isDarkMode}
                  columnId={3} // Sempre coluna "Concluído"
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default CompletedTasks;