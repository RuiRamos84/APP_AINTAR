// import React, { useState, useEffect } from "react";
// import {
//   Accordion,
//   AccordionSummary,
//   AccordionDetails,
//   Typography,
//   Grid,
//   Button,
//   Paper,
//   Box,
//   useTheme,
//   CircularProgress,
// } from "@mui/material";
// import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
// import { DndProvider } from "react-dnd";
// import { HTML5Backend } from "react-dnd-html5-backend";
// import { useAuth } from "../../contexts/AuthContext";
// import { useMetaData } from "../../contexts/MetaDataContext";
// import { getTasks, updateTaskStatus } from "../../services/TaskService";
// import TaskColumn from "./TaskColumn";
// import TaskModal from "./TaskModal";
// import CreateTaskModal from "./CreateTaskModal";
// import { groupTasksByPerson } from "./utils";
// import { notifyError, notifySuccess } from "../../components/common/Toaster/ThemedToaster";
// import "./TaskBoard.css";

// const TaskBoard = () => {
//   const [tasks, setTasks] = useState({});
//   const [expandedClient, setExpandedClient] = useState(null);
//   const [selectedTask, setSelectedTask] = useState(null);
//   const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
  
//   const theme = useTheme();
//   const { user } = useAuth();
//   const { metaData } = useMetaData();
//   const isDarkMode = user?.dark_mode || false;

//   useEffect(() => {
//     if (metaData && metaData.task_status) {
//       fetchActiveTasks();
//     }
//   }, [metaData]);

//   const fetchActiveTasks = async () => {
//     setLoading(true);
//     setError(null);
    
//     if (!metaData || !metaData.task_status) {
//       console.warn("metaData.task_status não disponível, aguardando...");
//       setLoading(false);
//       return;
//     }
    
//     try {
//       const tasksData = await getTasks();
//       console.log("Tarefas carregadas:", tasksData);
//       setTasks(groupTasksByPerson(tasksData, metaData.task_status));
//     } catch (error) {
//       console.error("Erro ao carregar tarefas:", error);
//       setError("Erro ao carregar tarefas. Tente novamente mais tarde.");
//       notifyError("Erro ao carregar tarefas");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleExpandClient = (clientName) => {
//     setExpandedClient(expandedClient === clientName ? null : clientName);
//   };

//   const openModal = (task) => {
//     setSelectedTask(task);
//   };

//   const closeModal = () => {
//     setSelectedTask(null);
//   };

//   const moveTask = async (taskId, newStatusText, clientName) => {
//     const newState = metaData.task_status.find(
//       (status) => status.value === newStatusText
//     );
//     if (!newState) {
//       console.error("Estado não encontrado");
//       return;
//     }
//     try {
//       await updateTaskStatus(taskId, newState.pk);
//       setTasks((prev) => {
//         const copy = { ...prev };
//         let movedTask = null;
//         Object.keys(copy[clientName].tasks).forEach((statusText) => {
//           copy[clientName].tasks[statusText] = copy[clientName].tasks[statusText].filter(
//             (task) => {
//               if (task.pk === taskId) {
//                 movedTask = { ...task, status: newState.value };
//                 return false;
//               }
//               return true;
//             }
//           );
//         });
//         if (!copy[clientName].tasks[newState.value]) {
//           copy[clientName].tasks[newState.value] = [];
//         }
//         if (movedTask) {
//           copy[clientName].tasks[newState.value].push(movedTask);
//           notifySuccess("Tarefa movida com sucesso");
//         }
//         return copy;
//       });
//     } catch (error) {
//       console.error("Erro ao atualizar a tarefa:", error);
//       notifyError("Erro ao atualizar a tarefa");
//     }
//   };

//   // Estado de carregamento 
//   if (loading) {
//     return (
//       <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
//         <CircularProgress />
//       </Box>
//     );
//   }

//   // Estado de erro
//   if (error) {
//     return (
//       <Box sx={{ p: 2 }}>
//         <Typography color="error">{error}</Typography>
//       </Box>
//     );
//   }

//   return (
//     <Paper
//       className="paper-task"
//       sx={{
//         marginLeft: theme.spacing(4),
//         backgroundColor: theme.palette.background.paper,
//         color: theme.palette.text.primary,
//       }}
//     >
//       <Grid container className="header-container-task" alignItems="center" spacing={2}>
//         <Grid item xs={6}>
//           <Typography variant="h4">Tarefas</Typography>
//         </Grid>
//         <Grid item xs={6} container justifyContent="flex-end">
//           <Button variant="contained" color="primary" onClick={() => setIsCreateTaskOpen(true)}>
//             Nova Tarefa
//           </Button>
//         </Grid>
//       </Grid>

//       <div className="tasks-container">
//         <DndProvider backend={HTML5Backend}>
//           {Object.keys(tasks).length === 0 ? (
//             <Typography sx={{ p: 2 }}>Nenhuma tarefa encontrada</Typography>
//           ) : (
//             Object.keys(tasks).map((clientName) => {
//               const totalUserTasks = Object.values(tasks[clientName].tasks).reduce(
//                 (acc, arr) => acc + arr.length,
//                 0
//               );
//               return (
//                 <Accordion
//                   key={clientName}
//                   expanded={expandedClient === clientName}
//                   onChange={() => handleExpandClient(clientName)}
//                   sx={{ mb: 1 }}
//                 >
//                   <AccordionSummary expandIcon={<ExpandMoreIcon />}>
//                     <Typography>
//                       {clientName} ({totalUserTasks})
//                     </Typography>
//                   </AccordionSummary>
//                   <AccordionDetails>
//                     <Grid container spacing={2}>
//                       {Object.keys(tasks[clientName].tasks).map((status) => {
//                         const columnTasks = tasks[clientName].tasks[status];
//                         return (
//                           <Grid item xs={12} sm={6} md={4} key={status}>
//                             <TaskColumn
//                               columnName={status}
//                               tasks={columnTasks}
//                               clientName={clientName}
//                               moveTask={moveTask}
//                               openModal={openModal}
//                               isDarkMode={isDarkMode}
//                             />
//                           </Grid>
//                         );
//                       })}
//                     </Grid>
//                   </AccordionDetails>
//                 </Accordion>
//               );
//             })
//           )}
//         </DndProvider>
//       </div>
      
//       {selectedTask && (
//         <TaskModal
//           task={selectedTask}
//           onClose={closeModal}
//           onRefresh={fetchActiveTasks}
//         />
//       )}
      
//       {metaData && (
//         <CreateTaskModal
//           isOpen={isCreateTaskOpen}
//           onClose={() => setIsCreateTaskOpen(false)}
//           onRefresh={fetchActiveTasks}
//           metaData={metaData}
//         />
//       )}
//     </Paper>
//   );
// };

// export default TaskBoard;