import { useMetadata } from '@/core/contexts/MetadataContext';

/**
 * Devolve os lookups RH directamente do MetadataContext (carregados no arranque).
 * Sem requests adicionais.
 */
export const useRhLookups = () => {
  const { metadata, isLoading } = useMetadata();

  return {
    lookups: {
      tipos_jornada:    metadata.rhTipoJornada       || [],
      eventos_ponto:    metadata.rhPontoEvento        || [],
      tipos_ferias:     metadata.rhTipoFerias         || [],
      tipos_falta:      metadata.rhTipoFalta          || [],
      estados_workflow: metadata.rhEstadoWorkflow     || [],
      tipos_ocorrencia: metadata.rhPiqueteOcorrencia  || [],
    },
    isLoading,
  };
};

/**
 * Lista de colaboradores internos (ts_profile 0, 1, 6) do MetadataContext.
 * Usada nos dropdowns dos modais de férias, faltas, horários, piquete.
 */
export const useColaboradores = () => {
  const { metadata, isLoading } = useMetadata();

  return {
    colaboradores: metadata.rhColaboradores || [],
    isLoading,
  };
};
