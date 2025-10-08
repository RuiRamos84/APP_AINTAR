import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import operationsApi from '../services/operationsApi';

/**
 * Hook unificado para todas as operações do sistema
 * Simplicidade + Robustez + Funcionalidade completa
 */
export const useOperationsUnified = (options = {}) => {
    const { user } = useAuth();
    const {
        autoLoad = true,
        includeMetas = false,
        includeAnalytics = false,
        includeUserTasks = false,
        refreshInterval = null
    } = options;

    // Estados principais
    const [state, setState] = useState({
        operations: [],
        metas: [],
        userTasks: [],
        analytics: null,
        loading: false,
        error: null,
        lastUpdate: null
    });

    // Cache simples + controlo de chamadas em curso
    const [cache, setCache] = useState({});
    const [ongoingRequests, setOngoingRequests] = useState({});

    // Helper para atualizar estado de forma segura
    const updateState = useCallback((updates) => {
        setState(prev => ({
            ...prev,
            ...updates,
            lastUpdate: new Date().toISOString()
        }));
    }, []);

    // Helper para gerenciar loading
    const withLoading = useCallback(async (asyncOperation, loadingKey = 'loading') => {
        updateState({ [loadingKey]: true, error: null });
        try {
            const result = await asyncOperation();
            return result;
        } catch (error) {
            console.error('Erro na operação:', error);
            updateState({ error: error.message || 'Erro inesperado' });
            throw error;
        } finally {
            updateState({ [loadingKey]: false });
        }
    }, [updateState]);

    // ===================================================================
    // OPERAÇÕES PRINCIPAIS
    // ===================================================================

    const loadOperations = useCallback(async (filters = null) => {
        return withLoading(async () => {
            const cacheKey = `operations_${JSON.stringify(filters || {})}`;

            // Verificar se já há uma chamada em curso
            if (ongoingRequests[cacheKey]) {
                console.log('⏳ Aguardando chamada em curso para operações');
                return ongoingRequests[cacheKey];
            }

            // Verificar cache (15 minutos - mais tempo)
            const cached = cache[cacheKey];
            if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
                console.log('🔄 Usando cache para operações');
                updateState({ operations: cached.data });
                return cached.data;
            }

            console.log('🌐 Fazendo nova chamada para operações');

            // Marcar chamada como em curso
            const apiCall = operationsApi.getOperacao().then(response => {
                const operations = response.data?.data || [];

                // Remover da lista de chamadas em curso
                setOngoingRequests(prev => {
                    const newState = { ...prev };
                    delete newState[cacheKey];
                    return newState;
                });

                return operations;
            });

            setOngoingRequests(prev => ({ ...prev, [cacheKey]: apiCall }));
            const operations = await apiCall;

            // Aplicar filtros se fornecidos
            let filteredOperations = operations;
            if (filters) {
                filteredOperations = operations.filter(op => {
                    return Object.entries(filters).every(([key, value]) => {
                        if (!value) return true;
                        return op[key] === value || op[key]?.toString().includes(value.toString());
                    });
                });
            }

            // Atualizar cache
            setCache(prev => ({
                ...prev,
                [cacheKey]: {
                    data: filteredOperations,
                    timestamp: Date.now()
                }
            }));

            updateState({ operations: filteredOperations });
            return filteredOperations;
        });
    }, [cache, withLoading, updateState]);

    const loadUserTasks = useCallback(async () => {
        if (!includeUserTasks) return [];

        return withLoading(async () => {
            const cacheKey = `userTasks_${user?.pk}`;

            // Verificar cache (10 minutos)
            const cached = cache[cacheKey];
            if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
                console.log('🔄 Usando cache para user tasks');
                updateState({ userTasks: cached.data });
                return cached.data;
            }

            console.log('🌐 Fazendo nova chamada para user tasks');
            const response = await operationsApi.getOperacaoSelf();
            const userTasks = response.data?.data || [];

            // Enriquecer tasks com informações úteis
            const enrichedTasks = userTasks.map(task => ({
                ...task,
                isOverdue: task.due_date && new Date(task.due_date) < new Date(),
                priority: task.priority || 'normal',
                estimatedDuration: task.estimated_duration || '30min'
            }));

            // Atualizar cache
            setCache(prev => ({
                ...prev,
                [cacheKey]: {
                    data: enrichedTasks,
                    timestamp: Date.now()
                }
            }));

            updateState({ userTasks: enrichedTasks });
            return enrichedTasks;
        });
    }, [includeUserTasks, user, cache, withLoading, updateState]);

    const loadMetas = useCallback(async () => {
        if (!includeMetas) return [];

        return withLoading(async () => {
            const cacheKey = 'metas';

            // Verificar cache (15 minutos para metas)
            const cached = cache[cacheKey];
            if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
                console.log('🔄 Usando cache para metas');
                updateState({ metas: cached.data });
                return cached.data;
            }

            console.log('🌐 Fazendo nova chamada para metas');
            const response = await operationsApi.getOperacaoMeta();
            const metas = response.data?.data || [];

            // Atualizar cache
            setCache(prev => ({
                ...prev,
                [cacheKey]: {
                    data: metas,
                    timestamp: Date.now()
                }
            }));

            updateState({ metas });
            return metas;
        });
    }, [includeMetas, cache, withLoading, updateState]);

    const loadAnalytics = useCallback(async () => {
        if (!includeAnalytics) return null;

        return withLoading(async () => {
            // Analytics são sempre recalculados em tempo real
            const [operationsRes, userTasksRes] = await Promise.all([
                operationsApi.getOperacao(),
                operationsApi.getOperacaoSelf()
            ]);

            const operations = operationsRes.data?.data || [];
            const userTasks = userTasksRes.data?.data || [];

            // Calcular analytics simples mas úteis
            const analytics = {
                overview: {
                    totalOperations: operations.length,
                    userTasks: userTasks.length,
                    completedUserTasks: userTasks.filter(t => t.completed).length,
                    pendingUserTasks: userTasks.filter(t => !t.completed).length,
                    completionRate: userTasks.length > 0
                        ? Math.round((userTasks.filter(t => t.completed).length / userTasks.length) * 100)
                        : 0
                },
                operators: {},
                trends: {
                    lastWeek: 0,
                    thisWeek: 0,
                    growth: 0
                }
            };

            // Estatísticas por operador
            operations.forEach(op => {
                const operatorId = op.ts_operador1;
                if (operatorId) {
                    if (!analytics.operators[operatorId]) {
                        analytics.operators[operatorId] = {
                            id: operatorId,
                            name: op.ts_operador1_name || `Operador ${operatorId}`,
                            totalTasks: 0,
                            completedTasks: 0,
                            efficiency: 0
                        };
                    }
                    analytics.operators[operatorId].totalTasks++;
                    if (op.completed) {
                        analytics.operators[operatorId].completedTasks++;
                    }
                }
            });

            // Calcular eficiência
            Object.values(analytics.operators).forEach(operator => {
                operator.efficiency = operator.totalTasks > 0
                    ? Math.round((operator.completedTasks / operator.totalTasks) * 100)
                    : 0;
            });

            updateState({ analytics });
            return analytics;
        });
    }, [includeAnalytics, withLoading, updateState]);

    // ===================================================================
    // OPERAÇÕES CRUD SIMPLIFICADAS
    // ===================================================================

    const createMeta = useCallback(async (metaData) => {
        return withLoading(async () => {
            const response = await operationsApi.createOperacaoMeta(metaData);

            // Recarregar metas após criação
            if (includeMetas) {
                await loadMetas();
            }

            return response.data;
        });
    }, [withLoading, includeMetas, loadMetas]);

    const updateMeta = useCallback(async (metaId, metaData) => {
        return withLoading(async () => {
            const response = await operationsApi.updateOperacaoMeta(metaId, metaData);

            // Recarregar metas após atualização
            if (includeMetas) {
                await loadMetas();
            }

            return response.data;
        });
    }, [withLoading, includeMetas, loadMetas]);

    const deleteMeta = useCallback(async (metaId) => {
        return withLoading(async () => {
            const response = await operationsApi.deleteOperacaoMeta(metaId);

            // Recarregar metas após eliminação
            if (includeMetas) {
                await loadMetas();
            }

            return response.data;
        });
    }, [withLoading, includeMetas, loadMetas]);

    const completeTask = useCallback(async (taskId, completionData = {}) => {
        return withLoading(async () => {
            // Atualização otimista
            updateState({
                userTasks: state.userTasks.map(task =>
                    task.pk === taskId
                        ? { ...task, completed: true, completedAt: new Date().toISOString(), ...completionData }
                        : task
                )
            });

            try {
                // Chamada real da API
                const response = await operationsApi.completeTask(taskId, completionData);

                // Recarregar tasks para garantir consistência
                await loadUserTasks();

                return {
                    success: true,
                    message: 'Tarefa concluída com sucesso',
                    data: response.data
                };
            } catch (error) {
                // Reverter atualização otimista em caso de erro
                await loadUserTasks();
                throw error;
            }
        });
    }, [withLoading, updateState, state.userTasks, loadUserTasks]);

    // ===================================================================
    // FUNCIONALIDADES DE CONTROLO
    // ===================================================================

    const refreshAll = useCallback(async () => {
        // Limpar cache
        setCache({});

        // Recarregar todos os dados
        const promises = [
            loadOperations(),
            includeUserTasks && loadUserTasks(),
            includeMetas && loadMetas(),
            includeAnalytics && loadAnalytics()
        ].filter(Boolean);

        await Promise.allSettled(promises);
    }, [loadOperations, loadUserTasks, loadMetas, loadAnalytics, includeUserTasks, includeMetas, includeAnalytics]);

    const clearError = useCallback(() => {
        updateState({ error: null });
    }, [updateState]);

    // ===================================================================
    // COMPUTED VALUES
    // ===================================================================

    const computed = useMemo(() => ({
        hasData: state.operations.length > 0 || state.userTasks.length > 0 || state.metas.length > 0,

        todayTasks: state.userTasks.filter(task => {
            const today = new Date().toDateString();
            const taskDate = task.created_at ? new Date(task.created_at).toDateString() : today;
            return taskDate === today;
        }),

        urgentTasks: state.userTasks.filter(task =>
            task.priority === 'high' || task.isOverdue
        ),

        operatorStats: state.analytics?.operators ?
            Object.values(state.analytics.operators).sort((a, b) => b.efficiency - a.efficiency) : [],

        recentActivity: state.operations
            .filter(op => op.updated_at || op.created_at)
            .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
            .slice(0, 10)
    }), [state]);

    // ===================================================================
    // EFEITOS
    // ===================================================================

    // Carregamento inicial - SIMPLIFIED DEPENDENCIES
    useEffect(() => {
        if (autoLoad && user) {
            const loadInitialData = async () => {
                console.log('🔄 Carregamento inicial das operações');
                try {
                    const promises = [];

                    // Sempre carregar operações base
                    promises.push(withLoading(async () => {
                        const response = await operationsApi.getOperacao();
                        const operations = response.data?.data || [];
                        updateState({ operations });
                        return operations;
                    }));

                    // Carregar outros dados baseado nas opções
                    if (includeUserTasks) {
                        promises.push(withLoading(async () => {
                            const response = await operationsApi.getOperacaoSelf();
                            const userTasks = response.data?.data || [];
                            updateState({ userTasks });
                            return userTasks;
                        }));
                    }

                    if (includeMetas) {
                        promises.push(withLoading(async () => {
                            const response = await operationsApi.getOperacaoMeta();
                            const metas = response.data?.data || [];
                            updateState({ metas });
                            return metas;
                        }));
                    }

                    await Promise.allSettled(promises);
                    console.log('✅ Carregamento inicial completo');
                } catch (error) {
                    console.error('❌ Erro no carregamento inicial:', error);
                }
            };

            loadInitialData();
        }
    }, [autoLoad, user?.id, includeUserTasks, includeMetas, includeAnalytics]); // Simplified dependencies

    // Refresh automático
    useEffect(() => {
        if (refreshInterval && refreshInterval > 0) {
            const interval = setInterval(refreshAll, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [refreshInterval, refreshAll]);

    // ===================================================================
    // RETORNO DO HOOK
    // ===================================================================

    return {
        // Estado
        ...state,

        // Computed values
        ...computed,

        // Ações
        loadOperations,
        loadUserTasks,
        loadMetas,
        loadAnalytics,
        createMeta,
        updateMeta,
        deleteMeta,
        completeTask,
        refreshAll,
        clearError,

        // Utilidades
        isLoading: state.loading,
        hasError: !!state.error,
        isEmpty: !computed.hasData
    };
};