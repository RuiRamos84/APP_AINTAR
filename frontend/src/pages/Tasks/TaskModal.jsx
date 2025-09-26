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
  Typography,
  useTheme,
} from "@mui/material";
import React, { useEffect, useState, useCallback } from "react";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import EditIcon from "@mui/icons-material/Edit";
import InfoIcon from "@mui/icons-material/Info";
import NotesIcon from "@mui/icons-material/Notes";
import PersonIcon from "@mui/icons-material/Person";
import SaveIcon from "@mui/icons-material/Save";
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator
} from '@mui/lab';
import { notifyError, notifySuccess } from "../../components/common/Toaster/ThemedToaster";
import { useAuth } from "../../contexts/AuthContext";
import { useMetaData } from "../../contexts/MetaDataContext";
import { addTaskNote, closeTask, getTaskHistory, updateTask, updateTaskNotification, getTasks } from "../../services/TaskService";
import { getPriorityIcons } from "./utils";
import { useSocket } from "../../contexts/SocketContext";

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

const pulseKeyframes = `
@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  
  50% {
    opacity: 1;
  }
  
  100% {
    opacity: 0.6;
  }
}`;

const TaskModal = ({ task, onClose, onRefresh }) => {
  const { user } = useAuth();
  const { metaData } = useMetaData();
  const { markTaskNotificationAsRead } = useSocket();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const [tabValue, setTabValue] = useState(1);
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
      setLocalTask(task);
      setEditedTask({...task});
      loadHistory();
      
      // Verificar se a tarefa tem notificações
      const isOwner = task.owner === user?.user_id;
      const isClient = task.ts_client === user?.user_id;
      const hasNotification = (isOwner && task.notification_owner === 1) || 
                            (isClient && task.notification_client === 1);
      
      if (hasNotification) {
        // Forçar atualização da lista de tarefas
        window.dispatchEvent(new CustomEvent('task-refresh'));
        
        // Chamar API para limpar notificação
        updateTaskNotification(task.pk)
          .then(() => {
            if (markTaskNotificationAsRead) {
              markTaskNotificationAsRead(task.pk, true);
            }
            refreshTaskData(true);
          });
      }
    }
  }, [task?.pk]);

  // Função para encontrar a tarefa atualizada em todas as tarefas
  const refreshTaskData = useCallback(async () => {
    if (!task?.pk) return;
    
    try {
      const allTasks = await getTasks();
      const updatedTask = allTasks.find(t => t.pk === task.pk);
      
      if (updatedTask) {
        setLocalTask(prev => ({...prev, ...updatedTask}));
        if (!isEditing) {
          setEditedTask(prev => ({...prev, ...updatedTask}));
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
    setEditedTask({...task});
    loadHistory();
    
    // Adicione este controle para evitar múltiplas chamadas
    const hasUnreadNotification = task.notification_owner === 0 
                               || task.notification_client === 0;
    
    if (hasUnreadNotification) {
      // Usar setTimeout para garantir que não acontece demasiadas vezes
      const timer = setTimeout(() => {
        updateTaskNotification(task.pk)
          .then(() => {
            if (markTaskNotificationAsRead) {
              markTaskNotificationAsRead(task.pk, false);
            }
            refreshTaskData();
          })
          .catch((err) => console.error("Erro ao atualizar notificação:", err));
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }
}, [task?.pk]);

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
  <Dialog
    open={Boolean(task)}
    onClose={onClose}
    maxWidth="md"
    fullWidth
    aria-labelledby="task-dialog-title"
    aria-describedby="task-dialog-description"
  >
    <style>{pulseKeyframes}</style>
    <DialogContent 
      sx={{
        p: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        maxHeight: "90vh",
        '&:first-of-type': {
          pt: 0
        }
      }}
    >
      {/* Cabeçalho */}
      <Box sx={{ 
        p: 2, 
        bgcolor: isDarkMode ? theme.palette.background.paper : "background.paper",
        borderBottom: 1,
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : "divider",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "relative"
      }}>
        {/* Barra pulsante */}
        {currentTask?.notification_owner === 0 && (
          <Box 
            sx={{ 
              position: 'absolute', 
              top: '0px', 
              left: '0px', 
              width: '100%', 
              height: '4px', 
              bgcolor: 'error.main',
              animation: 'pulse 1.5s infinite'
            }} 
          />
        )}
          <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
            <Typography 
              variant="h5" 
              component="h2"
              sx={{ color: isDarkMode ? 'white' : 'inherit' }}
            >
              {currentTask?.name || "Sem nome"}
            </Typography>
            
            <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
              <Chip 
                icon={<CalendarMonthIcon />} 
                label={currentTask?.when_start ? new Date(currentTask.when_start).toLocaleDateString() : "-"}
                size="small"
                variant="outlined"
                sx={{ 
                  bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : undefined,
                  color: isDarkMode ? 'white' : undefined,
                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined
                }}
              />
              
              <Chip 
                label={`Cliente: ${currentTask?.ts_client_name || "Desconhecido"}`}
                size="small"
                variant="outlined"
                sx={{ 
                  bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : undefined,
                  color: isDarkMode ? 'white' : undefined,
                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined
                }}
              />
              
              <Chip 
                icon={<PersonIcon />}
                label={`Responsável: ${currentTask?.owner_name || "Não atribuído"}`}
                size="small"
                variant="outlined"
                sx={{ 
                  bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : undefined,
                  color: isDarkMode ? 'white' : undefined,
                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined
                }}
              />
              
              <Chip 
                label={getStatusName(currentTask?.ts_notestatus)}
                color={getStatusColor(getStatusName(currentTask?.ts_notestatus))}
                size="small"
                sx={{ 
                  color: isDarkMode ? 'white' : undefined,
                  fontWeight: isDarkMode ? 'medium' : undefined
                }}
              />
              
              {currentTask?.when_stop && (
                <Chip 
                  label={"Fechada em: " + new Date(currentTask.when_stop).toLocaleDateString()}
                  color="success"
                  size="small"
                  sx={{ 
                    color: isDarkMode ? 'white' : undefined,
                    fontWeight: isDarkMode ? 'medium' : undefined
                  }}
                />
              )}
            </Box>
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Box>{getPriorityIcons(currentTask?.ts_priority)}</Box>
            <IconButton 
              onClick={onClose} 
              size="small"
              sx={{ color: isDarkMode ? 'white' : undefined }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Abas */}
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : "divider"
        }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': { 
                color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
              },
              '& .Mui-selected': {
                color: isDarkMode ? 'white !important' : undefined
              },
              '& .MuiTabs-indicator': {
                backgroundColor: isDarkMode ? 'white' : undefined
              }
            }}
          >
            <Tab icon={<InfoIcon />} label="Detalhes" id="task-tab-0" />
            <Tab icon={<NotesIcon />} label="Histórico" id="task-tab-1" />
          </Tabs>
        </Box>

        {/* Conteúdo das Abas */}
        <Box sx={{ 
            flexGrow: 1, 
            overflow: "auto", 
            display: "flex", 
            flexDirection: "column",
            bgcolor: isDarkMode ? theme.palette.background.paper : undefined,
            // Adicione estes estilos para a scrollbar
            "&::-webkit-scrollbar": {
              width: "8px"
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: isDarkMode ? "rgba(0, 0, 0, 0.2)" : "#f1f1f1"
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.2)" : "#888",
              borderRadius: "4px"
            },
            "&::-webkit-scrollbar-thumb:hover": {
              backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.3)" : "#555"
            }
          }}>
          {/* Aba de Detalhes */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: 2,
              color: isDarkMode ? 'text.primary' : undefined
            }}>
              {/* Cabeçalho das Ações */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography 
                  variant="h6"
                  sx={{ color: isDarkMode ? 'white' : undefined }}
                >
                  Detalhes da Tarefa
                  {currentTask?.when_stop && (
                    <Chip 
                      label="Fechada"
                      color="success"
                      size="small"
                      sx={{ 
                        ml: 1,
                        color: isDarkMode ? 'white' : undefined,
                        fontWeight: isDarkMode ? 'medium' : undefined
                      }}
                    />
                  )}
                </Typography>
                {!isEditing && canEdit && (
                  <Button 
                    variant="outlined" 
                    startIcon={<EditIcon />} 
                    onClick={() => setIsEditing(true)}
                    sx={{ 
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : undefined,
                      color: isDarkMode ? 'white' : undefined,
                      '&:hover': {
                        borderColor: isDarkMode ? 'white' : undefined,
                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : undefined
                      }
                    }}
                  >
                    Editar
                  </Button>
                )}
              </Box>
              
              <Divider sx={{ 
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : undefined 
              }} />
              
              {/* Campos Editáveis */}
              <TextField
                label="Nome"
                fullWidth
                value={editedTask?.name || ""}
                onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
                disabled={!isEditing}
                variant={isEditing ? "outlined" : "filled"}
                sx={{ 
                  mb: 2,
                  '& .MuiInputBase-input': {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
                  },
                  '& .MuiInputLabel-root': {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
                  },
                  '& .MuiFilledInput-root': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : undefined
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : undefined
                  },
                  '& .Mui-disabled .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : undefined
                  },
                  '& .Mui-disabled': {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : undefined
                  }
                }}
              />
              
              {isEditing && (
                <FormControl 
                  fullWidth 
                  sx={{ 
                    mb: 2,
                    '& .MuiInputLabel-root': {
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : undefined
                    },
                    '& .MuiSelect-select': {
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
                    },
                    '& .MuiSvgIcon-root': {
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
                    }
                  }}
                >
                  <InputLabel>Cliente</InputLabel>
                  <Select
                    value={editedTask?.ts_client || ""}
                    label="Cliente"
                    onChange={(e) => setEditedTask({ ...editedTask, ts_client: e.target.value })}
                  >
                    {metaData?.who?.map((client) => (
                      <MenuItem 
                        key={client.pk} 
                        value={client.pk}
                        sx={{ 
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
                        }}
                      >
                        {client.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              {isEditing && canEdit && (
                <FormControl 
                  fullWidth 
                  sx={{ 
                    mb: 2,
                    '& .MuiInputLabel-root': {
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : undefined
                    },
                    '& .MuiSelect-select': {
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
                    },
                    '& .MuiSvgIcon-root': {
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
                    }
                  }}
                >
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editedTask?.ts_notestatus || ""}
                    label="Status"
                    onChange={(e) => setEditedTask({ ...editedTask, ts_notestatus: e.target.value })}
                  >
                    {metaData?.task_status?.map((status) => (
                      <MenuItem 
                        key={status.pk} 
                        value={status.pk}
                        sx={{ 
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
                        }}
                      >
                        {status.value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              {isEditing && (
                <FormControl 
                  fullWidth 
                  sx={{ 
                    mb: 2,
                    '& .MuiInputLabel-root': {
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : undefined
                    },
                    '& .MuiSelect-select': {
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
                    },
                    '& .MuiSvgIcon-root': {
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
                    }
                  }}
                >
                  <InputLabel>Prioridade</InputLabel>
                  <Select
                    value={editedTask?.ts_priority || 1}
                    label="Prioridade"
                    onChange={(e) => setEditedTask({ ...editedTask, ts_priority: e.target.value })}
                  >
                    {metaData?.task_priority?.map((priority) => (
                      <MenuItem 
                        key={priority.pk} 
                        value={priority.pk}
                        sx={{ 
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
                        }}
                      >
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
                sx={{ 
                  mb: 2,
                  '& .MuiInputBase-input': {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
                  },
                  '& .MuiInputLabel-root': {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
                  },
                  '& .MuiFilledInput-root': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : undefined
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : undefined
                  },
                  '& .Mui-disabled .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : undefined
                  },
                  '& .Mui-disabled': {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : undefined
                  }
                }}
              />
              
              {/* Botões de Ação para Modo de Edição */}
              {isEditing && (
                <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    startIcon={<CancelIcon />} 
                    onClick={handleCancel}
                    sx={{ 
                      borderColor: isDarkMode ? 'rgba(255, 99, 99, 0.5)' : undefined,
                      color: isDarkMode ? 'rgba(255, 99, 99, 1)' : undefined,
                      '&:hover': {
                        borderColor: isDarkMode ? 'rgba(255, 99, 99, 0.8)' : undefined,
                        backgroundColor: isDarkMode ? 'rgba(255, 99, 99, 0.08)' : undefined
                      }
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<SaveIcon />} 
                    onClick={handleUpdateTask}
                    disabled={isUpdating}
                    sx={{ 
                      color: isDarkMode ? 'white' : undefined
                    }}
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
                  sx={{ 
                    color: isDarkMode ? 'white' : undefined
                  }}
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
                  <Typography 
                    variant="h6" 
                    gutterBottom
                    sx={{ color: isDarkMode ? 'white' : undefined }}
                  >
                    Adicionar Nova Nota
                  </Typography>
                  <TextField
                    label="Nova Nota"
                    fullWidth
                    multiline
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    sx={{ 
                      mb: 1,
                      '& .MuiInputBase-input': {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
                      },
                      '& .MuiInputLabel-root': {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : undefined
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddNote}
                    disabled={isAddingNote || !newNote.trim()}
                    sx={{ 
                      color: isDarkMode ? 'white' : undefined
                    }}
                  >
                    {isAddingNote ? "A adicionar..." : "Adicionar Nota"}
                  </Button>
                </Box>
              ) : (
                <Box sx={{ 
                  mb: 3, 
                  p: 2, 
                  bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'action.hover', 
                  borderRadius: 1 
                }}>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }}
                  >
                    {currentTask?.when_stop ? 
                      "Esta tarefa está fechada." : 
                      "Você não tem permissão para adicionar notas."}
                  </Typography>
                </Box>
              )}
              
              <Divider sx={{ 
                my: 2,
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : undefined 
              }} />
              
              {/* Histórico de Notas */}
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ color: isDarkMode ? 'white' : undefined }}
              >
                Histórico de Atualizações
              </Typography>
              
              {sortedHistory.length === 0 ? (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontStyle: "italic", 
                    textAlign: "center", 
                    py: 3,
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : undefined 
                  }}
                >
                  Sem histórico disponível.
                </Typography>
              ) : (
                <Timeline 
                  position="right" 
                  sx={{ 
                    p: 0, 
                    m: 0,
                    '& .MuiTimelineItem-root:before': {
                      flex: 0,
                      padding: 0
                    }
                  }}
                >
                  {sortedHistory.map((item, index) => (
                    <TimelineItem key={index}>
                      <TimelineOppositeContent sx={{ maxWidth: 120 }}>
                        <Typography 
                          variant="caption" 
                          sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'text.secondary' }}
                        >
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
                        {index < sortedHistory.length - 1 && (
                          <TimelineConnector sx={{ 
                            bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined
                          }} />
                        )}
                      </TimelineSeparator>
                      
                      <TimelineContent sx={{ py: '12px', px: 2 }}>
                        <Badge
                          color="error"
                          variant="dot"
                          invisible={item?.notification_owner !== 1}
                          sx={{ width: '100%' }}
                        >
                          <Paper 
                            elevation={1} 
                            sx={{ 
                              p: 2, 
                              bgcolor: item?.notification_owner === 0 
                                ? isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'action.hover'
                                : isDarkMode ? 'rgba(0, 0, 0, 0.2)' : 'background.paper',
                              borderLeft: '4px solid',
                              borderColor: item?.isadmin ? 'secondary.main' : 'primary.main',
                              boxShadow: isDarkMode ? '0 2px 4px rgba(0, 0, 0, 0.3)' : undefined
                            }}
                          >
                            <Typography 
                              variant="subtitle2"
                              sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                            >
                              {item?.isadmin === 0 ? currentTask?.ts_client_name || "Cliente" : currentTask?.owner_name || "Responsável"}
                            </Typography>
                            <Typography 
                              variant="body2"
                              sx={{ 
                                color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined,
                                whiteSpace: 'pre-wrap' // Preserva quebras de linha
                              }}
                            >
                              {item?.memo || ""}
                            </Typography>
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
      </DialogContent>
  </Dialog>
  );
};

export default TaskModal;