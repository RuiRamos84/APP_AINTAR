import useSWR from 'swr';
import { useSWRConfig } from 'swr';
import operationsApi from './operationsApi';

/**
 * SISTEMA DE CACHE INTELIGENTE COM SWR
 *
 * Substitui:
 * - Cache manual no useOperationsUnified
 * - Controlo de chamadas em curso
 * - Gestão de timestamps
 *
 * Benefícios:
 * - Revalidação automática inteligente
 * - Dedupe de requests
 * - Focus revalidation
 * - Retry automático
 * - Mutation otimizada
 */

// ============================================================
// CONFIGURAÇÃO GLOBAL SWR
// ============================================================

export const swrConfig = {
  // Revalidar ao focar janela (útil para dados que mudam)
  revalidateOnFocus: true,

  // Revalidar ao reconnectar (útil para offline)
  revalidateOnReconnect: true,

  // Não revalidar automaticamente em intervalo
  // (apenas manual via mutate ou focus)
  refreshInterval: 0,

  // Dedupe requests num intervalo de 2s
  // (evita múltiplas chamadas idênticas)
  dedupingInterval: 2000,

  // Retry automático em caso de erro (3 tentativas)
  errorRetryCount: 3,
  errorRetryInterval: 5000, // 5s entre tentativas

  // Suspense mode (opcional, para Suspense boundaries)
  suspense: false,

  // Keep previous data while revalidating
  keepPreviousData: true,

  // Fetcher padrão (pode ser overridden)
  fetcher: (url) => fetch(url).then(res => res.json()),
};

// ============================================================
// KEYS PARA CACHE
// ============================================================

export const cacheKeys = {
  USER_TASKS: 'user-tasks',
  METAS: 'operation-metas',
  OPERATIONS: 'operations',
  ANALYTICS: 'operations-analytics',
  META_BY_ID: (id) => `operation-meta-${id}`,
};

// ============================================================
// HOOKS CUSTOMIZADOS SWR
// ============================================================

/**
 * Hook para carregar tarefas do utilizador
 *
 * Uso:
 * const { data, error, isLoading, mutate } = useUserTasks();
 *
 * Para revalidar manualmente: mutate()
 */
export const useUserTasksSWR = (options = {}) => {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR(
    cacheKeys.USER_TASKS,
    () => operationsApi.getOperacaoSelf().then(res => {
      const rawTasks = res.data?.data || [];

      // MAPEAMENTO CORRETO: View retorna nomes em tb_instalacao, tt_operacaoaccao, tt_operacaomodo
      // Criar aliases para compatibilidade com componentes
      const tasks = rawTasks.map(task => ({
        ...task,
        // Aliases baseados nos campos REAIS da view
        instalacao_nome: task.tb_instalacao,      // View retorna NOME aqui
        acao_operacao: task.tt_operacaoaccao,     // View retorna NOME aqui
        modo_operacao: task.tt_operacaomodo,      // View retorna NOME aqui
        dia_operacao: task.data,
        // Computed fields
        completed: !!(task.valuetext?.trim()) || task.valuenumb != null,
        description: `${task.tt_operacaoaccao || 'Operação'} - ${task.tb_instalacao || 'Instalação'}`
      }));

      if (tasks.length > 0) {
        console.log('🌐 Primeira tarefa MAPEADA:', tasks[0]);
        console.log('🌐 instalacao_nome:', tasks[0].instalacao_nome);
        console.log('🌐 acao_operacao:', tasks[0].acao_operacao);
      }

      return tasks;
    }),
    {
      ...swrConfig,
      // Não revalidar ao focar (tarefas mudam menos)
      revalidateOnFocus: false,
      // Revalidar ao reconnectar
      revalidateOnReconnect: true,
      ...options
    }
  );

  return {
    tasks: data || [],
    error,
    isLoading,
    isValidating,
    refresh: mutate,
  };
};

/**
 * Hook para carregar metas de operação
 */
export const useMetasSWR = (options = {}) => {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR(
    cacheKeys.METAS,
    () => operationsApi.getOperacaoMeta().then(res => {
      return res.data?.data || [];
    }),
    {
      ...swrConfig,
      revalidateOnFocus: false,
      ...options
    }
  );

  return {
    metas: data || [],
    error,
    isLoading,
    isValidating,
    refresh: mutate,
  };
};

/**
 * Hook para carregar todas as operações
 */
export const useOperationsSWR = (filters = null, options = {}) => {
  // Incluir filtros na key para cache separado
  const key = filters
    ? [cacheKeys.OPERATIONS, JSON.stringify(filters)]
    : cacheKeys.OPERATIONS;

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR(
    key,
    () => operationsApi.getOperacao().then(res => res.data?.data || []),
    {
      ...swrConfig,
      // Operações podem revalidar ao focar (mudanças frequentes)
      revalidateOnFocus: true,
      ...options
    }
  );

  return {
    operations: data || [],
    error,
    isLoading,
    isValidating,
    refresh: mutate,
  };
};

/**
 * Hook para carregar analytics
 * (menos frequente, cache mais agressivo)
 */
export const useAnalyticsSWR = (options = {}) => {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR(
    cacheKeys.ANALYTICS,
    () => operationsApi.getAnalytics().then(res => res.data),
    {
      ...swrConfig,
      // Analytics: cache por 5 minutos
      refreshInterval: 5 * 60 * 1000,
      // Não revalidar ao focar (dados pouco voláteis)
      revalidateOnFocus: false,
      ...options
    }
  );

  return {
    analytics: data,
    error,
    isLoading,
    isValidating,
    refresh: mutate,
  };
};

/**
 * Hook para carregar meta específica por ID
 */
export const useMetaByIdSWR = (metaId, options = {}) => {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR(
    metaId ? cacheKeys.META_BY_ID(metaId) : null,
    () => operationsApi.getOperacaoMetaById(metaId).then(res => res.data?.meta),
    {
      ...swrConfig,
      revalidateOnFocus: false,
      ...options
    }
  );

  return {
    meta: data,
    error,
    isLoading,
    isValidating,
    refresh: mutate,
  };
};

// ============================================================
// HOOK PARA MUTATIONS (Optimistic Updates)
// ============================================================

/**
 * Hook para invalidar cache
 *
 * Uso:
 * const { invalidate, invalidateAll } = useCacheInvalidation();
 * invalidate(cacheKeys.USER_TASKS);
 */
export const useCacheInvalidation = () => {
  const { mutate } = useSWRConfig();

  const invalidate = (key) => {
    mutate(key);
  };

  const invalidateAll = () => {
    mutate(() => true); // Invalida todos os caches
  };

  const invalidatePattern = (pattern) => {
    mutate((key) => typeof key === 'string' && key.includes(pattern));
  };

  return {
    invalidate,
    invalidateAll,
    invalidatePattern,
  };
};

/**
 * Hook para pré-carregamento (prefetch)
 *
 * Uso:
 * const { prefetchUserTasks } = usePrefetch();
 * onMouseEnter={() => prefetchUserTasks()}
 */
export const usePrefetch = () => {
  const { mutate } = useSWRConfig();

  const prefetchUserTasks = () => {
    mutate(
      cacheKeys.USER_TASKS,
      operationsApi.getOperacaoSelf().then(res => res.data?.data || []),
      false // Não revalidar imediatamente
    );
  };

  const prefetchMetas = () => {
    mutate(
      cacheKeys.METAS,
      operationsApi.getOperacaoMeta().then(res => res.data?.data || []),
      false
    );
  };

  return {
    prefetchUserTasks,
    prefetchMetas,
  };
};

export default {
  useUserTasksSWR,
  useMetasSWR,
  useOperationsSWR,
  useAnalyticsSWR,
  useMetaByIdSWR,
  useCacheInvalidation,
  usePrefetch,
  cacheKeys,
  swrConfig,
};
