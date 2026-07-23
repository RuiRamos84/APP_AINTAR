import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';
import type { WorkflowPayload } from '@/features/rh/components/WorkflowDialog';

export interface AnexoFalta {
  pk?: number;
  filename: string;
  nome_original: string;
  tamanho: number;
  data?: string;
}

export interface Falta {
  pk: number;
  tb_user_fk: number;
  colaborador_nome: string;
  tt_tipo_falta_fk: number;
  tipo_descr: string;
  requer_justificativo: boolean;
  data: string;
  ts_estado_fk: number;
  estado_descr: string;
  estado_cor: string;
  justificativo_path: string | null;
  documentos: AnexoFalta[];
  comunicado_por: number | null;
  comunicado_por_nome: string | null;
  notas: string | null;
  created_at: string;
}

export interface FaltasParams {
  user_fk?: number;
  ano?: number;
  estado?: number;
}

export interface CreateFaltaPayload {
  user_fk: number;
  tt_tipo_falta_fk: number;
  data: string;
  notas?: string | null;
  comunicado_por?: number | null;
}

export type EditFaltaPayload = Partial<Pick<CreateFaltaPayload, 'tt_tipo_falta_fk' | 'notas'>>;

const KEY = (params: FaltasParams) => ['rh-faltas', params] as const;

export const useFaltas = (params: FaltasParams = {}) => {
  const qc = useQueryClient();

  const query = useQuery<Falta[]>({
    queryKey: KEY(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/faltas', { params });
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rh-faltas'] });

  const criar = useMutation({
    mutationFn: (payload: CreateFaltaPayload) => apiClient.post('/rh/faltas', payload),
    onSuccess: invalidate,
  });

  const editar = useMutation({
    mutationFn: ({ pk, data }: { pk: number; data: EditFaltaPayload }) =>
      apiClient.put(`/rh/faltas/${pk}`, data),
    onSuccess: invalidate,
  });

  const workflow = useMutation({
    mutationFn: (payload: WorkflowPayload) =>
      apiClient.post('/rh/workflow', { tipo_ref: 'faltas', ...payload }),
    onSuccess: invalidate,
  });

  return {
    faltas: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    criar: criar.mutateAsync,
    isCriando: criar.isPending,
    editar: editar.mutateAsync,
    isEditando: editar.isPending,
    workflow: workflow.mutateAsync,
    isWorkflow: workflow.isPending,
  };
};
