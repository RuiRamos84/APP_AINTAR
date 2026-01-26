/**
 * Metadata Context
 * Contexto global para metadados estáticos da aplicação
 * Carrega dados de referência (profiles, interfaces, etc.) uma única vez
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
export function MetadataProvider({ children }) {
  const { user, isLoading: authLoading } = useAuth();

  const [metadata, setMetadata] = useState({
    profiles: [],
    interfaces: [],
    identTypes: [],
    associates: [],
    taskPriority: [],
    taskStatus: [],
    paymentMethod: [],
    // Adicionar outros metadados conforme necessário
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  /**
   * Carrega todos os metadados do backend
   */
  const loadMetadata = useCallback(async () => {
    try {
      setIsLoading(true);
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
    }
  }, []);

  /**
   * Recarrega os metadados (force refresh)
   */
  const refreshMetadata = useCallback(() => {
    return loadMetadata();
  }, [loadMetadata]);

  /**
   * Carrega metadados quando user está autenticado
   * Só faz fetch se:
   * 1. Autenticação não está em loading
   * 2. User está autenticado
   * 3. Metadados ainda não foram carregados
   */
  useEffect(() => {
    // Aguardar autenticação finalizar
    if (authLoading) {
      return;
    }

    // Só carregar se user autenticado
    if (user) {
      loadMetadata();
    } else {
      // User não autenticado - limpar metadata e parar loading
      setIsLoading(false);
      setMetadata({
        profiles: [],
        interfaces: [],
        identTypes: [],
        associates: [],
        taskPriority: [],
        taskStatus: [],
        paymentMethod: [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]); // Recarregar quando user muda

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
