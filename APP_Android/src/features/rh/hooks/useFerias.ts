import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';
import type { WorkflowPayload } from '@/features/rh/components/WorkflowDialog';

export interface Ferias {
  pk: number;
  tb_user_fk: number;
  colaborador_nome: string;
  tt_tipo_fk: number;
  tipo_descr: string;
  data_inicio: string;
  data_fim: string;
  dias_uteis: number;
  ts_estado_fk: number;
  estado_descr: string;
  estado_cor: string;
  notas: string | null;
}

export interface FeriasParams {
  user_fk?: number;
  ano?: number;
  estado?: number;
}

export interface CreateFeriasPayload {
  tt_tipo_fk: number;
  data_inicio: string;
  data_fim: string;
  notas: string;
}

export type EditFeriasPayload = Partial<CreateFeriasPayload>;

export interface ConflitoFerias {
  ferias_pk: number;
  colaborador_nome: string;
  data_inicio: string;
  data_fim: string;
}

const KEY = (params: FeriasParams) => ['rh-ferias', params] as const;

export const useFerias = (params: FeriasParams = {}) => {
  const qc = useQueryClient();

  const query = useQuery<Ferias[]>({
    queryKey: KEY(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/ferias', { params });
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rh-ferias'] });

  const criar = useMutation({
    mutationFn: (payload: CreateFeriasPayload) => apiClient.post('/rh/ferias', payload),
    onSuccess: invalidate,
  });

  const editar = useMutation({
    mutationFn: ({ pk, data }: { pk: number; data: EditFeriasPayload }) =>
      apiClient.put(`/rh/ferias/${pk}`, data),
    onSuccess: invalidate,
  });

  const workflow = useMutation({
    mutationFn: (payload: WorkflowPayload) =>
      apiClient.post('/rh/workflow', { tipo_ref: 'ferias', ...payload }),
    onSuccess: invalidate,
  });

  return {
    ferias: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    criar: criar.mutateAsync,
    isCriando: criar.isPending,
    editar: editar.mutateAsync,
    isEditando: editar.isPending,
    workflow: workflow.mutateAsync,
    isWorkflow: workflow.isPending,
  };
};

export const useConflitosFerias = (params: {
  user_fk?: number;
  data_inicio?: string;
  data_fim?: string;
  excluir_pk?: number;
}) => {
  const enabled = !!(params.user_fk && params.data_inicio && params.data_fim);
  const query = useQuery<ConflitoFerias[]>({
    queryKey: ['rh-ferias-conflitos', params.user_fk, params.data_inicio, params.data_fim, params.excluir_pk],
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/ferias/conflitos', { params });
      return data;
    },
    enabled,
    staleTime: 30 * 1000,
  });

  return { conflitos: query.data ?? [], isLoading: query.isFetching };
};
