import { useState, useCallback, useEffect, useRef } from 'react';
import {
    getTasks,
    updateTaskStatus,
    closeTask
} from '../services/TaskService';
import { useAuth } from '../contexts/AuthContext';
import { useMetaData } from '../contexts/MetaDataContext';

export const useTasks = (initialFetchType = 'all') => {
    const [tasks, setTasks] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fetchType, setFetchType] = useState(initialFetchType);

    // Controle de requisições
    const isFetchingRef = useRef(false);
    const pendingUpdatesRef = useRef({});

    const { user } = useAuth();
    const { metaData } = useMetaData();

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

    const fetchTasks = useCallback(async (silent = false) => {
        if (isFetchingRef.current) return;

        isFetchingRef.current = true;
        if (!silent) setLoading(true);
        setError(null);

        try {
            const allTasks = await getTasks();
            let filteredTasks;

            switch (fetchType) {
                case 'my':
                    filteredTasks = allTasks.filter(task => task.ts_client === user?.user_id);
                    break;
                case 'created':
                    filteredTasks = allTasks.filter(task => task.owner === user?.user_id);
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

            const groupedTasks = groupTasksByPerson(filteredTasks);
            setTasks(groupedTasks);
        } catch (err) {
            setError(err);
            console.error(`Erro ao carregar tarefas (${fetchType}):`, err);
        } finally {
            if (!silent) setLoading(false);
            isFetchingRef.current = false;
        }
    }, [fetchType, user, groupTasksByPerson]);

    const moveTask = useCallback(async (taskId, newStatusId, clientName) => {
        try {
            // Verificar se o usuário atual é o cliente da tarefa
            const flatTasks = Object.values(tasks)
                .flatMap(client => Object.values(client.tasks).flat());

            const currentTask = flatTasks.find(task => task.pk === taskId);

            if (!currentTask) {
                console.error("Tarefa não encontrada");
                return;
            }

            if (currentTask.ts_client !== user?.user_id) {
                console.error("Apenas o cliente pode atualizar o status da tarefa");
                return;
            }

            // Se o status já é o mesmo, não faz nada
            if (currentTask.ts_notestatus === newStatusId) {
                return;
            }

            // Criar um ID único para esta atualização
            const updateId = `${taskId}_${Date.now()}`;
            pendingUpdatesRef.current[updateId] = true;

            // Obter o nome do status
            const statusName = metaData?.task_status?.find(s => s.pk === newStatusId)?.value ||
                STATUS_MAP[newStatusId] ||
                `Status ${newStatusId}`;

            // Atualização local imediata
            setTasks(prevTasks => {
                const newTasks = JSON.parse(JSON.stringify(prevTasks));
                let movedTask = null;

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

                // Se encontrou a tarefa, adicionar ao novo status
                if (movedTask) {
                    movedTask = {
                        ...movedTask,
                        ts_notestatus: newStatusId,
                        status: statusName
                    };

                    if (!newTasks[clientName].tasks[statusName]) {
                        newTasks[clientName].tasks[statusName] = [];
                        newTasks[clientName].counts[statusName] = 0;
                    }

                    newTasks[clientName].tasks[statusName].push(movedTask);
                    newTasks[clientName].counts[statusName] += 1;
                }

                return newTasks;
            });

            // Chamar a API para persistir a mudança (em segundo plano)
            await updateTaskStatus(taskId, newStatusId);

            // Atualização silenciosa após 3 segundos para garantir sincronização sem flash visual
            setTimeout(() => {
                delete pendingUpdatesRef.current[updateId];

                // Só recarrega se não houver mais atualizações pendentes
                if (Object.keys(pendingUpdatesRef.current).length === 0) {
                    fetchTasks(true); // true = silencioso (não mostra loading)
                }
            }, 3000);

        } catch (error) {
            console.error("Erro ao atualizar a tarefa:", error);
        }
    }, [tasks, user, metaData, STATUS_MAP, fetchTasks]);

    const closeTaskAndRefresh = useCallback(async (taskId) => {
        try {
            await closeTask(taskId);
            fetchTasks(false); // Não silencioso porque é uma operação explícita
        } catch (error) {
            console.error("Erro ao fechar tarefa:", error);
            setError(error);
        }
    }, [fetchTasks]);

    // Buscar tarefas na montagem e quando fetchType mudar
    useEffect(() => {
        fetchTasks();
    }, [fetchType, fetchTasks]);

    // Listener para evento de atualização
    useEffect(() => {
        const handleRefresh = () => fetchTasks(false);
        window.addEventListener('task-refresh', handleRefresh);

        return () => {
            window.removeEventListener('task-refresh', handleRefresh);
        };
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