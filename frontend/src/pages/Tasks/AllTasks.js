import React from 'react';
import { Box, TextField, InputAdornment, Typography, Grid } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import TaskColumn from './TaskColumn'; // Componente que renderiza uma coluna do Kanban

const AllTasks = ({
    tasks,
    moveTask,
    closeTaskAndRefresh,
    setSearchTerm,
    searchTerm,
    isLoading,
}) => {
    const statusColumns = ["A Fazer", "Em Progresso", "Concluído"];

    // Agrupa as tarefas por status para renderizar nas colunas
    const getTasksByStatus = (status) => {
        if (!tasks) return [];
        
        return Object.values(tasks).flatMap(clientData => 
            clientData.tasks[status] || []
        );
    };

    const getClientNameForTask = (taskId) => {
        if (!tasks) return null;
        for (const clientName in tasks) {
            for (const status in tasks[clientName].tasks) {
                if (tasks[clientName].tasks[status].some(task => task.pk === taskId)) {
                    return clientName;
                }
            }
        }
        return null;
    };

    const handleDrop = (item, newStatus) => {
        const newStatusId = Object.keys(STATUS_MAP).find(key => STATUS_MAP[key] === newStatus.columnName);
        if (item.status !== newStatus && newStatusId) {
            const clientName = getClientNameForTask(item.id);
            if (clientName) {
                moveTask({
                    taskId: item.id,
                    newStatusId: parseInt(newStatusId, 10),
                    clientName: clientName,
                });
            }
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <TextField
                fullWidth
                variant="outlined"
                placeholder="Pesquisar tarefas por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
                sx={{ mb: 3 }}
            />

            {isLoading && (!tasks || Object.keys(tasks).length === 0) ? (
                <Typography>A carregar...</Typography>
            ) : Object.keys(tasks || {}).length === 0 ? (
                <Typography>Nenhuma tarefa encontrada.</Typography>
            ) : (
                <Grid container spacing={2}>
                    {statusColumns.map(status => (
                        <Grid item xs={12} md={4} key={status}>
                            <TaskColumn
                                title={status}
                                tasks={getTasksByStatus(status)}
                                onDrop={handleDrop}
                                onTaskClose={closeTaskAndRefresh}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};

// Mapeamento de status para ID, necessário para a função de drop
const STATUS_MAP = {
    1: "A Fazer",
    2: "Em Progresso",
    3: "Concluído"
};

export default AllTasks;