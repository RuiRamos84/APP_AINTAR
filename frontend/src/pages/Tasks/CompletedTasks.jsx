import React from "react";
import {
  Box,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useAuth } from "../../contexts/AuthContext";
import { useOutletContext } from "react-router-dom";
import { useTasks } from "../../hooks/useTasks";
import TaskCard from "./TaskCard";

const CompletedTasks = () => {
  const { user } = useAuth();
  const isDarkMode = user?.dark_mode || false;
  const { onTaskClick, searchTerm } = useOutletContext();
  const [expandedClient, setExpandedClient] = React.useState(null);

  // Usar o hook useTasks com fetchType='completed'
  const { tasks, loading, error } = useTasks('completed');

  // Contar total de tarefas para o header - ANTES de qualquer return
  const totalTasks = React.useMemo(() => {
    if (!tasks || typeof tasks !== 'object') return 0;
    return Object.values(tasks).reduce((total, client) => {
      return total + Object.values(client.tasks || {}).flat().length;
    }, 0);
  }, [tasks]);

  // Error state - DEPOIS de todos os hooks
  if (error) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="error">
          Erro ao carregar tarefas concluídas
        </Typography>
        <Typography>{error.message}</Typography>
      </Box>
    );
  }

  // Função para filtrar tarefas por cliente
  const filterClientTasks = (clientTasks) => {
    if (!searchTerm || !searchTerm.trim()) return clientTasks;

    const lowercaseSearch = searchTerm.toLowerCase();
    return clientTasks.filter(task =>
      task.name.toLowerCase().includes(lowercaseSearch) ||
      (task.memo && task.memo.toLowerCase().includes(lowercaseSearch))
    );
  };

  const handleExpandClient = (clientName) => {
    setExpandedClient(expandedClient === clientName ? null : clientName);
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h4">Tarefas Concluídas</Typography>
        <Chip
          icon={<CheckCircleIcon />}
          label={`Total: ${totalTasks}`}
          color="success"
          variant="outlined"
        />
      </Box>

      {!tasks || Object.keys(tasks).length === 0 ? (
        <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
          Nenhuma tarefa concluída encontrada.
        </Typography>
      ) : (
        Object.keys(tasks).map((clientName) => {
          const clientTasks = Object.values(tasks[clientName].tasks || {}).flat();
          const filteredTasks = filterClientTasks(clientTasks);

          if (filteredTasks.length === 0) return null;

          return (
            <Accordion
              key={clientName}
              expanded={expandedClient === clientName}
              onChange={() => handleExpandClient(clientName)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  <strong>{clientName}</strong> ({filteredTasks.length} {filteredTasks.length === 1 ? 'tarefa' : 'tarefas'})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  {filteredTasks.map((task) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={task.pk}>
                      <TaskCard
                        task={task}
                        onTaskClick={() => onTaskClick(task)}
                        isDarkMode={isDarkMode}
                        columnId={3}
                      />
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })
      )}
    </Box>
  );
};

export default CompletedTasks;