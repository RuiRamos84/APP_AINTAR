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
import MobileKanban from "./components/MobileKanban";
import QuickFilters from "./components/QuickFilters";
import { useTheme } from "@mui/material";

/**
 * Layout padrão de quadro Kanban para visualização de tarefas em colunas
 */
const TaskBoardLayout = ({ fetchType = 'all', title = "Tarefas", searchTerm = "" }) => {
  const { tasks, loading, error, setFetchType, fetchTasks, moveTask, isMovingTask, setSearchTerm } = useTasks(fetchType);
  const { onTaskClick } = useOutletContext();
  const { metaData } = useMetaData();
  const { user } = useAuth();
  const isDarkMode = user?.dark_mode || false;
  const [expandedClient, setExpandedClient] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
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

  // Função para filtrar tarefas baseado no filtro ativo
  const filterTasks = (tasksToFilter) => {
    if (activeFilter === 'all') return tasksToFilter;

    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    return tasksToFilter.filter(task => {
      switch (activeFilter) {
        case 'notifications':
          return (task.notification_owner === 1 && task.owner === user?.user_id) ||
                 (task.notification_client === 1 && task.ts_client === user?.user_id);

        case 'thisWeek':
          if (!task.when_start) return false;
          const taskDate = new Date(task.when_start);
          return taskDate >= weekStart && taskDate <= weekEnd;

        case 'overdue':
          if (task.when_stop) return false;
          if (!task.when_start) return false;
          const dueDate = new Date(task.when_start);
          return dueDate < new Date() && task.ts_notestatus !== 3;

        case 'highPriority':
          return task.ts_priority === 3;

        default:
          return true;
      }
    });
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

      {/* Quick Filters */}
      <QuickFilters
        tasks={tasks}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        isDarkMode={isDarkMode}
        user={user}
      />

      <DndProvider backend={HTML5Backend}>
        {Object.keys(tasks).length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
            Nenhuma tarefa encontrada.
          </Typography>
        ) : (
          Object.keys(tasks).map((clientName) => {
            const clientTasks = Object.values(tasks[clientName].tasks).flat();
            const filteredClientTasks = filterTasks(clientTasks);

            if (filteredClientTasks.length === 0) {
              return null;
            }

            const totalClientTasks = filteredClientTasks.length;
            
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
                  {/* Usar MobileKanban - responsivo automático */}
                  <MobileKanban
                    statuses={statuses}
                    tasks={filteredClientTasks}
                    onTaskClick={onTaskClick}
                    moveTask={moveTask}
                    isMovingTask={isMovingTask}
                    isDarkMode={isDarkMode}
                    clientName={clientName}
                  />
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