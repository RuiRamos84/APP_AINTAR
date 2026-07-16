import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';

const KEYS = {
  tasks:    ['operations', 'tasks']    as const,
  control:  ['operations', 'control'] as const,
  metadata: ['operations', 'metadata'] as const,
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OperationTask {
  pk: number;
  tt_operacaoaccao: string;
  tt_operacaoaccao_type?: string | number;
  tt_operacaoaccao_refobj?: string;
  tb_instalacao: string;
  tt_instalacaolicenciamento?: number;
  dia_operacao?: string;
  data?: string;
  descr?: string;
  ts_operador1?: string;
  ts_operador2?: string;
  valuetext?: string;
  valuememo?: string;
  opcoes?: string[];
  unidade?: string;
  completed?: boolean;
  photo?: boolean;
}

export interface CompleteTaskPayload {
  valuetext?: string;
  valuememo?: string;
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface OperationSelfResponse {
  data: OperationTask[];
  completed: OperationTask[];
  stats: { total_assigned: number; total_completed: number };
  total: number;
}

export interface MetaInstall {
  pk: number;
  nome?: string;
  name?: string;
  ts_entity?: string;
}

export interface MetaAction {
  pk: number;
  value?: string;
  name?: string;
}

export interface MetaWho {
  pk: number;
  name: string;
}

export interface MetaOpControlo {
  pk: number;
  value: string;
}

export interface OperationMetadata {
  etar: MetaInstall[];
  ee:   MetaInstall[];
  operacaoaccao: MetaAction[];
  who:  MetaWho[];
  opcontrolo?: MetaOpControlo[];
}

export interface CreateDirectPayload {
  data: string;
  pk_instalacao: number;
  pk_operador: number;
  tt_operacaoaccao: number;
  memo?: string;
  clat?: number;
  clong?: number;
}

// ─── Action pk filter per installation type (mirrors web) ────────────────────
export const ACTIONS_BY_TYPE: Record<string, number[]> = {
  ETAR:  [100, 102, 104, 105, 6],
  EE:    [100, 102, 104, 105, 6],
  CAIXA: [101, 106, 102],
  REDE:  [102, 101],
};

// Fixed pk for REDE/CAIXA (no real installation)
export const FIXED_PK: Record<string, number> = { REDE: -1, CAIXA: -2 };

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const useOperationTasks = () =>
  useQuery<OperationSelfResponse>({
    queryKey: KEYS.tasks,
    queryFn: async () => {
      const { data } = await apiClient.get('/operacao_self');
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

export const useConcluirTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskPk, payload }: { taskPk: number; payload?: CompleteTaskPayload }) =>
      apiClient.post(`/operacao_complete/${taskPk}`, payload ?? {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tasks }),
  });
};

export const useAddOperationAnnexes = () =>
  useMutation({
    mutationFn: ({ taskPk, files }: { taskPk: number; files: PickedFile[] }) => {
      const formData = new FormData();
      files.forEach((f) => {
        formData.append('files', { uri: f.uri, name: f.name, type: f.mimeType } as any);
      });
      return apiClient.post(`/operation_control/${taskPk}/annexes`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
  });

export const useOperationMetadata = () =>
  useQuery<OperationMetadata>({
    queryKey: KEYS.metadata,
    queryFn: async () => {
      const { data } = await apiClient.get('/metaData');
      return data?.data ?? data;
    },
    staleTime: 60 * 60 * 1000,
  });

export const useCreateOperacaoDirect = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDirectPayload) =>
      apiClient.post('/operacao_direct', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tasks }),
  });
};

// ─── Pedidos (assigned documents) ────────────────────────────────────────────

export interface Pedido {
  pk: number;
  numero?: string;
  tipo?: string;
  ts_entity?: string;
  submission?: string;
  when_start?: string;
  urgency?: string;
  address?: string;
  phone?: string;
  memo?: string;
}

export const usePedidos = () =>
  useQuery<Pedido[]>({
    queryKey: ['documents', 'assigned'],
    queryFn: async () => {
      const { data } = await apiClient.get('/document_self');
      const arr = data?.document_self ?? data;
      return Array.isArray(arr) ? arr : [];
    },
    staleTime: 2 * 60 * 1000,
  });

export const useCreateRequisicao = () =>
  useMutation({
    mutationFn: (payload: { pnmemo: string; pk_instalacao?: number | null }) =>
      apiClient.post('/requisicao_interna', payload),
  });

export const useCreateDescarga = () =>
  useMutation({
    mutationFn: (payload: { pk_instalacao: number; pnmemo: string }) =>
      apiClient.post('/descarga_interdita', payload),
  });
