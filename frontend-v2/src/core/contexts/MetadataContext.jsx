/**
 * Metadata Context
 * Contexto global para metadados estáticos da aplicação
 * Carrega dados de referência (profiles, interfaces, etc.) uma única vez
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchMetaData } from '@/services/metadataService';
import { useAuth } from './AuthContext';

/**
 * Contexto de Metadados
 */
const MetadataContext = createContext(undefined);

/**
 * Provider de Metadados
 * Carrega e mantém em cache todos os metadados da aplicação
 */
const EMPTY_METADATA = {
  profiles: [],
  interfaces: [],
  identTypes: [],
  associates: [],
  taskPriority: [],
  taskStatus: [],
  paymentMethod: [],
};

export function MetadataProvider({ children }) {
  const { user, isLoading: authLoading } = useAuth();

  // Guarda o user_id para o qual os metadados foram carregados
  // Evita re-fetch quando o token é renovado (novo objecto user, mesmo user_id)
  const loadedForUserRef = useRef(null);

  const [metadata, setMetadata] = useState(EMPTY_METADATA);

  // isLoading: true apenas no carregamento INICIAL (bloqueia render da página)
  // isRefreshing: true em refreshes em background (a página continua visível)
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  /**
   * Carrega todos os metadados do backend.
   * @param {boolean} background - se true, usa isRefreshing em vez de isLoading
   *   (evita desmontar componentes que já estão visíveis)
   */
  const loadMetadata = useCallback(async (background = false) => {
    try {
      if (background) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const data = await fetchMetaData();

      setMetadata({
        // User profiles (ts_profile)
        profiles: data.profiles || [],

        // User permissions/interfaces (ts_interface)
        interfaces: data.interfaces || [],

        // Identification types
        identTypes: data.ident_types || [],

        // Associates
        associates: data.associates || [],

        // Task management
        taskPriority: data.task_priority || [],
        taskStatus: data.task_status || [],

        // Payment
        paymentMethod: data.payment_method || [],

        // EPI (Equipment)
        epiShoeTypes: data.epi_shoe_types || [],
        epiWhatTypes: data.epi_what_types || [],
        epiList: data.epi_list || [],

        // Operations
        etar: data.etar || [],
        ee: data.ee || [],
        param: data.param || [],

        // Analysis
        analiseParams: data.analiseParams || [],
        analiseForma: data.analise_forma || [],
        analisePonto: data.analise_ponto || [],

        // Keep raw data for custom access
        _raw: data,
      });

      setLastFetch(new Date());

    } catch (err) {
      console.error('[MetadataContext] Error loading metadata:', err);
      setError(err.message || 'Erro ao carregar metadados');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Força re-fetch dos metadados em background (ex: após admin alterar permissões).
   * Usa isRefreshing em vez de isLoading — a página NÃO desmonta durante o fetch.
   */
  const refreshMetadata = useCallback(() => {
    loadedForUserRef.current = null;
    return loadMetadata(true); // background = true
  }, [loadMetadata]);

  /**
   * Carrega metadados quando user está autenticado.
   * Depende apenas de user_id (não do objecto user completo) para evitar
   * re-fetch quando o token JWT é renovado silenciosamente em background.
   * loadedForUserRef garante carga única por sessão — não recarrega enquanto
   * o mesmo utilizador estiver activo.
   */
  const userId = user?.user_id ?? null;

  useEffect(() => {
    if (authLoading) return;

    if (userId) {
      // Já carregámos para este utilizador — não repetir
      if (loadedForUserRef.current === userId) return;
      loadedForUserRef.current = userId;
      loadMetadata();
    } else {
      // Logout — limpar estado e permitir nova carga no próximo login
      loadedForUserRef.current = null;
      setIsLoading(false);
      setMetadata(EMPTY_METADATA);
    }
  }, [userId, authLoading, loadMetadata]);

  /**
   * Helper: Encontrar profile por ID
   */
  const getProfileById = useCallback(
    (profileId) => {
      return metadata.profiles.find((p) => p.pk === profileId);
    },
    [metadata.profiles]
  );

  /**
   * Helper: Encontrar profile por nome/label
   */
  const getProfileByName = useCallback(
    (name) => {
      return metadata.profiles.find((p) => p.name === name);
    },
    [metadata.profiles]
  );

  /**
   * Helper: Obter nome do profile
   */
  const getProfileName = useCallback(
    (profileId) => {
      const profile = getProfileById(profileId);
      return profile?.name || 'Desconhecido';
    },
    [getProfileById]
  );

  /**
   * Helper: Encontrar interface/permission por ID
   */
  const getInterfaceById = useCallback(
    (interfaceId) => {
      return metadata.interfaces.find((i) => i.pk === interfaceId);
    },
    [metadata.interfaces]
  );

  /**
   * Helper: Encontrar interface/permission por value (nome)
   */
  const getInterfaceByValue = useCallback(
    (value) => {
      return metadata.interfaces.find((i) => i.value === value);
    },
    [metadata.interfaces]
  );

  /**
   * Helper: Obter interfaces por categoria
   */
  const getInterfacesByCategory = useCallback(
    (category) => {
      return metadata.interfaces.filter((i) => i.category === category);
    },
    [metadata.interfaces]
  );

  /**
   * Helper: Obter label da interface
   */
  const getInterfaceLabel = useCallback(
    (interfaceId) => {
      const iface = getInterfaceById(interfaceId);
      return iface?.label || 'Desconhecido';
    },
    [getInterfaceById]
  );

  /**
   * Helper: Verificar se interface é crítica
   */
  const isInterfaceCritical = useCallback(
    (interfaceId) => {
      const iface = getInterfaceById(interfaceId);
      return iface?.is_critical === true || iface?.is_critical === 1;
    },
    [getInterfaceById]
  );

  /**
   * Helper: Verificar se interface é sensível
   */
  const isInterfaceSensitive = useCallback(
    (interfaceId) => {
      const iface = getInterfaceById(interfaceId);
      return iface?.is_sensitive === true || iface?.is_sensitive === 1;
    },
    [getInterfaceById]
  );

  /**
   * Helper: Obter dependências de uma interface
   */
  const getInterfaceRequires = useCallback(
    (interfaceId) => {
      const iface = getInterfaceById(interfaceId);
      return iface?.requires || [];
    },
    [getInterfaceById]
  );

  /**
   * Helper: Mapear lista de IDs para objetos completos
   */
  const mapIdsToObjects = useCallback(
    (ids, collection) => {
      if (!Array.isArray(ids)) return [];
      return ids
        .map((id) => collection.find((item) => item.pk === id))
        .filter(Boolean);
    },
    []
  );

  const value = {
    // Estado
    metadata,
    isLoading,
    isRefreshing,
    error,
    lastFetch,

    // Ações
    refreshMetadata,

    // Helpers - Profiles
    getProfileById,
    getProfileByName,
    getProfileName,

    // Helpers - Interfaces
    getInterfaceById,
    getInterfaceByValue,
    getInterfacesByCategory,
    getInterfaceLabel,
    isInterfaceCritical,
    isInterfaceSensitive,
    getInterfaceRequires,

    // Helpers - Geral
    mapIdsToObjects,
  };

  return (
    <MetadataContext.Provider value={value}>
      {children}
    </MetadataContext.Provider>
  );
}

/**
 * Hook para usar o contexto de metadados
 * @returns {Object} Contexto de metadados
 * @throws {Error} Se usado fora do MetadataProvider
 */
export function useMetadata() {
  const context = useContext(MetadataContext);

  if (context === undefined) {
    throw new Error('useMetadata must be used within a MetadataProvider');
  }

  return context;
}

/**
 * Hook para profiles
 * Fornece acesso rápido aos profiles
 */
export function useProfiles() {
  const { metadata, getProfileById, getProfileName } = useMetadata();

  return {
    profiles: metadata.profiles,
    getProfileById,
    getProfileName,
  };
}

/**
 * Hook para interfaces/permissions
 * Fornece acesso rápido às interfaces
 */
export function useInterfaces() {
  const {
    metadata,
    isLoading,
    isRefreshing,
    refreshMetadata,
    getInterfaceById,
    getInterfaceByValue,
    getInterfacesByCategory,
    getInterfaceLabel,
    isInterfaceCritical,
    isInterfaceSensitive,
    getInterfaceRequires,
  } = useMetadata();

  return {
    interfaces: metadata.interfaces,
    isLoading,
    isRefreshing,
    refreshMetadata,
    getInterfaceById,
    getInterfaceByValue,
    getInterfacesByCategory,
    getInterfaceLabel,
    isInterfaceCritical,
    isInterfaceSensitive,
    getInterfaceRequires,
  };
}

export default MetadataContext;
