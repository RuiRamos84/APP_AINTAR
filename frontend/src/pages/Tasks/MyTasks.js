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

const MyTasks = () => {
    const { tasks, loading, error, setFetchType } = useTasks('my');

    // Atualizar o tipo de busca para minhas tarefas
    React.useEffect(() => {
        setFetchType('my');
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
                    Erro ao carregar minhas tarefas
                </Typography>
                <Typography>{error.message}</Typography>
            </Box>
        );
    }

    const allMyTasks = Object.values(tasks).flatMap(client =>
        Object.values(client.tasks).flat()
    );

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 2 }}>Minhas Tarefas</Typography>
            {allMyTasks.length > 0 ? (
                <List>
                    {allMyTasks.map((task) => (
                        <ListItem key={task.pk} divider>
                            <ListItemText
                                primary={task.name}
                                secondary={`Cliente: ${task.ts_client_name} - Início: ${task.startDate}`}
                            />
                        </ListItem>
                    ))}
                </List>
            ) : (
                <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
                    Você não tem tarefas atribuídas.
                </Typography>
            )}
        </Box>
    );
};

export default MyTasks;