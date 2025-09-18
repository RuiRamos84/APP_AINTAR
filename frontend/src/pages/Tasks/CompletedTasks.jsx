import React from "react";
import { 
  Box, 
  Typography, 
  Grid, 
  Paper,
  Chip,
  useTheme
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from "../../contexts/AuthContext";
import TaskCard from "./TaskCard";

const CompletedTasks = ({ tasks, onTaskClick, searchTerm, isLoading, error }) => {
  const { user } = useAuth();
  const isDarkMode = user?.dark_mode || false;
  const theme = useTheme();

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

  // Função para filtrar tarefas com base no searchTerm
  const filterTasks = (tasks, searchTerm) => {
    if (!searchTerm.trim()) return tasks;

    const lowercaseSearch = searchTerm.toLowerCase();
    return tasks.filter(task =>
      task.name.toLowerCase().includes(lowercaseSearch) ||
      (task.memo && task.memo.toLowerCase().includes(lowercaseSearch))
    );
  };

  const filteredCompletedTasks = filterTasks(allCompletedTasks, searchTerm);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2
      }}>
        <Typography variant="h4">Tarefas Concluídas</Typography>
        <Chip 
          icon={<CheckCircleIcon />} 
          label={`Total: ${filteredCompletedTasks.length}`}
          color="success"
          variant="outlined"
        />
      </Box>

      {filteredCompletedTasks.length === 0 && !isLoading ? (
        <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
          Nenhuma tarefa concluída encontrada.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {filteredCompletedTasks.map((task) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={task.pk}>
              <Paper 
                sx={{ 
                  p: 0, 
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 2,
                  bgcolor: isDarkMode ? theme.palette.background.paper : '#f5f5f5',
                  boxShadow: isDarkMode ? '0 4px 8px rgba(0, 0, 0, 0.5)' : 3,
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                  '& .MuiTypography-root': {
                    color: isDarkMode ? theme.palette.text.primary : undefined
                  }
            
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
                  onTaskClick={() => onTaskClick(task)}  // Passando a função diretamente
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