import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';

export interface Escala {
  pk: number;
  tb_user_fk: number;
  colaborador_nome: string;
  data_inicio: string;
  data_fim: string;
  confirmado: boolean;
  ts_estado_fk: number;
  estado_descr: string;
  estado_cor: string;
  gerado_auto: boolean;
}

export interface PiqueteParams {
  ano?: number;
  mes?: number;
}

export interface CreateEscalaPayload {
  tb_user_fk: number;
  data_inicio: string;
  data_fim: string;
}

export type EditEscalaPayload = Partial<CreateEscalaPayload>;

export interface Regra {
  pk?: number;
  codigo: string;
  descr: string;
  valor: string;
  ativo: boolean;
}

export interface Ocorrencia {
  pk: number;
  tb_piquete_escala_fk: number;
  colaborador_nome: string;
  semana_inicio: string;
  tt_tipo_fk: number;
  tipo_descr: string;
  descr: string;
  equipas_accionadas: string | null;
  created_by_nome: string | null;
}

export interface OcorrenciasParams {
  ano?: number;
}

export interface CreateOcorrenciaPayload {
  tb_piquete_escala_fk: number;
  tt_tipo_fk: number;
  descr: string;
  equipas_accionadas: string | null;
}

export type EditOcorrenciaPayload = Partial<CreateOcorrenciaPayload>;

const ESCALAS_KEY = (params: PiqueteParams) => ['rh-piquete', params] as const;

export const usePiquete = (params: PiqueteParams = {}) => {
  const qc = useQueryClient();

  const query = useQuery<Escala[]>({
    queryKey: ESCALAS_KEY(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/piquete', { params });
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rh-piquete'] });

  const gerar = useMutation({
    mutationFn: (payload: { ano: number; mes: number }) => apiClient.post('/rh/piquete/gerar', payload),
    onSuccess: invalidate,
  });

  const confirmar = useMutation({
    mutationFn: (pk: number) => apiClient.put(`/rh/piquete/${pk}/confirmar`),
    onSuccess: invalidate,
  });

  const criar = useMutation({
    mutationFn: (payload: CreateEscalaPayload) => apiClient.post('/rh/piquete', payload),
    onSuccess: invalidate,
  });

  const editar = useMutation({
    mutationFn: ({ pk, data }: { pk: number; data: EditEscalaPayload }) =>
      apiClient.put(`/rh/piquete/${pk}`, data),
    onSuccess: invalidate,
  });

  return {
    escalas: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    gerar: gerar.mutateAsync,
    isGerando: gerar.isPending,
    confirmar: confirmar.mutateAsync,
    isConfirmando: confirmar.isPending,
    criar: criar.mutateAsync,
    isCriando: criar.isPending,
    editar: editar.mutateAsync,
    isEditando: editar.isPending,
  };
};

export const usePiqueteRegras = () => {
  const qc = useQueryClient();

  const query = useQuery<Regra[]>({
    queryKey: ['rh-piquete-regras'],
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/piquete/regras');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const save = useMutation({
    mutationFn: (regras: Regra[]) => apiClient.post('/rh/piquete/regras', regras),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rh-piquete-regras'] }),
  });

  return {
    regras: query.data ?? [],
    isLoading: query.isLoading,
    save: save.mutateAsync,
    isSaving: save.isPending,
  };
};

export const useOcorrencias = (params: OcorrenciasParams = {}) => {
  const qc = useQueryClient();

  const query = useQuery<Ocorrencia[]>({
    queryKey: ['rh-ocorrencias', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/piquete/ocorrencias', { params });
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rh-ocorrencias'] });

  const criar = useMutation({
    mutationFn: (payload: CreateOcorrenciaPayload) => apiClient.post('/rh/piquete/ocorrencias', payload),
    onSuccess: invalidate,
  });

  const editar = useMutation({
    mutationFn: ({ pk, data }: { pk: number; data: EditOcorrenciaPayload }) =>
      apiClient.put(`/rh/piquete/ocorrencias/${pk}`, data),
    onSuccess: invalidate,
  });

  return {
    ocorrencias: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    criar: criar.mutateAsync,
    isCriando: criar.isPending,
    editar: editar.mutateAsync,
    isEditando: editar.isPending,
  };
};
