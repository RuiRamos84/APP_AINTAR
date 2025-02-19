import { useState, useCallback, useEffect } from 'react';
import {
    getTasks,
    updateTaskStatus,
    closeTask
} from '../services/TaskService';

export const useTasks = (initialFetchType = 'all') => {
    const [tasks, setTasks] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fetchType, setFetchType] = useState(initialFetchType);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Currently only supports fetching all tasks
            const tasksData = await getTasks();
            const groupedTasks = groupTasksByPerson(tasksData);
            setTasks(groupedTasks);
        } catch (err) {
            setError(err);
            console.error(`Erro ao carregar tarefas:`, err);
        } finally {
            setLoading(false);
        }
    }, []);

    const moveTask = useCallback(async (taskId, newStatus, clientName) => {
        try {
            await updateTaskStatus(taskId, newStatus);

            setTasks(prevTasks => {
                const newTasks = { ...prevTasks };
                let movedTask = null;

                Object.keys(newTasks[clientName].tasks).forEach((status) => {
                    newTasks[clientName].tasks[status] = newTasks[clientName].tasks[status].filter(
                        (task) => {
                            if (task.pk === taskId) {
                                movedTask = { ...task, status: newStatus };
                                return false;
                            }
                            return true;
                        }
                    );
                });

                if (movedTask) {
                    newTasks[clientName].tasks[newStatus].push(movedTask);
                }

                return newTasks;
            });
        } catch (error) {
            console.error("Erro ao atualizar a tarefa:", error);
        }
    }, []);

    const closeTaskAndRefresh = useCallback(async (taskId) => {
        try {
            await closeTask(taskId);
            await fetchTasks();
        } catch (error) {
            console.error("Erro ao fechar tarefa:", error);
            setError(error);
        }
    }, [fetchTasks]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    return {
        tasks,
        loading,
        error,
        fetchTasks,
        moveTask,
        closeTaskAndRefresh,
        setFetchType
    };
};

// Função utilitária para agrupar tarefas
const groupTasksByPerson = (tasks) => {
    const grouped = {};

    tasks.forEach((task) => {
        const clientName = task.ts_client_name;
        const status = task.status || "A Fazer";

        if (!grouped[clientName]) {
            grouped[clientName] = {
                name: clientName,
                tasks: {
                    "A Fazer": [],
                    "Em Progresso": [],
                    "Concluído": [],
                },
                counts: {
                    "A Fazer": 0,
                    "Em Progresso": 0,
                    "Concluído": 0,
                },
            };
        }

        grouped[clientName].counts[status] += 1;
        grouped[clientName].tasks[status].push(task);
    });

    return grouped;
};