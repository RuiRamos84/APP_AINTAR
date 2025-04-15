import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Box, Typography, CircularProgress, Grid, Paper, IconButton, Menu, MenuItem } from "@mui/material";
import { useTasks } from "../../hooks/useTasks";
import { useMetaData } from "../../contexts/MetaDataContext";
import { useAuth } from "../../contexts/AuthContext";
import TaskColumn from "./TaskColumn";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import SortIcon from "@mui/icons-material/Sort"; 
import { TouchBackend } from "react-dnd-touch-backend";

const MyTasks = () => {
  const { onTaskClick, searchTerm } = useOutletContext();
  const { tasks, loading, error, setFetchType, fetchTasks, moveTask } = useTasks('my');
  const { metaData } = useMetaData();
  const { user } = useAuth();
  const isDarkMode = user?.dark_mode || false;
  const [anchorEl, setAnchorEl] = useState(null);


  // Estado para controlar a ordenação de cada coluna
  const [sortByColumn, setSortByColumn] = useState({}); // { columnId: sortCriteria }

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

  // Verifica se o dispositivo é touch
  const isTouchDevice = () => {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  };

  // Escolhe o backend com base no tipo de dispositivo
  const backend = isTouchDevice() ? TouchBackend : HTML5Backend;

  // Função para filtrar tarefas com base no searchTerm
  const filterTasks = (tasks, searchTerm) => {
    if (!searchTerm.trim()) return tasks;

    const lowercaseSearch = searchTerm.toLowerCase();
    return tasks.filter(task =>
      task.name.toLowerCase().includes(lowercaseSearch) ||
      (task.memo && task.memo.toLowerCase().includes(lowercaseSearch))
    );
  };

  // Função para obter tarefas por status e ordená-las
  const getTasksByStatus = (statusId) => {
    const filteredTasks = filterTasks(allTasks.filter(task => task.ts_notestatus === statusId), searchTerm);
    return sortTasks(filteredTasks, sortByColumn[statusId]);
  };

  // Função para ordenar as tarefas
  const sortTasks = (tasks, sortCriteria) => {
    const tasksCopy = [...tasks];
    switch (sortCriteria) {
      case "priority-asc":
        return tasksCopy.sort((a, b) => a.ts_priority - b.ts_priority); // Prioridade ascendente
      case "priority-desc":
        return tasksCopy.sort((a, b) => b.ts_priority - a.ts_priority); // Prioridade descendente
      case "date-asc":
        return tasksCopy.sort((a, b) => new Date(a.when_start) - new Date(b.when_start)); // Data ascendente
      case "date-desc":
        return tasksCopy.sort((a, b) => new Date(b.when_start) - new Date(a.when_start)); // Data descendente
      default:
        return tasksCopy; // Sem ordenação
    }
  };

  // Função para abrir o menu de ordenação de uma coluna específica
  const handleSortClick = (event, columnId) => {
    setAnchorEl({ columnId, element: event.currentTarget });
  };

  // Fechar o menu de ordenação
  const handleSortClose = () => {
    setAnchorEl(null);
  };

  // Selecionar o critério de ordenação para uma coluna específica
  const handleSortSelect = (columnId, criteria) => {
    setSortByColumn((prev) => ({ ...prev, [columnId]: criteria }));
    handleSortClose();
  };

  return (
    <Box>
      {/* <Typography variant="h4" sx={{ mb: 3 }}>Minhas Tarefas (Como Cliente)</Typography> */}
      <DndProvider backend={backend} options={{ enableMouseEvents: true }}>
        {allTasks.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', mt: 2 }}>Nenhuma tarefa encontrada.</Typography>
        ) : (
          <Grid container spacing={2} sx={{ height: 'calc(100vh - 250px)' }}>
            {statuses.map((status) => {
              const columnId = status.pk;
              const isMenuOpen = Boolean(anchorEl) && anchorEl.columnId === columnId;
              return (
                <Grid item xs={12} md={4} key={columnId} sx={{ height: '100%' }}>
                  <Paper sx={{ 
                    p: 2, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    bgcolor: isDarkMode ? 'background.paper' : '#f5f5f5',
                    borderRadius: 2
                  }}>
                    {/* Título da coluna com ícone de ordenação */}
                    <Box sx={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between", 
                      pb: 1, 
                      mb: 2, 
                      borderBottom: '1px solid', 
                      borderColor: 'divider'
                    }}>
                      <Typography variant="h6">
                        {status.value} ({getTasksByStatus(columnId).length})
                      </Typography>
                      <IconButton onClick={(e) => handleSortClick(e, columnId)} size="small">
                        <SortIcon />
                      </IconButton>
                    </Box>

                    {/* Menu de ordenação para a coluna */}
                    <Menu
                      anchorEl={isMenuOpen ? anchorEl.element : null}
                      open={isMenuOpen}
                      onClose={handleSortClose}
                      anchorOrigin={{
                        vertical: 'bottom', // Abre o menu acima do ícone
                        horizontal: 'right', // Alinha o menu à direita do ícone
                      }}
                      transformOrigin={{
                        vertical: 'top', // O menu começa a partir da parte inferior do ícone
                        horizontal: 'right', // Alinha o menu à direita do ícone
                      }}
                    >
                      <MenuItem onClick={() => handleSortSelect(columnId, "priority-asc")}>
                        Prioridade (Ascendente)
                      </MenuItem>
                      <MenuItem onClick={() => handleSortSelect(columnId, "priority-desc")}>
                        Prioridade (Descendente)
                      </MenuItem>
                      <MenuItem onClick={() => handleSortSelect(columnId, "date-asc")}>
                        Data (Ascendente)
                      </MenuItem>
                      <MenuItem onClick={() => handleSortSelect(columnId, "date-desc")}>
                        Data (Descendente)
                      </MenuItem>
                    </Menu>

                    {/* Conteúdo da coluna */}
                    <Box sx={{ 
                      flexGrow: 1, 
                      overflowY: 'auto',
                      pr: 1 
                    }}>
                      <TaskColumn
                        columnId={columnId}
                        columnName={status.value}
                        tasks={getTasksByStatus(columnId)}
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
              );
            })}
          </Grid>
        )}
      </DndProvider>
    </Box>
  );
};

export default MyTasks;