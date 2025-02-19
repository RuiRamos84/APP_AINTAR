import React, { useState, useEffect } from "react";
import { Box, Typography, IconButton, TextField, Button, Modal, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { getPriorityIcons } from "./utils";
import { addTaskNote, closeTask, getTaskHistory, updateTask, updateTaskNotification } from "../../services/TaskService";
import { notifySuccess, notifyError } from "../../components/common/Toaster/ThemedToaster";
import { useAuth } from "../../contexts/AuthContext";

const TaskModal = ({ task, onClose, onRefresh }) => {
  // Todos os hooks são chamados incondicionalmente
  const { user } = useAuth();
  const [newNote, setNewNote] = useState("");
  const [taskHistory, setTaskHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task ? { ...task } : {});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
      loadHistory();
      // Atualiza a notificação se estiver ativa (notification === 1)
      if (task.notification === 0) {
        updateTaskNotification(task.pk)
          .then(() => {
            onRefresh();
          })
          .catch((err) => {
            console.error("Erro ao atualizar notificação:", err);
            notifyError("Erro ao atualizar notificação");
          });
      }
    }
  }, [task]);

  const loadHistory = async () => {
    try {
      const history = await getTaskHistory(task.pk);
      setTaskHistory(history);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      notifyError("Erro ao carregar histórico da tarefa");
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsAddingNote(true);
    try {
      await addTaskNote(task.pk, newNote);
      await loadHistory();
      setNewNote("");
      notifySuccess("Nota adicionada com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar nota:", error);
      notifyError("Erro ao adicionar nota");
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleCloseTask = async () => {
    try {
      await closeTask(task.pk);
      notifySuccess("Tarefa encerrada com sucesso!");
      onClose();
      onRefresh();
    } catch (error) {
      console.error("Erro ao encerrar tarefa:", error);
      notifyError("Erro ao encerrar tarefa");
    }
  };

  const handleUpdateTask = async () => {
    setIsUpdating(true);
    try {
      await updateTask(task.pk, editedTask);
      notifySuccess("Tarefa atualizada com sucesso!");
      onRefresh();
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
    setEditedTask({ ...task });
  };

  if (!task) return null;

  return (
    <Modal open={Boolean(task)} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          color: "#000",
          p: 3,
          borderRadius: 2,
          boxShadow: 24,
          width: { xs: "90%", md: 600 },
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        {/* Cabeçalho */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Tooltip title="Data de Início">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CalendarMonthIcon fontSize="small" />
              <Typography variant="body2">
                {task.when_start ? new Date(task.when_start).toLocaleDateString() : "-"}
              </Typography>
            </Box>
          </Tooltip>
          <Typography variant="h6">
            <strong>Tarefa: </strong>{task.name}
          </Typography>
          <Box>{getPriorityIcons(task.ts_priority)}</Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Edição */}
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Nome"
            fullWidth
            value={editedTask.name || ""}
            onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
            disabled={!isEditing}
            sx={{ mb: 1 }}
          />
          <TextField
            label="Descrição"
            fullWidth
            multiline
            rows={3}
            value={editedTask.memo || ""}
            onChange={(e) => setEditedTask({ ...editedTask, memo: e.target.value })}
            disabled={!isEditing}
            sx={{ mb: 1 }}
          />
          {isEditing ? (
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button variant="contained" color="primary" onClick={handleUpdateTask} disabled={isUpdating}>
                {isUpdating ? "A guardar..." : "Guardar"}
              </Button>
              <Button variant="outlined" onClick={handleCancel} disabled={isUpdating}>
                Cancelar
              </Button>
            </Box>
          ) : (
            <Button variant="contained" onClick={() => setIsEditing(true)}>
              Editar
            </Button>
          )}
        </Box>

        {/* Histórico */}
        <Typography variant="h6">Histórico de Notas</Typography>
        {!taskHistory.length ? (
          <Typography sx={{ fontStyle: "italic" }}>Sem histórico...</Typography>
        ) : (
          taskHistory.map((h, i) => (
            <Box key={i} sx={{ background: "#f1f1f1", p: 1, borderRadius: 1, mb: 1 }}>
              <Typography variant="body2">
                <strong>Data:</strong> {new Date(h.when_submit).toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <strong>Autor:</strong> {h.isadmin ? "Admin" : "Utilizador"}
              </Typography>
              <Typography variant="body2">
                <strong>Nota:</strong> {h.memo}
              </Typography>
            </Box>
          ))
        )}

        <Box sx={{ mt: 2, mb: 2 }}>
          <TextField
            label="Nova Nota"
            fullWidth
            multiline
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <Button
            variant="contained"
            sx={{ mt: 1 }}
            onClick={handleAddNote}
            disabled={isAddingNote || !newNote.trim()}
          >
            {isAddingNote ? "A adicionar..." : "Adicionar Nota"}
          </Button>
        </Box>

        {user?.user_id === task.owner && (
          <Button variant="contained" color="error" onClick={handleCloseTask}>
            Encerrar Tarefa
          </Button>
        )}
      </Box>
    </Modal>
  );
};

export default TaskModal;
