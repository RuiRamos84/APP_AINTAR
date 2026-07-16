import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';

export interface AnexoParticipacao {
  pk?: number;
  filename: string;
  nome_original: string;
  tamanho: number;
  data?: string;
}

export type ParticipacaoTipo = 'dia' | 'parcial';

export interface Participacao {
  pk: number;
  tb_user_fk: number;
  colaborador_nome: string;
  tipo: ParticipacaoTipo;
  motivo_fk: number | null;
  motivo_artigo: string | null;
  motivo_descricao: string | null;
  data_inicio: string;
  data_fim: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  data_participacao: string | null;
  pre_aviso_dias: number | null;
  ts_estado_fk: number;
  estado_descricao: string;
  estado_cor: string;
  observacoes: string | null;
  documentos: AnexoParticipacao[];
}

export interface Motivo {
  pk: number;
  artigo: string;
  descricao: string;
  parcial_ok: boolean;
}

export interface ParticipacoesParams {
  user_fk?: number;
  ano?: number;
  estado?: number;
}

export interface CreateParticipacaoPayload {
  user_fk?: number;
  tipo: ParticipacaoTipo;
  motivo_fk: number | null;
  data_inicio: string;
  data_fim: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  data_participacao: string | null;
  observacoes: string | null;
}

export type EditParticipacaoPayload = Partial<Omit<CreateParticipacaoPayload, 'user_fk'>>;

export interface WorkflowParticipacaoPayload {
  ref_pk: number;
  step: number;
  ts_estado_fk: number;
  notas: string | null;
}

const KEY = (params: ParticipacoesParams) => ['rh-participacoes', params] as const;

export const useMotivosParticipacao = () => {
  const query = useQuery<Motivo[]>({
    queryKey: ['rh-participacoes-motivos'],
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/participacoes/motivos');
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });

  return { motivos: query.data ?? [], isLoading: query.isLoading };
};

export const useParticipacoes = (params: ParticipacoesParams = {}) => {
  const qc = useQueryClient();

  const query = useQuery<Participacao[]>({
    queryKey: KEY(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/participacoes', { params });
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rh-participacoes'] });

  const criar = useMutation({
    mutationFn: (payload: CreateParticipacaoPayload) => apiClient.post('/rh/participacoes', payload),
    onSuccess: invalidate,
  });

  const editar = useMutation({
    mutationFn: ({ pk, data }: { pk: number; data: EditParticipacaoPayload }) =>
      apiClient.put(`/rh/participacoes/${pk}`, data),
    onSuccess: invalidate,
  });

  const workflow = useMutation({
    mutationFn: (payload: WorkflowParticipacaoPayload) =>
      apiClient.post('/rh/participacoes/workflow', payload),
    onSuccess: invalidate,
  });

  return {
    participacoes: query.data ?? [],
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

// Nível de aprovação corrente, inferido do estado actual (1 e 2 = pendente
// no nível 1/Chefe direto; 5 = autorizado por Admin RH, pendente Presidência).
export function stepFromEstado(tsEstadoFk: number): 1 | 2 | 3 {
  if (tsEstadoFk >= 5) return 3;
  if (tsEstadoFk === 2) return 2;
  return 1;
}

// Indicador de pré-aviso (antecedência legal mínima de 5 dias).
export type PreAvisoNivel = 'success' | 'warning' | 'error';

export function preAvisoStatus(dataInicio?: string | null, dataParticipacao?: string | null): { dias: number; nivel: PreAvisoNivel; label: string } | null {
  if (!dataInicio || !dataParticipacao) return null;
  const dInicio = new Date(dataInicio + 'T00:00:00');
  const dPart = new Date(dataParticipacao + 'T00:00:00');
  const dias = Math.round((dInicio.getTime() - dPart.getTime()) / 86400000);
  if (dias >= 5) return { dias, nivel: 'success', label: `${dias}d de antecedência` };
  if (dias > 0) return { dias, nivel: 'warning', label: `${dias}d (abaixo do mínimo legal)` };
  if (dias === 0) return { dias, nivel: 'warning', label: 'Mesmo dia' };
  return { dias, nivel: 'error', label: `Retroactivo (${Math.abs(dias)}d)` };
}
