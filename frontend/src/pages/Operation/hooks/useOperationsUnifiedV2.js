import { useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import useOperationsStore from '../store/operationsStore';
import {
  useUserTasksSWR,
  useMetasSWR,
  useCacheInvalidation
} from '../services/cacheService';
import operationsApi from '../services/operationsApi';
import { notification } from '../../../components/common/Toaster/ThemedToaster';

/**
 * HOOK UNIFICADO V2 - CORRIGIDO
 *
 * MUDANÇAS IMPORTANTES:
 * - Usa getState() em vez de seletores reativos
 * - Evita loops infinitos do Zustand
 * - Mantém funcionalidade do SWR + Zustand
 */
export const useOperationsUnifiedV2 = (options = {}) => {
  const { user } = useAuth();
  const {
    autoLoad = true,
    includeMetas = false,
    includeUserTasks = false,
  } = options;

  const { invalidate } = useCacheInvalidation();

  // ============================================================
  // CARREGAR DADOS COM SWR
  // ============================================================

  const {
    tasks: userTasksData,
    error: userTasksError,
    isLoading: userTasksLoading,
    refresh: refreshUserTasks,
  } = useUserTasksSWR({
    isPaused: () => !autoLoad || !includeUserTasks,
  });

  const {
    metas: metasData,
    error: metasError,
    isLoading: metasLoading,
    refresh: refreshMetas,
  } = useMetasSWR({
    isPaused: () => !autoLoad || !includeMetas,
  });

  // ============================================================
  // SINCRONIZAÇÃO COM ZUSTAND REMOVIDA
  // ============================================================

  // NOTA: Removemos a sincronização automática com Zustand porque:
  // 1. Causava loops infinitos (setState → selector → re-render → setState)
  // 2. SWR já gerencia cache e revalidação eficientemente
  // 3. Dados são retornados diretamente do SWR (mais simples e reativo)
  //
  // Zustand agora é usado APENAS para:
  // - Actions (createMeta, updateMeta, etc.)
  // - UI state (drawer open/closed, selected items)
  // - Filtros locais

  // Se precisar sincronizar no futuro, usar com cuidado:
  // useEffect(() => {
  //   if (userTasksData && includeUserTasks) {
  //     const store = useOperationsStore.getState();
  //     store.setUserTasks(userTasksData);
  //   }
  // }, [userTasksData]); // APENAS userTasksData como dependência!

  // ============================================================
  // ACTIONS - METAS
  // ============================================================

  const createMeta = useCallback(async (metaData) => {
    const store = useOperationsStore.getState();
    try {
      store.setLoading('action', true);
      const response = await operationsApi.createOperacaoMeta(metaData);
      store.addMeta(response.data);
      invalidate('operation-metas');
      notification.success('Meta criada com sucesso!');
      return response.data;
    } catch (error) {
      notification.error('Erro ao criar meta: ' + error.message);
      throw error;
    } finally {
      store.setLoading('action', false);
    }
  }, [invalidate]);

  const updateMetaAction = useCallback(async (metaId, updates) => {
    const store = useOperationsStore.getState();
    try {
      store.setLoading('action', true);
      const previousMeta = store.metas.find(m => m.pk === metaId);
      store.updateMeta(metaId, updates);

      try {
        await operationsApi.updateOperacaoMeta(metaId, updates);
        invalidate('operation-metas');
        notification.success('Meta atualizada com sucesso!');
      } catch (error) {
        if (previousMeta) {
          store.updateMeta(metaId, previousMeta);
        }
        throw error;
      }
    } catch (error) {
      notification.error('Erro ao atualizar meta: ' + error.message);
      throw error;
    } finally {
      store.setLoading('action', false);
    }
  }, [invalidate]);

  const deleteMetaAction = useCallback(async (metaId) => {
    // OPERAÇÃO DESABILITADA POR SEGURANÇA
    notification.error('Para eliminar esta tarefa, contacte o administrador do sistema');
    throw new Error('Para eliminar esta tarefa, contacte o administrador do sistema');
  }, []);

  // ============================================================
  // ACTIONS - TAREFAS
  // ============================================================

  const completeTask = useCallback(async (taskId, completionData = {}) => {
    const store = useOperationsStore.getState();
    try {
      store.setLoading('action', true);

      // Chamar API para completar tarefa
      await operationsApi.completeTask(taskId, completionData);

      // Invalidar cache do SWR e forçar revalidação imediata
      await invalidate('user-tasks');

      // Forçar refresh dos dados
      if (refreshUserTasks) {
        await refreshUserTasks();
      }

      notification.success('Tarefa concluída com sucesso!');
    } catch (error) {
      notification.error('Erro ao concluir tarefa: ' + error.message);
      throw error;
    } finally {
      store.setLoading('action', false);
    }
  }, [invalidate, refreshUserTasks]);

  // ============================================================
  // REFRESH MANUAL
  // ============================================================

  const refresh = useCallback(async () => {
    const promises = [];
    if (includeUserTasks) promises.push(refreshUserTasks());
    if (includeMetas) promises.push(refreshMetas());
    await Promise.all(promises);
    notification.info('Dados atualizados!');
  }, [includeUserTasks, includeMetas, refreshUserTasks, refreshMetas]);

  // ============================================================
  // RETORNAR DADOS DIRETAMENTE DO SWR (EVITA LOOPS)
  // ============================================================

  // ESTRATÉGIA FINAL: Não usar Zustand store como fonte de dados
  // SWR já é reativo e gerencia cache/revalidação
  // Zustand apenas para actions e UI state

  return {
    // Dados DIRETOS do SWR (sempre atualizados!)
    userTasks: userTasksData || [],
    metas: metasData || [],
    todayTasks: userTasksData || [],

    // Computed (calcular localmente)
    stats: {
      total: (userTasksData || []).length,
      completed: (userTasksData || []).filter(t => t.completed).length,
      pending: (userTasksData || []).filter(t => !t.completed).length,
    },
    urgentTasks: (userTasksData || []).filter(t => t.isOverdue),
    pendingTasks: (userTasksData || []).filter(t => !t.completed),
    completedTasks: (userTasksData || []).filter(t => t.completed),

    // Estado
    isLoading: userTasksLoading || metasLoading,
    error: userTasksError || metasError,
    loading: {
      userTasks: userTasksLoading,
      metas: metasLoading,
      action: false, // Pode adicionar se necessário
    },
    errors: {
      userTasks: userTasksError?.message || null,
      metas: metasError?.message || null,
    },

    // Actions - Metas
    createMeta,
    updateMeta: updateMetaAction,
    deleteMeta: deleteMetaAction,

    // Actions - Tarefas
    completeTask,

    // Refresh
    refresh,
    refreshUserTasks,
    refreshMetas,

    // UI State (actions apenas, não estado reativo)
    setDrawerOpen: useOperationsStore.getState().setDrawerOpen,
    selectTask: useOperationsStore.getState().selectTask,
    selectMeta: useOperationsStore.getState().selectMeta,

    // Filtros (actions apenas)
    setFilter: useOperationsStore.getState().setFilter,
    clearFilters: useOperationsStore.getState().clearFilters,
  };
};

export default useOperationsUnifiedV2;
