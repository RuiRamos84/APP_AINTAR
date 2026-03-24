/**
 * useMetaData Hook
 * Hook para buscar e gerenciar metadados da aplicação usando React Query
 *
 * Metadados incluem:
 * - ident_types: Tipos de identificação (NIF, NIPC, etc.)
 * - associates: Lista de associados/entidades
 * - who: Lista de utilizadores
 * - what: Estados/passos de documentos
 * - columns: Definição de colunas para tabelas
 */

import { useQuery } from '@tanstack/react-query';
import { fetchMetaData } from '@/services/metadataService';
import { useAuth } from '@/core/contexts/AuthContext';

/**
 * Hook para buscar metadados
 * @returns {Object} { data: metaData, isLoading, error, refetch }
 */
export const useMetaData = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['metadata'],
    queryFn: fetchMetaData,
    enabled: !!user, // Só busca se houver utilizador autenticado
    staleTime: 1000 * 60 * 60, // Dados frescos por 1 hora
    cacheTime: 1000 * 60 * 60 * 24, // Cache por 24 horas
    refetchOnWindowFocus: false, // Não refetch ao focar janela
    retry: 2, // Tentar 2 vezes em caso de erro
  });
};

/**
 * Hook para buscar apenas tipos de identificação
 * @returns {Object} { data: identTypes, isLoading, error }
 */
export const useIdentTypes = () => {
  const { data: metaData, isLoading, error } = useMetaData();

  return {
    data: metaData?.ident_types || [],
    isLoading,
    error,
  };
};

/**
 * Hook para buscar apenas associados
 * @returns {Object} { data: associates, isLoading, error }
 */
export const useAssociates = () => {
  const { data: metaData, isLoading, error } = useMetaData();

  return {
    data: metaData?.associates || [],
    isLoading,
    error,
  };
};

/**
 * Hook para buscar apenas lista de utilizadores
 * @returns {Object} { data: users, isLoading, error }
 */
export const useWhoList = () => {
  const { data: metaData, isLoading, error } = useMetaData();

  return {
    data: metaData?.who || [],
    isLoading,
    error,
  };
};

/**
 * Hook para buscar apenas estados/passos
 * @returns {Object} { data: states, isLoading, error }
 */
export const useWhatList = () => {
  const { data: metaData, isLoading, error } = useMetaData();

  return {
    data: metaData?.what || [],
    isLoading,
    error,
  };
};

/**
 * Hook para buscar tipos/destinos de despesas
 * @returns {Object} { data: expenseTypes, isLoading, error }
 */
export const useExpenseTypes = () => {
  const { data: metaData, isLoading, error } = useMetaData();

  return {
    data: metaData?.expense || [],
    isLoading,
    error,
  };
};

/**
 * Hook para buscar lista de ETARs
 */
export const useETARList = () => {
  const { data: metaData, isLoading, error } = useMetaData();
  return { data: metaData?.etar || [], isLoading, error };
};

/**
 * Hook para buscar lista de Estações Elevatórias
 */
export const useEEList = () => {
  const { data: metaData, isLoading, error } = useMetaData();
  return { data: metaData?.ee || [], isLoading, error };
};

/**
 * Hook para buscar tipos de ponto de leitura (volume spots)
 */
export const useSpotList = () => {
  const { data: metaData, isLoading, error } = useMetaData();
  return { data: metaData?.spot || [], isLoading, error };
};

/**
 * Hook para buscar parâmetros de análise (incumprimentos)
 */
export const useAnaliseParams = () => {
  const { data: metaData, isLoading, error } = useMetaData();
  return { data: metaData?.analiseParams || [], isLoading, error };
};

/**
 * Hook para tipos de equipamento
 */
export const useEquipTipos = () => {
  const { data: metaData, isLoading, error } = useMetaData();
  return { data: metaData?.equiptipo || [], isLoading, error };
};

/**
 * Hook para localizações de equipamento
 */
export const useEquipLocalizacoes = () => {
  const { data: metaData, isLoading, error } = useMetaData();
  return { data: metaData?.equiplocalizacao || [], isLoading, error };
};

/**
 * Hook para lista de instalações (ETAR + EE)
 */
export const useInstalacaoList = () => {
  const { data: metaData, isLoading, error } = useMetaData();
  return { data: metaData?.instalacao || [], isLoading, error };
};

export default useMetaData;
