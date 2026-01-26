import React, { useState, useEffect } from "react";
import { Box, Paper, Typography, Button } from "@mui/material";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import TaskNavigator from "./TaskNavigator";
import TaskModal from "./TaskModal";
import CreateTaskModal from "./CreateTaskModal";
import AdvancedFilters from "./components/AdvancedFilters";
import ExportButton from "./components/ExportButton";
import { useMetaData } from "../../contexts/MetaDataContext";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import SearchBar from "../../components/common/SearchBar/SearchBar";
import { getTasks } from "../../services/TaskService";
import { TouchBackend } from "react-dnd-touch-backend";
import { useDebounce } from "../../hooks/useDebounce";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import ErrorBoundary from "../../components/common/ErrorBoundary";
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
  const [filters, setFilters] = useState({});
  const [allTasks, setAllTasks] = useState([]);
  const { metaData } = useMetaData();
  const { user } = useAuth();
  const isDarkMode = theme.palette.mode === 'dark';

  // Debounce do termo de pesquisa
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const handleSearch = (query) => {
    setSearchTerm(query);
  };

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    'ctrl+n': () => {
      if (!isCompletedTasksRoute) {
        setIsCreateTaskOpen(true);
      }
    },
    'esc': () => {
      if (selectedTask) {
        handleCloseTaskModal();
      } else if (isCreateTaskOpen) {
        setIsCreateTaskOpen(false);
      }
    }
  });

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
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
    // Recarregar tarefas para exportação
    loadAllTasks();
  };

  // Carregar todas as tarefas para exportação
  const loadAllTasks = async () => {
    try {
      const tasks = await getTasks();
      setAllTasks(tasks || []);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    }
  };

  // Carregar tarefas ao montar o componente
  useEffect(() => {
    loadAllTasks();
  }, []);

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
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <DndProvider backend={backend} options={{ enableMouseEvents: true }}>
      <Paper
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          minHeight: '85vh',
          maxHeight: '85vh',
          overflow: 'hidden',
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }}
      >
        {/* Cabeçalho e botões de ação */}
        <Box sx={{ mb: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Typography variant="h4">Gestão de Tarefas</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SearchBar onSearch={handleSearch} />
              {!isCompletedTasksRoute && (
                <>
                  <AdvancedFilters
                    metaData={metaData}
                    onFilterChange={handleFilterChange}
                    isDarkMode={isDarkMode}
                  />
                  <ExportButton tasks={allTasks} isDarkMode={isDarkMode} />
                </>
              )}
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
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            width: '100%',
            minHeight: 0
          }}
        >
          <Outlet context={{ onTaskClick: handleOpenTaskModal, searchTerm: debouncedSearchTerm }} />
        </Box>

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
    </ErrorBoundary>
  );
};

export default TaskManagement;