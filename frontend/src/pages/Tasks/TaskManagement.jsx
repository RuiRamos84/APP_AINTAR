import React, { useState } from "react";
import { Box, Paper, Typography, Button } from "@mui/material";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import TaskNavigator from "./TaskNavigator";
import TaskModal from "./TaskModal";
import CreateTaskModal from "./CreateTaskModal";
import { useMetaData } from "../../contexts/MetaDataContext";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import "./TaskBoard.css";

/**
 * Componente principal para gerenciamento de tarefas
 * Gerencia as diferentes vistas e modais
 */
const TaskManagement = () => {
  const [selectedTask, setSelectedTask] = useState(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { metaData } = useMetaData();

  // Manipuladores para os modais
  const handleOpenTaskModal = (task) => {
    setSelectedTask(task);
  };

  const handleCloseTaskModal = () => {
    setSelectedTask(null);
  };

  const handleTaskRefresh = () => {
    // Esta função será passada para os componentes filhos para atualizar os dados
    const refreshEvent = new CustomEvent('task-refresh');
    window.dispatchEvent(refreshEvent);
  };

  // Verifica se estamos na rota de tarefas completadas
  const isCompletedTasksRoute = location.pathname.includes("/tasks/completed");
  
  return (
    <DndProvider backend={HTML5Backend}>
      <Paper
        className="paper-task"
        sx={{
          marginLeft: theme.spacing(4),
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }}
      >
        {/* Cabeçalho e botões de ação */}
        <Box className="header-container-task">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Typography variant="h4">Gestão de Tarefas</Typography>
            <Box>
              {isCompletedTasksRoute ? (
                <Button
                  variant="outlined"
                  startIcon={<CheckCircleOutlineIcon />}
                  onClick={() => navigate("/tasks/my")}
                >
                  Ver Tarefas Ativas
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<CheckCircleOutlineIcon />}
                    onClick={() => navigate("/tasks/completed")}
                    sx={{ mr: 2 }}
                  >
                    Ver Concluídas
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => setIsCreateTaskOpen(true)}
                  >
                    Nova Tarefa
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Box>

        {/* Navegação entre diferentes vistas */}
        {!isCompletedTasksRoute && <TaskNavigator />}

        {/* Conteúdo principal - Componentes injetados pelo Router */}
        <div className="tasks-container">
          <Outlet context={{ onTaskClick: handleOpenTaskModal }} />
        </div>

        {/* Modal para visualizar e editar uma tarefa */}
        {selectedTask && (
          <TaskModal
            task={selectedTask}
            onClose={handleCloseTaskModal}
            onRefresh={handleTaskRefresh}
          />
        )}
        
        {/* Modal para criar uma nova tarefa */}
        {metaData && (
          <CreateTaskModal
            isOpen={isCreateTaskOpen}
            onClose={() => setIsCreateTaskOpen(false)}
            onRefresh={handleTaskRefresh}
            metaData={metaData}
          />
        )}
      </Paper>
    </DndProvider>
  );
};

export default TaskManagement;