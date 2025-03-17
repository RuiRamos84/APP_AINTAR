import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Modal,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import React, { useEffect, useState, useCallback } from "react";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import InfoIcon from "@mui/icons-material/Info";
import NotesIcon from "@mui/icons-material/Notes";
import PersonIcon from "@mui/icons-material/Person";
import SaveIcon from "@mui/icons-material/Save";
import Timeline from '@mui/lab/Timeline';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import { notifyError, notifySuccess } from "../../components/common/Toaster/ThemedToaster";
import { useAuth } from "../../contexts/AuthContext";
import { useMetaData } from "../../contexts/MetaDataContext";
import { addTaskNote, closeTask, getTaskHistory, updateTask, updateTaskNotification, getTasks } from "../../services/TaskService";
import { getPriorityIcons } from "./utils";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`task-tabpanel-${index}`}
      aria-labelledby={`task-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TaskModal = ({ task, onClose, onRefresh }) => {
  const { user } = useAuth();
  const { metaData } = useMetaData();
  const [tabValue, setTabValue] = useState(0);
  const [newNote, setNewNote] = useState("");
  const [taskHistory, setTaskHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [localTask, setLocalTask] = useState(null);

  // Inicializar editedTask quando task muda
  useEffect(() => {
    if (task) {
      setEditedTask({...task});
    }
  }, [task]);

  // Função para encontrar a tarefa atualizada em todas as tarefas
  const refreshTaskData = useCallback(async () => {
    if (!task?.pk) return;
    
    try {
      const allTasks = await getTasks();
      const updatedTask = allTasks.find(t => t.pk === task.pk);
      if (updatedTask) {
        setLocalTask(updatedTask);
        if (!isEditing) {
          setEditedTask({...updatedTask});
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados atualizados da tarefa:", error);
    }
  }, [task?.pk, isEditing]);

  // Use a tarefa atualizada de localTask, ou a original de task
  const currentTask = localTask || task;

  // Verificações seguras com operador de encadeamento opcional
  const canEdit = currentTask && !currentTask?.when_stop && currentTask?.owner === user?.user_id;
  const canClose = currentTask && !currentTask?.when_stop && currentTask?.owner === user?.user_id;
  const canAddNote = currentTask && !currentTask?.when_stop && 
                     (currentTask?.owner === user?.user_id || currentTask?.ts_client === user?.user_id);

  useEffect(() => {
    if (task) {
      setLocalTask(task);
      setEditedTask({...task});  // Deep copy para evitar referência direta
      loadHistory();
      
      // Atualiza a notificação se estiver ativa
      if (task.notification_owner === 0) {
        updateTaskNotification(task.pk)
          .then(() => {
            refreshTaskData();
          })
          .catch((err) => {
            console.error("Erro ao atualizar notificação:", err);
            notifyError("Erro ao atualizar notificação");
          });
      }
    }
  }, [task]);

  // Listener para evento global de atualização de tarefas
  useEffect(() => {
    const handleTaskRefresh = () => {
      if (task?.pk) {
        refreshTaskData();
        loadHistory();
      }
    };
    
    window.addEventListener('task-refresh', handleTaskRefresh);
    return () => window.removeEventListener('task-refresh', handleTaskRefresh);
  }, [task, refreshTaskData]);

  const loadHistory = async () => {
    if (!task?.pk) return;
    
    try {
      const history = await getTaskHistory(task.pk);
      setTaskHistory(history);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      notifyError("Erro ao carregar histórico da tarefa");
    }
  };

  const handleAddNote = async () => {
    if (!task?.pk || !newNote.trim()) return;
    
    setIsAddingNote(true);
    try {
      await addTaskNote(task.pk, newNote);
      await loadHistory();
      setNewNote("");
      notifySuccess("Nota adicionada com sucesso!");
      refreshTaskData();
    } catch (error) {
      console.error("Erro ao adicionar nota:", error);
      notifyError("Erro ao adicionar nota");
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleCloseTask = async () => {
    if (!task?.pk) return;
    
    try {
      await closeTask(task.pk);
      notifySuccess("Tarefa encerrada com sucesso!");
      if (onRefresh) onRefresh();
      onClose();
    } catch (error) {
      console.error("Erro ao encerrar tarefa:", error);
      notifyError("Erro ao encerrar tarefa");
    }
  };

  const handleUpdateTask = async () => {
    if (!task?.pk || !editedTask) return;
    
    setIsUpdating(true);
    try {
      await updateTask(task.pk, editedTask);
      notifySuccess("Tarefa atualizada com sucesso!");
      
      // Atualizar dados locais imediatamente
      setLocalTask({...editedTask});
      
      // Disparar atualização global
      if (onRefresh) onRefresh();
      
      // Sair do modo de edição
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      notifyError("Erro ao atualizar tarefa");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedTask(localTask || task);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Verificação de null antes de renderizar
  if (!currentTask || !editedTask) return null;

  // Ordenar história da mais recente para a mais antiga
  const sortedHistory = [...(taskHistory || [])].sort((a, b) => 
    new Date(b.when_submit) - new Date(a.when_submit)
  );

  // Obtém o nome do status baseado no ts_notestatus
  const getStatusName = (statusCode) => {
    if (!metaData || !metaData.task_status || !statusCode) return `Status ${statusCode || '?'}`;
    
    const statusObj = metaData.task_status.find(s => s.pk === statusCode);
    return statusObj ? statusObj.value : `Status ${statusCode}`;
  };

  // Obtém a cor baseada no status
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
    <Modal open={Boolean(task)} onClose={onClose}>
      <Paper
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "95%", md: 800 },
          maxHeight: "90vh",
          borderRadius: 2,
          boxShadow: 24,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Cabeçalho */}
        <Box sx={{ 
          p: 2, 
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
            <Typography variant="h5" component="h2">
              {currentTask?.name || "Sem nome"}
            </Typography>
            
            <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
              <Chip 
                icon={<CalendarMonthIcon />} 
                label={currentTask?.when_start ? new Date(currentTask.when_start).toLocaleDateString() : "-"}
                size="small"
                variant="outlined"
              />
              
              <Chip 
                label={`Cliente: ${currentTask?.ts_client_name || "Desconhecido"}`}
                size="small"
                variant="outlined"
              />
              
              <Chip 
                icon={<PersonIcon />}
                label={`Responsável: ${currentTask?.owner_name || "Não atribuído"}`}
                size="small"
                variant="outlined"
              />
              
              <Chip 
                label={getStatusName(currentTask?.ts_notestatus)}
                color={getStatusColor(getStatusName(currentTask?.ts_notestatus))}
                size="small"
              />
              {currentTask?.when_stop && (
                <Chip 
                  label={"Fechada em: " + new Date(currentTask.when_stop).toLocaleDateString()}
                  color="success"
                  size="small"
                />
              )}
            </Box>
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Box>{getPriorityIcons(currentTask?.ts_priority)}</Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Abas */}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
            <Tab icon={<InfoIcon />} label="Detalhes" id="task-tab-0" />
            <Tab icon={<NotesIcon />} label="Histórico" id="task-tab-1" />
          </Tabs>
        </Box>

        {/* Conteúdo das Abas */}
        <Box sx={{ flexGrow: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          {/* Aba de Detalhes */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Cabeçalho das Ações */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6">
                  Detalhes da Tarefa
                  {currentTask?.when_stop && (
                    <Chip 
                      label="Fechada"
                      color="success"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
                {!isEditing && canEdit && (
                  <Button 
                    variant="outlined" 
                    startIcon={<EditIcon />} 
                    onClick={() => setIsEditing(true)}
                  >
                    Editar
                  </Button>
                )}
              </Box>
              
              <Divider />
              
              {/* Campos Editáveis */}
              <TextField
                label="Nome"
                fullWidth
                value={editedTask?.name || ""}
                onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
                disabled={!isEditing}
                variant={isEditing ? "outlined" : "filled"}
                sx={{ mb: 2 }}
              />
              
              {isEditing && (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Cliente</InputLabel>
                  <Select
                    value={editedTask?.ts_client || ""}
                    label="Cliente"
                    onChange={(e) => setEditedTask({ ...editedTask, ts_client: e.target.value })}
                  >
                    {metaData?.who?.map((client) => (
                      <MenuItem key={client.pk} value={client.pk}>
                        {client.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              {isEditing && canEdit && (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editedTask?.ts_notestatus || ""}
                    label="Status"
                    onChange={(e) => setEditedTask({ ...editedTask, ts_notestatus: e.target.value })}
                  >
                    {metaData?.task_status?.map((status) => (
                      <MenuItem key={status.pk} value={status.pk}>
                        {status.value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}              
              {isEditing && (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Prioridade</InputLabel>
                  <Select
                    value={editedTask?.ts_priority || 1}
                    label="Prioridade"
                    onChange={(e) => setEditedTask({ ...editedTask, ts_priority: e.target.value })}
                  >
                    {metaData?.task_priority?.map((priority) => (
                      <MenuItem key={priority.pk} value={priority.pk}>
                        {priority.value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              <TextField
                label="Descrição"
                fullWidth
                multiline
                rows={4}
                value={editedTask?.memo || ""}
                onChange={(e) => setEditedTask({ ...editedTask, memo: e.target.value })}
                disabled={!isEditing}
                variant={isEditing ? "outlined" : "filled"}
                sx={{ mb: 2 }}
              />
              
              {/* Botões de Ação para Modo de Edição */}
              {isEditing && (
                <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    startIcon={<CancelIcon />} 
                    onClick={handleCancel}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<SaveIcon />} 
                    onClick={handleUpdateTask}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "A guardar..." : "Guardar"}
                  </Button>
                </Box>
              )}
              
              {/* Opção de encerrar tarefa - apenas se não estiver em modo de edição e tarefa não estiver fechada */}
              {!isEditing && canClose && (
                <Button 
                  variant="contained" 
                  color="error" 
                  startIcon={<CheckCircleIcon />}
                  onClick={handleCloseTask}
                  fullWidth
                >
                  Encerrar Tarefa
                </Button>
              )}
            </Box>
          </TabPanel>

          {/* Aba de Histórico */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Adicionar Nova Nota */}
              {!currentTask?.when_stop && canAddNote ? (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Adicionar Nova Nota</Typography>
                  <TextField
                    label="Nova Nota"
                    fullWidth
                    multiline
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddNote}
                    disabled={isAddingNote || !newNote.trim()}
                  >
                    {isAddingNote ? "A adicionar..." : "Adicionar Nota"}
                  </Button>
                </Box>
              ) : (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    {currentTask?.when_stop ? 
                      "Esta tarefa está fechada." : 
                      "Você não tem permissão para adicionar notas."}
                  </Typography>
                </Box>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              {/* Histórico de Notas */}
              <Typography variant="h6" gutterBottom>Histórico de Atualizações</Typography>
              
              {sortedHistory.length === 0 ? (
                <Typography variant="body2" sx={{ fontStyle: "italic", textAlign: "center", py: 3 }}>
                  Sem histórico disponível.
                </Typography>
              ) : (
                <Timeline position="right" sx={{ p: 0, m: 0 }}>
                  {sortedHistory.map((item, index) => (
                    <TimelineItem key={index}>
                      <TimelineOppositeContent sx={{ maxWidth: 120 }}>
                        <Typography variant="caption" color="text.secondary">
                          {item?.when_submit ? new Date(item.when_submit).toLocaleDateString() : "-"}
                          <br />
                          {item?.when_submit ? new Date(item.when_submit).toLocaleTimeString() : "-"}
                        </Typography>
                      </TimelineOppositeContent>
                      
                      <TimelineSeparator>
                        <TimelineDot 
                          color={item?.isadmin ? "secondary" : "primary"}
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}
                        >
                          {item?.isadmin ? 
                            <PersonIcon fontSize="small" /> : 
                            <BusinessIcon fontSize="small" />
                          }
                        </TimelineDot>
                        {index < sortedHistory.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      
                      <TimelineContent sx={{ py: '12px', px: 2 }}>
                        <Badge
                          color="error"
                          variant="dot"
                          invisible={item?.notification_owner !== 0}
                          sx={{ width: '100%' }}
                        >
                          <Paper 
                            elevation={1} 
                            sx={{ 
                              p: 2, 
                              bgcolor: item?.notification_owner === 0 ? 'action.hover' : 'background.paper',
                              borderLeft: '4px solid',
                              borderColor: item?.isadmin ? 'secondary.main' : 'primary.main'
                            }}
                          >
                            <Typography variant="subtitle2">
                              {item?.isadmin === 1 ? currentTask?.ts_client_name || "Cliente" : currentTask?.owner_name || "Responsável"}
                            </Typography>
                            <Typography variant="body2">{item?.memo || ""}</Typography>
                          </Paper>
                        </Badge>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              )}
            </Box>
          </TabPanel>
        </Box>
      </Paper>
    </Modal>
  );
};

export default TaskModal;