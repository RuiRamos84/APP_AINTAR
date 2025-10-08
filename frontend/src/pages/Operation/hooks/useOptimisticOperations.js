import { useCallback } from 'react';
import useOperationsStore from '../store/operationsStore';
import { useCacheInvalidation } from '../services/cacheService';
import operationsApi from '../services/operationsApi';
import { notification } from '../../../components/common/Toaster/ThemedToaster';

/**
 * HOOK PARA OPTIMISTIC UPDATES
 *
 * Pattern: Update UI imediatamente, reverter se API falhar
 *
 * Benefícios:
 * - Interface parece instantânea
 * - UX 10x melhor (sem espera)
 * - Feedback visual imediato
 *
 * Uso:
 * const { completeTaskOptimistic, deleteMetaOptimistic } = useOptimisticOperations();
 * await completeTaskOptimistic(taskId);
 */

export const useOptimisticOperations = () => {
  const store = useOperationsStore();
  const { invalidate } = useCacheInvalidation();

  // ============================================================
  // COMPLETAR TAREFA (OPTIMISTIC)
  // ============================================================

  const completeTaskOptimistic = useCallback(async (taskId, completionData = {}) => {
    // 1. Guardar estado anterior (para rollback)
    const previousTask = store.userTasks.find(t =>
      t.pk === taskId || t.id === taskId
    );

    if (!previousTask) {
      notification.error('Tarefa não encontrada');
      return { success: false };
    }

    // 2. Atualizar UI imediatamente (OPTIMISTIC)
    store.completeTask(taskId);

    // 3. Mostrar feedback visual instantâneo
    notification.success('✓ Tarefa concluída!', {
      duration: 2000,
    });

    // 4. Tentar atualizar no servidor (background)
    try {
      await operationsApi.completeTask(taskId, completionData);

      // 5. Invalidar cache para próxima vez buscar dados frescos
      invalidate('user-tasks');

      return { success: true };
    } catch (error) {
      // 6. ROLLBACK se falhar
      store.uncompleteTask(taskId);

      notification.error('Erro ao concluir tarefa. A reverter...', {
        description: error.message,
      });

      return { success: false, error };
    }
  }, [store, invalidate]);

  // ============================================================
  // CRIAR META (OPTIMISTIC)
  // ============================================================

  const createMetaOptimistic = useCallback(async (metaData) => {
    // 1. Criar ID temporário para UI
    const tempId = `temp-${Date.now()}`;
    const optimisticMeta = {
      ...metaData,
      pk: tempId,
      _isOptimistic: true,
    };

    // 2. Adicionar à UI imediatamente
    store.addMeta(optimisticMeta);

    // 3. Feedback visual
    notification.success('Meta a ser criada...');

    try {
      // 4. Criar no servidor
      const response = await operationsApi.createOperacaoMeta(metaData);
      const realMeta = response.data;

      // 5. Substituir meta temporária pela real
      store.deleteMeta(tempId);
      store.addMeta(realMeta);

      // 6. Invalidar cache
      invalidate('operation-metas');

      notification.success('Meta criada com sucesso!');

      return { success: true, data: realMeta };
    } catch (error) {
      // 7. ROLLBACK - Remover meta temporária
      store.deleteMeta(tempId);

      notification.error('Erro ao criar meta', {
        description: error.message,
      });

      return { success: false, error };
    }
  }, [store, invalidate]);

  // ============================================================
  // ATUALIZAR META (OPTIMISTIC)
  // ============================================================

  const updateMetaOptimistic = useCallback(async (metaId, updates) => {
    // 1. Guardar estado anterior
    const previousMeta = store.metas.find(m => m.pk === metaId);

    if (!previousMeta) {
      notification.error('Meta não encontrada');
      return { success: false };
    }

    // 2. Atualizar UI imediatamente
    store.updateMeta(metaId, updates);

    // 3. Feedback visual
    notification.info('A atualizar meta...');

    try {
      // 4. Atualizar no servidor
      await operationsApi.updateOperacaoMeta(metaId, updates);

      // 5. Invalidar cache
      invalidate('operation-metas');

      notification.success('Meta atualizada!');

      return { success: true };
    } catch (error) {
      // 6. ROLLBACK
      store.updateMeta(metaId, previousMeta);

      notification.error('Erro ao atualizar meta', {
        description: error.message,
      });

      return { success: false, error };
    }
  }, [store, invalidate]);

  // ============================================================
  // ELIMINAR META (OPTIMISTIC)
  // ============================================================

  const deleteMetaOptimistic = useCallback(async (metaId) => {
    // 1. Guardar para possível restauro
    const previousMeta = store.metas.find(m => m.pk === metaId);

    if (!previousMeta) {
      notification.error('Meta não encontrada');
      return { success: false };
    }

    // 2. Remover da UI imediatamente
    store.deleteMeta(metaId);

    // 3. Feedback visual
    notification.info('Meta eliminada', {
      action: {
        label: 'Desfazer',
        onClick: () => {
          // Restaurar se utilizador clicar em "Desfazer"
          store.addMeta(previousMeta);
        },
      },
      duration: 5000, // 5s para desfazer
    });

    try {
      // 4. Eliminar no servidor
      await operationsApi.deleteOperacaoMeta(metaId);

      // 5. Invalidar cache
      invalidate('operation-metas');

      return { success: true };
    } catch (error) {
      // 6. ROLLBACK - Restaurar meta
      store.addMeta(previousMeta);

      notification.error('Erro ao eliminar meta', {
        description: error.message,
      });

      return { success: false, error };
    }
  }, [store, invalidate]);

  // ============================================================
  // BATCH OPERATIONS (múltiplas ações de uma vez)
  // ============================================================

  const completeMultipleTasksOptimistic = useCallback(async (taskIds) => {
    // Guardar estados anteriores
    const previousTasks = taskIds.map(id =>
      store.userTasks.find(t => t.pk === id || t.id === id)
    );

    // Completar todas imediatamente
    taskIds.forEach(id => store.completeTask(id));

    notification.success(`${taskIds.length} tarefas concluídas!`);

    try {
      // Completar todas no servidor em paralelo
      await Promise.all(
        taskIds.map(id => operationsApi.completeTask(id))
      );

      invalidate('user-tasks');

      return { success: true };
    } catch (error) {
      // Reverter todas
      previousTasks.forEach((task, index) => {
        if (task) {
          store.uncompleteTask(taskIds[index]);
        }
      });

      notification.error('Erro ao concluir tarefas em lote');

      return { success: false, error };
    }
  }, [store, invalidate]);

  // ============================================================
  // RETORNO
  // ============================================================

  return {
    completeTaskOptimistic,
    createMetaOptimistic,
    updateMetaOptimistic,
    deleteMetaOptimistic,
    completeMultipleTasksOptimistic,
  };
};

export default useOptimisticOperations;
