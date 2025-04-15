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
  useTheme, // Importe o useTheme
} from "@mui/material";
import { createTask } from "../../services/TaskService";
import { notifySuccess, notifyError } from "../../components/common/Toaster/ThemedToaster";

const CreateTaskModal = ({ isOpen, onClose, onRefresh, metaData }) => {
  const [newTask, setNewTask] = useState({
    name: "",
    ts_client: "",
    ts_priority: 1,
    memo: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme(); // Acesse o tema atual

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
      notifySuccess("Tarefa criada com sucesso!");
      onRefresh();
      onClose();
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      notifyError("Erro ao criar tarefa");
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
          bgcolor: theme.palette.background.paper, // Usa a cor de fundo do tema
          borderRadius: 2,
          color: theme.palette.text.primary, // Usa a cor do texto do tema
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
          InputLabelProps={{
            style: { color: theme.palette.text.secondary }, // Cor do label
          }}
          InputProps={{
            style: { color: theme.palette.text.primary }, // Cor do texto
          }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: theme.palette.text.secondary }}>Cliente</InputLabel>
          <Select
            value={newTask.ts_client}
            label="Cliente"
            onChange={(e) => handleChange("ts_client", e.target.value)}
            sx={{ color: theme.palette.text.primary }} // Cor do texto
          >
            {metaData.who?.map((client) => (
              <MenuItem key={client.pk} value={client.pk}>
                {client.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: theme.palette.text.secondary }}>Prioridade</InputLabel>
          <Select
            value={newTask.ts_priority}
            label="Prioridade"
            onChange={(e) => handleChange("ts_priority", e.target.value)}
            sx={{ color: theme.palette.text.primary }} // Cor do texto
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
          InputLabelProps={{
            style: { color: theme.palette.text.secondary }, // Cor do label
          }}
          InputProps={{
            style: { color: theme.palette.text.primary }, // Cor do texto
          }}
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