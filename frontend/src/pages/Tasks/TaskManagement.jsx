import React, { useState, useEffect } from "react";
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
import SearchBar from "../../components/common/SearchBar/SearchBar";
import { getTasks } from "../../services/TaskService";
import { TouchBackend } from "react-dnd-touch-backend";
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
  const [searchTerm, setSearchTerm] = useState("");
  const { metaData } = useMetaData();

  const handleSearch = (query) => {
    setSearchTerm(query);
  };

  // Manipuladores para os modais
  const handleOpenTaskModal = (task) => {
    setSelectedTask(task);
  };

  const handleCloseTaskModal = () => {
    setSelectedTask(null);
  };
  
  // Verifica se o dispositivo é touch
  const isTouchDevice = () => {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  };

  // Escolhe o backend com base no tipo de dispositivo
  const backend = isTouchDevice() ? TouchBackend : HTML5Backend;

  const handleTaskRefresh = () => {
    // Esta função será passada para os componentes filhos para atualizar os dados
    const refreshEvent = new CustomEvent('task-refresh');
    window.dispatchEvent(refreshEvent);
  };

  // Em TaskManagement.jsx ou componente de rotas
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const taskId = params.get('taskId');
    
    if (taskId) {
      // Buscar a tarefa e abrir o modal
      const fetchTask = async () => {
        try {
          const response = await getTasks();
          if (response && response.tasks) {
            const foundTask = response.tasks.find(t => t.pk === parseInt(taskId));
            if (foundTask) {
              // Abrir diretamente, sem chamar markTaskNotificationAsRead aqui
              handleOpenTaskModal(foundTask);
            }
          }
        } catch (error) {
          console.error("Erro ao buscar tarefa:", error);
        }
      };
      
      fetchTask();
    }
  }, [location.search]);

  // Verifica se estamos na rota de tarefas completadas
  const isCompletedTasksRoute = location.pathname.includes("/tasks/completed");
  
  return (
    <DndProvider backend={backend} options={{ enableMouseEvents: true }}>
      <Paper
        className="paper-task"
        sx={{
          marginLeft: theme.spacing(0),
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }}
      >
        {/* Cabeçalho e botões de ação */}
        <Box className="header-container-task">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Typography variant="h4">Gestão de Tarefas</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SearchBar onSearch={handleSearch} />
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
          <Outlet context={{ onTaskClick: handleOpenTaskModal, searchTerm }} />
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