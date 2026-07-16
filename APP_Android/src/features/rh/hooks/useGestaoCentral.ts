import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';

export type PendenteTipo = 'ferias' | 'faltas' | 'ponto' | 'participacao';

export interface Pendente {
  tipo: PendenteTipo;
  pk: number;
  tb_user_fk: number;
  colaborador_nome: string;
  superior_fk: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  mes: number | null;
  ano: number | null;
  ts_estado_fk: number;
  estado_descr: string;
  estado_cor: string;
  notas: string | null;
  created_at: string;
}

export interface EquipaMembro {
  pk: number;
  name: string;
  superior_fk: number | null;
  tt_rh_equipa_fk: number | null;
  equipa_codigo: string | null;
  equipa_nome: string | null;
  entrada_hoje: string | null;
  saida_hoje: string | null;
  em_ferias_hoje: boolean;
  tem_falta_hoje: boolean;
  piquete_semana_inicio: string | null;
  dias_ferias_disponiveis: number | null;
  faltas_ano: number | null;
  hora_entrada: string | null;
  hora_saida: string | null;
  horario_descr: string | null;
}

export interface WorkflowBulkPayload {
  tipo: PendenteTipo;
  pks: number[];
  step: number;
  ts_estado_fk: number;
  notas?: string | null;
}

export interface WorkflowBulkResult {
  message: string;
  ok: number[];
  erro: { pk: number; msg: string }[];
}

export const usePendentes = (params: { tipo?: string; user_fk?: number } = {}) => {
  const qc = useQueryClient();

  const query = useQuery<Pendente[]>({
    queryKey: ['rh-gestao-pendentes', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/gestao/pendentes', { params });
      return data;
    },
    staleTime: 60 * 1000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['rh-gestao-pendentes'] });
    qc.invalidateQueries({ queryKey: ['rh-ferias'] });
    qc.invalidateQueries({ queryKey: ['rh-faltas'] });
    qc.invalidateQueries({ queryKey: ['rh-ponto-mensal'] });
  };

  const bulk = useMutation({
    mutationFn: async (payload: WorkflowBulkPayload) => {
      const { data } = await apiClient.post<WorkflowBulkResult>('/rh/gestao/workflow/bulk', payload);
      return data;
    },
    onSuccess: invalidate,
  });

  return {
    pendentes: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    workflowBulk: bulk.mutateAsync,
    isBulking: bulk.isPending,
  };
};

export const useEquipa = (params: { user_fk?: number } = {}) => {
  const query = useQuery<EquipaMembro[]>({
    queryKey: ['rh-gestao-equipa', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/gestao/equipa', { params });
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  return { equipa: query.data ?? [], isLoading: query.isLoading, isError: query.isError };
};
