import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';

export interface AvalPeriod {
  pk: number;
  descr: string;
  year: number;
  active: number;
}

export interface AvalAssignment {
  pk: number;
  target_name: string;
}

export interface AvalStatus {
  total: number;
  done: number;
  remaining: number;
}

export interface SubmitAvalPayload {
  pk: number;
  aval_personal_colab: number;
  aval_personal_rel: number;
  aval_professional: number;
}

const EMPTY_STATUS: AvalStatus = { total: 0, done: 0, remaining: 0 };

export const usePeriods = () => {
  const query = useQuery<AvalPeriod[]>({
    queryKey: ['aval-periods'],
    queryFn: async () => {
      const { data } = await apiClient.get('/aval/periods');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { periods: query.data ?? [], isLoading: query.isLoading };
};

export const useAval = (periodPk?: number) => {
  const qc = useQueryClient();

  const statusQuery = useQuery<AvalStatus>({
    queryKey: ['aval-status', periodPk],
    queryFn: async () => {
      const { data } = await apiClient.get(`/aval/${periodPk}/status`);
      return data;
    },
    enabled: !!periodPk,
    staleTime: 30 * 1000,
  });

  const listQuery = useQuery<AvalAssignment[]>({
    queryKey: ['aval-list', periodPk],
    queryFn: async () => {
      const { data } = await apiClient.get(`/aval/${periodPk}/list`);
      return data;
    },
    enabled: !!periodPk,
    staleTime: 30 * 1000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['aval-status', periodPk] });
    qc.invalidateQueries({ queryKey: ['aval-list', periodPk] });
  };

  const submit = useMutation({
    mutationFn: (payload: SubmitAvalPayload) => apiClient.post('/aval/submit', payload),
    onSuccess: invalidate,
  });

  return {
    status: statusQuery.data ?? EMPTY_STATUS,
    isLoadingStatus: statusQuery.isLoading,
    assignments: listQuery.data ?? [],
    isLoadingList: listQuery.isLoading,
    submit: submit.mutateAsync,
    isSubmitting: submit.isPending,
  };
};
