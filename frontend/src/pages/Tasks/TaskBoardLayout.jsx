import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useTasks } from "../../hooks/useTasks";
import { useMetaData } from "../../contexts/MetaDataContext";
import { useAuth } from "../../contexts/AuthContext";
import TaskColumn from "./TaskColumn";
import { useTheme } from "@mui/material";

/**
 * Layout padrão de quadro Kanban para visualização de tarefas em colunas
 */
const TaskBoardLayout = ({ fetchType = 'all', title = "Tarefas", searchTerm = "" }) => {
  const { tasks, loading, error, setFetchType, fetchTasks, moveTask, setSearchTerm } = useTasks(fetchType);
  const { onTaskClick } = useOutletContext();
  const { metaData } = useMetaData();
  const { user } = useAuth();
  const isDarkMode = user?.dark_mode || false;
  const [expandedClient, setExpandedClient] = useState(null);
  const theme = useTheme();
  
  // Status padrão para colunas
  const defaultStatuses = [
    { pk: 1, value: "A Fazer" },
    { pk: 2, value: "Em Progresso" },
    { pk: 3, value: "Concluído" }
  ];
  
  // Usar metadados se disponíveis, ou padrão
  const statuses = metaData?.task_status || defaultStatuses;
  
  // Atualizar o termo de pesquisa
  useEffect(() => {
    if (searchTerm !== undefined) {
      setSearchTerm(searchTerm);
    }
  }, [searchTerm, setSearchTerm]);
  
  // Adicionar listener para atualização global
  useEffect(() => {
    const handleRefresh = () => fetchTasks();
    window.addEventListener('task-refresh', handleRefresh);
    
    return () => window.removeEventListener('task-refresh', handleRefresh);
  }, [fetchTasks]);

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
          Erro ao carregar tarefas
        </Typography>
        <Typography>{error.message || "Tente novamente mais tarde"}</Typography>
      </Box>
    );
  }

  const handleExpandClient = (clientName) => {
    setExpandedClient(expandedClient === clientName ? null : clientName);
  };

  // Extrair todas as tarefas em uma lista plana para MyTasks e CreatedTasks
  const allTasks = Object.values(tasks).flatMap(client =>
    Object.values(client.tasks).flat()
  );
  
  // Função para obter tarefas por status
  const getTasksByStatus = (taskList, statusId) => {
    return taskList.filter(task => task.ts_notestatus === statusId);
  };

  // Função para obter cores de status
  const getStatusColor = (status) => {
    if (!status) return "default";
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('concluído') || statusLower.includes('concluido')) {
      return 'success';
    } else if (statusLower.includes('progresso')) {
      return 'info';
    } else if (statusLower.includes('fazer')) {
      return 'warning';
    }
    return 'default';
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{title}</Typography>
      
      <DndProvider backend={HTML5Backend}>
        {Object.keys(tasks).length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
            Nenhuma tarefa encontrada.
          </Typography>
        ) : (
          Object.keys(tasks).map((clientName) => {
            const clientTasks = Object.values(tasks[clientName].tasks).flat();
            
            if (clientTasks.length === 0) {
              return null;
            }
            
            const totalClientTasks = clientTasks.length;
            
            return (
              <Accordion 
                key={clientName} 
                expanded={expandedClient === clientName}
                onChange={() => handleExpandClient(clientName)}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>
                    <strong>{clientName}</strong> ({totalClientTasks} {totalClientTasks === 1 ? 'tarefa' : 'tarefas'})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2} sx={{ minHeight: '400px' }}>
                    {statuses.map((status) => (
                      <Grid size={{ xs: 12 }} md={4} key={status.pk}>
                        <Paper 
                          sx={{ 
                            p: 2, 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column',
                            bgcolor: isDarkMode ? theme.palette.background.paper : '#f5f5f5',
                            borderRadius: 2,
                            boxShadow: isDarkMode ? '0 4px 8px rgba(0, 0, 0, 0.5)' : 3,
                            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                            '& .MuiTypography-root': {
                              color: isDarkMode ? theme.palette.text.primary : undefined
                            }
                          }}
                        >
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              pb: 1, 
                              mb: 2, 
                              borderBottom: '1px solid', 
                              borderColor: 'divider',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span>{status.value}</span>
                            <Chip 
                              size="small" 
                              label={getTasksByStatus(clientTasks, status.pk).length}
                              color={getStatusColor(status.value)}
                              variant={isDarkMode ? "default" : "outlined"}
                              sx={{
                                fontWeight: 'bold',
                                color: isDarkMode ? 'white' : undefined
                              }}
                            />
                          </Typography>
                          
                          <Box sx={{ 
                            flexGrow: 1, 
                            overflowY: 'auto',
                            pr: 1,
                            '&::-webkit-scrollbar': {
                              width: '8px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                              borderRadius: '4px',
                            }
                          }}>
                            <TaskColumn
                              columnId={status.pk}
                              columnName={status.value}
                              tasks={getTasksByStatus(clientTasks, status.pk)}
                              onTaskClick={onTaskClick}
                              moveTask={(taskId, newStatusId) => moveTask(taskId, newStatusId, clientName)}
                              isDarkMode={isDarkMode}
                            />
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            );
          })
        )}
      </DndProvider>
    </Box>
  );
};

export default TaskBoardLayout;