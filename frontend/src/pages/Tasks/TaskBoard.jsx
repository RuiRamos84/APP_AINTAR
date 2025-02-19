import React, { useState, useEffect } from "react";
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Grid,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Sidebar from "../../components/common/Sidebar/Sidebar";
import { useAuth } from "../../contexts/AuthContext";
import { useMetaData } from "../../contexts/MetaDataContext";
import { getTasks, updateTaskStatus } from "../../services/TaskService";
import TaskColumn from "./TaskColumn";
import TaskModal from "./TaskModal";
import CreateTaskModal from "./CreateTaskModal";
import { groupTasksByPerson } from "./utils";
import { notifyError, notifySuccess } from "../../components/common/Toaster/ThemedToaster";

const TaskBoard = () => {
  const [tasks, setTasks] = useState({});
  const [expandedClient, setExpandedClient] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const { user } = useAuth();
  const { metaData } = useMetaData();
  const isDarkMode = user?.dark_mode || false;

  // Remove o useEffect vazio e chama fetchActiveTasks apenas quando metaData estiver disponível
  useEffect(() => {
    if (metaData && metaData.task_status) {
      fetchActiveTasks();
    }
  }, [metaData]);

  const fetchActiveTasks = async () => {
    // Verifica se os metadados estão disponíveis
    if (!metaData || !metaData.task_status) {
      console.warn("metaData.task_status não disponível, aguardando...");
      return;
    }
    try {
      const tasksData = await getTasks();
      console.log("Tarefas carregadas:", tasksData);
      setTasks(groupTasksByPerson(tasksData, metaData.task_status));
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
      notifyError("Erro ao carregar tarefas");
    }
  };

  const handleExpandClient = (clientName) => {
    setExpandedClient(expandedClient === clientName ? null : clientName);
  };

  const openModal = (task) => {
    setSelectedTask(task);
  };

  const closeModal = () => {
    setSelectedTask(null);
  };

  const moveTask = async (taskId, newStatusText, clientName) => {
    const newState = metaData.task_status.find(
      (status) => status.value === newStatusText
    );
    if (!newState) {
      console.error("Estado não encontrado");
      return;
    }
    try {
      await updateTaskStatus(taskId, newState.pk);
      setTasks((prev) => {
        const copy = { ...prev };
        let movedTask = null;
        Object.keys(copy[clientName].tasks).forEach((statusText) => {
          copy[clientName].tasks[statusText] = copy[clientName].tasks[statusText].filter(
            (task) => {
              if (task.pk === taskId) {
                movedTask = { ...task, status: newState.value };
                return false;
              }
              return true;
            }
          );
        });
        if (!copy[clientName].tasks[newState.value]) {
          copy[clientName].tasks[newState.value] = [];
        }
        if (movedTask) {
          copy[clientName].tasks[newState.value].push(movedTask);
          notifySuccess("Tarefa movida com sucesso");
        }
        return copy;
      });
    } catch (error) {
      console.error("Erro ao atualizar a tarefa:", error);
      notifyError("Erro ao atualizar a tarefa");
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <Box sx={{ flexGrow: 1, p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h4">Tarefas</Typography>
            <Button variant="contained" onClick={() => setIsCreateTaskOpen(true)}>
              Nova Tarefa
            </Button>
          </Box>

          {Object.keys(tasks).length === 0 ? (
            <Typography>Carregando tarefas...</Typography>
          ) : (
            Object.keys(tasks).map((clientName) => {
              const totalUserTasks = Object.values(tasks[clientName].tasks).reduce(
                (acc, arr) => acc + arr.length,
                0
              );
              return (
                <Accordion
                  key={clientName}
                  expanded={expandedClient === clientName}
                  onChange={() => handleExpandClient(clientName)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      {clientName} ({totalUserTasks})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {Object.keys(tasks[clientName].tasks).map((status) => {
                        const columnTasks = tasks[clientName].tasks[status];
                        return (
                          <Grid item xs={12} sm={6} md={4} key={status}>
                            <TaskColumn
                              columnName={status}
                              tasks={columnTasks}
                              clientName={clientName}
                              moveTask={moveTask}
                              openModal={openModal}
                              isDarkMode={isDarkMode}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              );
            })
          )}

          {selectedTask && (
            <TaskModal
              task={selectedTask}
              onClose={closeModal}
              onRefresh={fetchActiveTasks}
            />
          )}
        </Box>
      </Box>

      {metaData && (
        <CreateTaskModal
          isOpen={isCreateTaskOpen}
          onClose={() => setIsCreateTaskOpen(false)}
          onRefresh={fetchActiveTasks}
          metaData={metaData}
        />
      )}
    </DndProvider>
  );
};

export default TaskBoard;
