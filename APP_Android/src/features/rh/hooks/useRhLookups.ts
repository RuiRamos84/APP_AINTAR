import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';

export interface LookupItem {
  pk: number;
  descr: string;
  [key: string]: unknown;
}

export interface RhLookups {
  tipos_jornada: LookupItem[];
  eventos_ponto: LookupItem[];
  tipos_ferias: LookupItem[];
  tipos_falta: LookupItem[];
  estados_workflow: LookupItem[];
  tipos_ocorrencia: LookupItem[];
}

export interface Colaborador {
  pk: number;
  name: string;
}

export interface ColaboradorCompleto extends Colaborador {
  data_nascimento: string | null;
}

const RH_KEYS = {
  lookups: ['rh', 'lookups'] as const,
  colaboradores: ['rh', 'colaboradores', 'lista'] as const,
  colaboradoresCompletos: ['rh', 'colaboradores'] as const,
};

const EMPTY_LOOKUPS: RhLookups = {
  tipos_jornada: [],
  eventos_ponto: [],
  tipos_ferias: [],
  tipos_falta: [],
  estados_workflow: [],
  tipos_ocorrencia: [],
};

export const useRhLookups = () => {
  const query = useQuery<RhLookups>({
    queryKey: RH_KEYS.lookups,
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/lookups');
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  return {
    lookups: query.data ?? EMPTY_LOOKUPS,
    isLoading: query.isLoading,
  };
};

export const useColaboradores = () => {
  const query = useQuery<Colaborador[]>({
    queryKey: RH_KEYS.colaboradores,
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/colaboradores/lista');
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  return {
    colaboradores: query.data ?? [],
    isLoading: query.isLoading,
  };
};

// Lista completa (inclui data_nascimento) — usada para o card de Aniversários.
export const useColaboradoresCompletos = () => {
  const query = useQuery<ColaboradorCompleto[]>({
    queryKey: RH_KEYS.colaboradoresCompletos,
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/colaboradores');
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  return {
    colaboradores: query.data ?? [],
    isLoading: query.isLoading,
  };
};
