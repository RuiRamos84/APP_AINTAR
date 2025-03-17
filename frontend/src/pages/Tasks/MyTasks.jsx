import React, { useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Box, Typography, CircularProgress, Grid, Paper } from "@mui/material";
import { useTasks } from "../../hooks/useTasks";
import { useMetaData } from "../../contexts/MetaDataContext";
import { useAuth } from "../../contexts/AuthContext";
import TaskColumn from "./TaskColumn";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const MyTasks = () => {
  const { onTaskClick } = useOutletContext();
  const { tasks, loading, error, setFetchType, fetchTasks, moveTask } = useTasks('my');
  const { metaData } = useMetaData();
  const { user } = useAuth();
  const isDarkMode = user?.dark_mode || false;

  // Status padrão para colunas
  const defaultStatuses = [
    { pk: 1, value: "A Fazer" },
    { pk: 2, value: "Em Progresso" },
    { pk: 3, value: "Concluído" }
  ];
  
  // Usar metadados se disponíveis, ou padrão
  const statuses = metaData?.task_status || defaultStatuses;

  useEffect(() => {
    setFetchType('my');
  }, [setFetchType]);

  useEffect(() => {
    const handleRefresh = () => fetchTasks();
    window.addEventListener('task-refresh', handleRefresh);
    return () => window.removeEventListener('task-refresh', handleRefresh);
  }, [fetchTasks]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ textAlign: 'center', mt: 4 }}><Typography variant="h6" color="error">Erro ao carregar tarefas</Typography></Box>;

  // Extrair tarefas em lista plana
  const allTasks = Object.values(tasks).flatMap(client => Object.values(client.tasks).flat());

  // Função para obter tarefas por status
  const getTasksByStatus = (statusId) => allTasks.filter(task => task.ts_notestatus === statusId);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Minhas Tarefas (Como Cliente)</Typography>
      
      <DndProvider backend={HTML5Backend}>
        {allTasks.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>Nenhuma tarefa encontrada.</Typography>
        ) : (
          <Grid container spacing={2} sx={{ height: 'calc(100vh - 250px)' }}>
            {statuses.map((status) => (
              <Grid item xs={12} md={4} key={status.pk} sx={{ height: '100%' }}>
                <Paper sx={{ 
                  p: 2, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  bgcolor: isDarkMode ? 'background.paper' : '#f5f5f5',
                  borderRadius: 2
                }}>
                  <Typography variant="h6" sx={{ 
                    pb: 1, 
                    mb: 2, 
                    borderBottom: '1px solid', 
                    borderColor: 'divider'
                  }}>
                    {status.value} ({getTasksByStatus(status.pk).length})
                  </Typography>
                  
                  <Box sx={{ 
                    flexGrow: 1, 
                    overflowY: 'auto',
                    pr: 1 
                  }}>
                    <TaskColumn
                      columnId={status.pk}
                      columnName={status.value}
                      tasks={getTasksByStatus(status.pk)}
                      onTaskClick={onTaskClick}
                      moveTask={(taskId, newStatusId) => {
                        const task = allTasks.find(t => t.pk === taskId);
                        if (task) moveTask(taskId, newStatusId, task.ts_client_name);
                      }}
                      isDarkMode={isDarkMode}
                    />
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </DndProvider>
    </Box>
  );
};

export default MyTasks;