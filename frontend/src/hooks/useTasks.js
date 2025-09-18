import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTasks,
    updateTaskStatus,
    closeTask
} from '../services/TaskService';
import { useAuth } from '../contexts/AuthContext';

export const useTasks = (initialFetchType = 'all') => {
    const [fetchType, setFetchType] = useState(initialFetchType);
    const [searchTerm, setSearchTerm] = useState("");

    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Mapeamento de IDs de status para nomes
    const STATUS_MAP = {
        1: "A Fazer",
        2: "Em Progresso",
        3: "Concluído"
    };

    // Status padrão para agrupar tarefas
    const DEFAULT_STATUSES = ["A Fazer", "Em Progresso", "Concluído"];

    const groupTasksByPerson = useCallback((tasks) => {
        const grouped = {};

        tasks.forEach((task) => {
            const clientName = task.ts_client_name || "Sem Cliente";

            let status;
            if (task.status) {
                status = task.status;
            } else if (task.ts_notestatus) {
                status = STATUS_MAP[task.ts_notestatus] || `Status ${task.ts_notestatus}`;
            } else {
                status = "A Fazer";
            }

            if (!grouped[clientName]) {
                grouped[clientName] = {
                    name: clientName,
                    tasks: {},
                    counts: {}
                };

                DEFAULT_STATUSES.forEach(statusName => {
                    grouped[clientName].tasks[statusName] = [];
                    grouped[clientName].counts[statusName] = 0;
                });
            }

            if (!grouped[clientName].tasks[status]) {
                grouped[clientName].tasks[status] = [];
                grouped[clientName].counts[status] = 0;
            }

            grouped[clientName].tasks[status].push(task);
            grouped[clientName].counts[status] += 1;
        });

        return grouped;
    }, []);

    // Query para buscar e filtrar tarefas
    const { data: tasks, isLoading: loading, error, refetch: fetchTasks } = useQuery({
        queryKey: ['tasks', fetchType, user?.user_id],
        queryFn: async () => {
            const allTasks = await getTasks();
            let filteredTasks;

            switch (fetchType) {
                case 'my':
                    filteredTasks = allTasks.filter(task => task.ts_client === user?.user_id && !task.when_stop);
                    break;
                case 'created':
                    filteredTasks = allTasks.filter(task => task.owner === user?.user_id && !task.when_stop);
                    break;
                case 'all':
                    filteredTasks = allTasks.filter(task => !task.when_stop);
                    break;
                case 'completed':
                    filteredTasks = allTasks.filter(task => task.when_stop);
                    break;
                default:
                    filteredTasks = allTasks;
            }
            return groupTasksByPerson(filteredTasks);
        },
        enabled: !!user, // A query só é executada se houver um utilizador
        staleTime: 5 * 60 * 1000, // Cache de 5 minutos
    });

    // Mutação para mover uma tarefa (com UI otimista)
    const { mutate: moveTask } = useMutation({
        mutationFn: ({ taskId, newStatusId }) => updateTaskStatus(taskId, newStatusId),
        onMutate: async ({ taskId, newStatusId, clientName }) => {
            // Cancelar queries pendentes para evitar conflitos
            await queryClient.cancelQueries({ queryKey: ['tasks', fetchType, user?.user_id] });

            // Snapshot do estado anterior
            const previousTasks = queryClient.getQueryData(['tasks', fetchType, user?.user_id]);

            // Atualização otimista da UI
            queryClient.setQueryData(['tasks', fetchType, user?.user_id], (oldData) => {
                if (!oldData) return oldData;

                const newTasks = JSON.parse(JSON.stringify(oldData));
                let movedTask = null;
                const statusName = STATUS_MAP[newStatusId] || `Status ${newStatusId}`;

                // Encontrar e remover a tarefa do status atual
                if (newTasks[clientName]) {
                    Object.keys(newTasks[clientName].tasks).forEach((status) => {
                        const taskIndex = newTasks[clientName].tasks[status].findIndex(task => task.pk === taskId);
                        if (taskIndex !== -1) {
                            movedTask = newTasks[clientName].tasks[status][taskIndex];
                            newTasks[clientName].tasks[status].splice(taskIndex, 1);
                            newTasks[clientName].counts[status] -= 1;
                        }
                    });
                }

                if (movedTask) {
                    movedTask.ts_notestatus = newStatusId;
                    movedTask.status = statusName;
                    if (!newTasks[clientName].tasks[statusName]) {
                        newTasks[clientName].tasks[statusName] = [];
                        newTasks[clientName].counts[statusName] = 0;
                    }
                    newTasks[clientName].tasks[statusName].push(movedTask);
                    newTasks[clientName].counts[statusName] += 1;
                }
                return newTasks;
            });

            // Retornar o snapshot para rollback em caso de erro
            return { previousTasks };
        },
        onError: (err, variables, context) => {
            // Reverter para o estado anterior em caso de erro
            if (context.previousTasks) {
                queryClient.setQueryData(['tasks', fetchType, user?.user_id], context.previousTasks);
            }
        },
        onSettled: () => {
            // Re-sincronizar com o servidor após a mutação (sucesso ou erro)
            queryClient.invalidateQueries({ queryKey: ['tasks', fetchType, user?.user_id] });
        },
    });

    // Mutação para fechar uma tarefa
    const { mutate: closeTaskAndRefresh } = useMutation({
        mutationFn: closeTask,
        onSuccess: () => {
            // Invalidar a query para forçar um refetch
            queryClient.invalidateQueries({ queryKey: ['tasks', fetchType, user?.user_id] });
        },
    });

    // Filtragem por termo de pesquisa (feita no cliente)
    const getFilteredTasks = useCallback(() => {
        if (!tasks || !searchTerm.trim()) return tasks;

        const lowercaseSearch = searchTerm.toLowerCase();
        const filtered = {};

        Object.keys(tasks).forEach(clientName => {
            const clientData = { ...tasks[clientName] };
            const filteredTasks = {};
            const filteredCounts = {};

            Object.keys(clientData.tasks).forEach(status => {
                const matchingTasks = clientData.tasks[status].filter(
                    task => task.name.toLowerCase().includes(lowercaseSearch) ||
                        (task.memo && task.memo.toLowerCase().includes(lowercaseSearch))
                );
                filteredTasks[status] = matchingTasks;
                filteredCounts[status] = matchingTasks.length;
            });

            if (Object.values(filteredCounts).some(count => count > 0)) {
                filtered[clientName] = { ...clientData, tasks: filteredTasks, counts: filteredCounts };
            }
        });

        return filtered;
    }, [tasks, searchTerm]);

    // Re-fetch quando o tipo de fetch muda
    useEffect(() => {
        fetchTasks();
    }, [fetchType]);

    // Listener para evento de atualização
    useEffect(() => {
        const handleRefresh = () => fetchTasks(false);
        window.addEventListener('task-refresh', handleRefresh);

        return () => {
            window.removeEventListener('task-refresh', handleRefresh);
        };
    }, []);

    return {
        tasks: searchTerm ? getFilteredTasks() : tasks,
        setSearchTerm,
        searchTerm,
        loading,
        error,
        fetchTasks,
        moveTask,
        closeTaskAndRefresh,
        setFetchType
    };
};