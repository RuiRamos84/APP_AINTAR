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
  AccordionDetails
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useTasks } from "../../hooks/useTasks";
import { useMetaData } from "../../contexts/MetaDataContext";
import { useAuth } from "../../contexts/AuthContext";
import TaskColumn from "./TaskColumn";

/**
 * Layout padrão de quadro Kanban para visualização de tarefas em colunas
 */
const TaskBoardLayout = ({ fetchType = 'all', title = "Tarefas" }) => {
  const { onTaskClick } = useOutletContext();
  const { tasks, loading, error, setFetchType, fetchTasks, moveTask } = useTasks(fetchType);
  const { metaData } = useMetaData();
  const { user } = useAuth();
  const isDarkMode = user?.dark_mode || false;
  const [expandedClient, setExpandedClient] = useState(null);
  
  // Status padrão para colunas
  const defaultStatuses = [
    { pk: 1, value: "A Fazer" },
    { pk: 2, value: "Em Progresso" },
    { pk: 3, value: "Concluído" }
  ];
  
  // Usar metadados se disponíveis, ou padrão
  const statuses = metaData?.task_status || defaultStatuses;
  
  // Atualizar o tipo de busca
  useEffect(() => {
    setFetchType(fetchType);
  }, [setFetchType, fetchType]);
  
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
    console.log('Filtrando tarefas:', {
      taskListLength: taskList.length,
      statusId,
      tasks: taskList.map(t => ({
        id: t.pk, 
        status: t.ts_notestatus, 
        name: t.name
      }))
    });

    return taskList.filter(task => task.ts_notestatus === statusId);
  };

  // Verificar se precisamos mostrar por cliente (para 'all') ou não (para 'my' e 'created')
  const showByClient = fetchType === 'all';

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{title}</Typography>
      
      <DndProvider backend={HTML5Backend}>
        {showByClient ? (
          // Visualização agrupada por cliente para "Todas as Tarefas"
          Object.keys(tasks).length === 0 ? (
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
                        <Grid item xs={12} md={4} key={status.pk}>
                          <Paper 
                            sx={{ 
                              p: 2, 
                              height: '100%', 
                              display: 'flex', 
                              flexDirection: 'column',
                              bgcolor: isDarkMode ? 'background.paper' : '#f5f5f5',
                              borderRadius: 2
                            }}
                          >
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                pb: 1, 
                                mb: 2, 
                                borderBottom: '1px solid', 
                                borderColor: 'divider'
                              }}
                            >
                              {status.value} ({getTasksByStatus(clientTasks, status.pk).length})
                            </Typography>
                            
                            <Box sx={{ 
                              flexGrow: 1, 
                              overflowY: 'auto',
                              pr: 1,
                              '&::-webkit-scrollbar': {
                                width: '8px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                backgroundColor: 'rgba(0,0,0,0.2)',
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
          )
        ) : (
          // Visualização simples para "Minhas Tarefas" e "Tarefas Criadas"
          allTasks.length === 0 ? (
            <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
              Nenhuma tarefa encontrada.
            </Typography>
          ) : (
            <Grid container spacing={2} sx={{ height: 'calc(100vh - 250px)' }}>
              {statuses.map((status) => {
                const statusTasks = getTasksByStatus(allTasks, status.pk);
                  console.log(`Tarefas para status ${status.value} (${status.pk}):`, {
                    count: statusTasks.length,
                    tasks: statusTasks.map(t => ({
                      id: t.pk, 
                      name: t.name, 
                      status: t.ts_notestatus
                    }))
                  });
                return (
                  <Grid item xs={12} md={4} key={status.pk} sx={{ height: '100%' }}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        bgcolor: isDarkMode ? 'background.paper' : '#f5f5f5',
                        borderRadius: 2
                      }}
                    >
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          pb: 1, 
                          mb: 2, 
                          borderBottom: '1px solid', 
                          borderColor: 'divider'
                        }}
                      >
                        {status.value} ({statusTasks.length})
                      </Typography>
                      
                      <Box sx={{ 
                        flexGrow: 1, 
                        overflowY: 'auto',
                        pr: 1,
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          borderRadius: '4px',
                        }
                      }}>
                        <TaskColumn
                          columnId={status.pk}
                          columnName={status.value}
                          tasks={statusTasks}
                          onTaskClick={onTaskClick}
                          moveTask={(taskId, newStatusId) => {
                            const task = allTasks.find(t => t.pk === taskId);
                            if (task) {
                              console.log("Movendo tarefa:", taskId, "para status:", newStatusId);
                              moveTask(taskId, newStatusId, task.ts_client_name);
                            }
                          }}
                          isDarkMode={isDarkMode}
                        />
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )
        )}
      </DndProvider>
    </Box>
  );
};

export default TaskBoardLayout;