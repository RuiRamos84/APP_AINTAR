import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';

export interface Horario {
  pk: number;
  user_fk: number;
  colaborador_nome?: string;
  tt_jornada_fk: number;
  jornada_descr: string;
  descr: string;
  hora_entrada: string | null;
  hora_saida: string | null;
  hora_inicio_almoco: string | null;
  hora_fim_almoco: string | null;
  data_inicio: string;
  data_fim: string | null;
  activo: boolean;
}

export interface HorariosParams {
  user_fk?: number;
  activos?: boolean;
}

export interface CreateHorarioPayload {
  user_fk: number;
  tt_jornada_fk: number;
  descr: string;
  hora_entrada: string;
  hora_saida: string;
  hora_inicio_almoco: string | null;
  hora_fim_almoco: string | null;
  data_inicio: string;
  data_fim: string | null;
  dias_semana: number[];
}

export type EditHorarioPayload = Partial<Omit<CreateHorarioPayload, 'user_fk'>>;

const KEY = (params: HorariosParams) => ['rh-horarios', params] as const;

export const useHorarios = (params: HorariosParams = {}) => {
  const qc = useQueryClient();

  const query = useQuery<Horario[]>({
    queryKey: KEY(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/horarios', {
        params: { user_fk: params.user_fk, activos: params.activos ? 'true' : undefined },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rh-horarios'] });

  const criar = useMutation({
    mutationFn: (payload: CreateHorarioPayload) => apiClient.post('/rh/horarios', payload),
    onSuccess: invalidate,
  });

  const editar = useMutation({
    mutationFn: ({ pk, data }: { pk: number; data: EditHorarioPayload }) =>
      apiClient.put(`/rh/horarios/${pk}`, data),
    onSuccess: invalidate,
  });

  return {
    horarios: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    criar: criar.mutateAsync,
    isCriando: criar.isPending,
    editar: editar.mutateAsync,
    isEditando: editar.isPending,
  };
};
