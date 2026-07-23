import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';
import type { WorkflowPayload } from '@/features/rh/components/WorkflowDialog';

export interface PontoEvento {
  pk: number;
  tb_user_fk: number;
  data: string;
  ts_registo: string;
  tt_evento_fk: number;
  evento_descr: string;
  evento_ordem: number;
  face_verified: boolean | null;
  face_score: number | null;
  fonte: 'app+face' | 'app' | 'correcao' | null;
  latitude: number | null;
  longitude: number | null;
  precisao: number | null;
  tem_gps: boolean;
  notas: string | null;
}

export interface PontoMensal {
  pk: number;
  tb_user_fk: number;
  colaborador_nome: string;
  ano: number;
  mes: number;
  total_dias: number;
  total_horas: number;
  submetido_em: string | null;
  ts_estado_fk: number;
  estado_descr: string;
  estado_cor: string;
}

export interface ColaboradorPerfil {
  pk: number;
  gps_obrigatorio: boolean;
  [key: string]: unknown;
}

export interface RegistarPontoEventoPayload {
  tt_evento_fk: number;
  latitude: number | null;
  longitude: number | null;
  precisao: number | null;
  face_verified: boolean;
  face_score: number | null;
}

export interface RegistarPontoResult {
  message?: string;
  // Regresso (evento 6) sem "Saída Temporária" imediatamente anterior gera
  // automaticamente uma Participação de ausência parcial por justificar.
  participacao_criada?: boolean;
}

export interface CorrigirPontoPayload {
  ts_registo: string;
  notas: string;
}

export interface AdicionarPontoAdminPayload {
  user_fk: number;
  tt_evento_fk: number;
  ts_registo: string;
  notas: string;
}

export interface SubmeterBloqueio {
  dias_sem_registo?: string[];
  dias_incompletos?: string[];
  dias_por_justificar?: string[];
}

const today = () => new Date().toISOString().slice(0, 10);

export const usePontoHoje = (userFk?: number) => {
  const query = useQuery<PontoEvento[]>({
    queryKey: ['rh-ponto-hoje', userFk],
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/ponto', {
        params: { user_fk: userFk, data_inicio: today(), data_fim: today() },
      });
      return data;
    },
    enabled: !!userFk,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  return { eventosHoje: query.data ?? [], isLoading: query.isLoading };
};

export const usePontoMes = (userFk?: number, ano?: number, mes?: number) => {
  const query = useQuery<PontoEvento[]>({
    queryKey: ['rh-ponto-mes', userFk, ano, mes],
    queryFn: async () => {
      const mm = String(mes).padStart(2, '0');
      const lastDay = new Date(ano as number, mes as number, 0).getDate();
      const { data } = await apiClient.get('/rh/ponto', {
        params: { user_fk: userFk, data_inicio: `${ano}-${mm}-01`, data_fim: `${ano}-${mm}-${lastDay}` },
      });
      return data;
    },
    enabled: !!userFk && !!ano && !!mes,
    staleTime: 2 * 60 * 1000,
  });

  return { registosMes: query.data ?? [], isLoading: query.isLoading };
};

export const usePontoMensal = (params: { user_fk?: number; ano?: number; mes?: number } = {}) => {
  const query = useQuery<PontoMensal[]>({
    queryKey: ['rh-ponto-mensal', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/ponto/mensal', { params });
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  return { mapas: query.data ?? [], isLoading: query.isLoading };
};

export const useColaboradorPerfil = (userFk?: number) => {
  const query = useQuery<ColaboradorPerfil>({
    queryKey: ['rh-colaborador-perfil', userFk],
    queryFn: async () => {
      const { data } = await apiClient.get(`/rh/colaboradores/${userFk}`);
      return data;
    },
    enabled: !!userFk,
    staleTime: 5 * 60 * 1000,
  });

  return { perfil: query.data ?? null, isLoading: query.isLoading };
};

export const usePontoActions = (userFk?: number) => {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['rh-ponto-hoje'] });
    qc.invalidateQueries({ queryKey: ['rh-ponto-mes'] });
    qc.invalidateQueries({ queryKey: ['rh-ponto-mensal'] });
  };

  const registar = useMutation({
    mutationFn: async (payload: RegistarPontoEventoPayload) => {
      const { data } = await apiClient.post<RegistarPontoResult>('/rh/ponto/evento', { user_fk: userFk, ...payload });
      return data;
    },
    onSuccess: (data) => {
      invalidate();
      if (data?.participacao_criada) {
        qc.invalidateQueries({ queryKey: ['rh-participacoes'] });
      }
    },
  });

  const submeter = useMutation({
    mutationFn: ({ ano, mes, notas }: { ano: number; mes: number; notas?: string }) =>
      apiClient.post('/rh/ponto/submeter', { user_fk: userFk, ano, mes, notas }),
    onSuccess: invalidate,
  });

  const corrigir = useMutation({
    mutationFn: ({ pk, data }: { pk: number; data: CorrigirPontoPayload }) =>
      apiClient.put(`/rh/ponto/${pk}/corrigir`, data),
    onSuccess: invalidate,
  });

  const adicionarAdmin = useMutation({
    mutationFn: (data: AdicionarPontoAdminPayload) => apiClient.post('/rh/ponto/admin/evento', data),
    onSuccess: invalidate,
  });

  const workflow = useMutation({
    mutationFn: (payload: WorkflowPayload) =>
      apiClient.post('/rh/workflow', { tipo_ref: 'ponto', ...payload }),
    onSuccess: invalidate,
  });

  return {
    registar: registar.mutateAsync,
    isRegistando: registar.isPending,
    submeter: submeter.mutateAsync,
    isSubmetendo: submeter.isPending,
    corrigir: corrigir.mutateAsync,
    isCorrigindo: corrigir.isPending,
    adicionarAdmin: adicionarAdmin.mutateAsync,
    isAdicionandoAdmin: adicionarAdmin.isPending,
    workflow: workflow.mutateAsync,
    isWorkflow: workflow.isPending,
  };
};
