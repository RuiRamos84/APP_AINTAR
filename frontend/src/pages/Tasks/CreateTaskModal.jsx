import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { createTask } from "../../services/TaskService";
import { notifySuccess, notifyError } from "../../components/common/Toaster/ThemedToaster"; // Ajusta o path conforme necessário

const CreateTaskModal = ({ isOpen, onClose, onRefresh, metaData }) => {
  const [newTask, setNewTask] = useState({
    name: "",
    ts_client: "",
    ts_priority: 1,
    memo: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Reinicia o estado quando o modal for fechado ou aberto
  useEffect(() => {
    if (!isOpen) {
      setNewTask({
        name: "",
        ts_client: "",
        ts_priority: 1,
        memo: "",
      });
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleChange = (field, value) => {
    setNewTask((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      await createTask(newTask);
      notifySuccess("Tarefa criada com sucesso!"); // Notificação de sucesso
      onRefresh(); // Atualiza a listagem
      onClose();   // Fecha o modal
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      notifyError("Erro ao criar tarefa"); // Notificação de erro
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", sm: 400 },
          p: 3,
          boxShadow: 24,
          bgcolor: "#fff",
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Criar Nova Tarefa
        </Typography>

        <TextField
          label="Nome"
          fullWidth
          sx={{ mb: 2 }}
          value={newTask.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Cliente</InputLabel>
          <Select
            value={newTask.ts_client}
            label="Cliente"
            onChange={(e) => handleChange("ts_client", e.target.value)}
          >
            {metaData.who?.map((client) => (
              <MenuItem key={client.pk} value={client.pk}>
                {client.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Prioridade</InputLabel>
          <Select
            value={newTask.ts_priority}
            label="Prioridade"
            onChange={(e) => handleChange("ts_priority", e.target.value)}
          >
            {metaData.task_priority?.map((p) => (
              <MenuItem key={p.pk} value={p.pk}>
                {p.value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Descrição"
          fullWidth
          multiline
          rows={3}
          sx={{ mb: 2 }}
          value={newTask.memo}
          onChange={(e) => handleChange("memo", e.target.value)}
        />

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <Button variant="outlined" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newTask.name || !newTask.ts_client || isLoading}
          >
            {isLoading ? "A criar..." : "Criar"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default CreateTaskModal;
