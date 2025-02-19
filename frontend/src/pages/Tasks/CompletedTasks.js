import React from "react";
import {
    Box,
    Typography,
    CircularProgress,
    List,
    ListItem,
    ListItemText
} from "@mui/material";
import { useTasks } from "../../hooks/useTasks";

const CompletedTasks = () => {
    const { tasks, loading, error, setFetchType } = useTasks('completed');

    // Atualizar o tipo de busca para tarefas concluídas
    React.useEffect(() => {
        setFetchType('completed');
    }, [setFetchType]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

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

    const allCompletedTasks = Object.values(tasks).flatMap(client =>
        Object.values(client.tasks).flat()
    );

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 2 }}>Tarefas Concluídas</Typography>
            {allCompletedTasks.length > 0 ? (
                <List>
                    {allCompletedTasks.map((task) => (
                        <ListItem key={task.pk} divider>
                            <ListItemText
                                primary={task.name}
                                secondary={`Cliente: ${task.ts_client_name} - Conclusão: ${task.endDate}`}
                            />
                        </ListItem>
                    ))}
                </List>
            ) : (
                <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
                    Nenhuma tarefa concluída encontrada.
                </Typography>
            )}
        </Box>
    );
};

export default CompletedTasks;