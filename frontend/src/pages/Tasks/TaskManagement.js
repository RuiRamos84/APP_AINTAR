import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper, CircularProgress, Alert } from '@mui/material';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { HTML5Backend } from 'react-dnd-html5-backend'; // Manter para fallback
import { useTasks } from '../../hooks/useTasks';
import AllTasks from './AllTasks';
import MyTasks from './MyTasks';
import CreatedTasks from './CreatedTasks';
import CompletedTasks from './CompletedTasks';
const TaskManagement = () => {
    const [currentTab, setCurrentTab] = useState('all');
    
    // O hook useTasks agora gere o tipo de fetch internamente
    const {
        tasks,
        setSearchTerm,
        searchTerm,
        loading,
        error,
        moveTask,
        closeTaskAndRefresh,
        setFetchType
    } = useTasks(currentTab);

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
        setFetchType(newValue); // Atualiza o tipo de fetch no hook
    };

    // Escolhe o backend com base no tipo de dispositivo
    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const backend = isTouchDevice() ? TouchBackend : HTML5Backend;

    const renderTabContent = () => {
        if (loading && Object.keys(tasks || {}).length === 0) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            );
        }

        if (error) {
            return (
                <Alert severity="error" sx={{ m: 2 }}>
                    Erro ao carregar tarefas: {error.message}
                </Alert>
            );
        }

        const commonProps = {
            tasks,
            moveTask,
            closeTaskAndRefresh,
            setSearchTerm,
            searchTerm,
            isLoading: loading, // Passa o estado de loading para os filhos
        };

        switch (currentTab) {
            case 'my':
                return <MyTasks {...commonProps} />;
            case 'created':
                return <CreatedTasks {...commonProps} />;
            case 'completed':
                return <CompletedTasks {...commonProps} />;
            case 'all':
            default:
                return <AllTasks {...commonProps} />;
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Gestão de Tarefas
            </Typography>

            <DndProvider backend={backend} options={{ enableMouseEvents: true }}>
                <Paper>
                    <Tabs value={currentTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tab label="Todas as Tarefas" value="all" />
                        <Tab label="Minhas Tarefas" value="my" />
                        <Tab label="Criadas por Mim" value="created" />
                        <Tab label="Concluídas" value="completed" />
                    </Tabs>

                    {renderTabContent()}
                </Paper>
            </DndProvider>
        </Box>
    );
};

export default TaskManagement;