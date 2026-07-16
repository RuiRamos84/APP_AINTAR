import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import notification from '@/core/services/notification';
import { getFaltas, criarFalta, editarFalta, executarWorkflow } from '../services/rhService';

const KEY = (p) => ['rh-faltas', p];

export const useFaltas = (params = {}) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY(params),
    queryFn: () => getFaltas(params),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (query.isError) notification.error('Erro ao carregar faltas');
  }, [query.isError]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rh-faltas'] });

  const criar = useMutation({
    mutationFn: criarFalta,
    onSuccess: () => { invalidate(); notification.success('Falta registada'); },
    onError: (e) => notification.apiError(e, 'Erro ao registar falta'),
  });

  const editar = useMutation({
    mutationFn: ({ pk, data }) => editarFalta(pk, data),
    onSuccess: () => { invalidate(); notification.success('Falta actualizada'); },
    onError: (e) => notification.apiError(e, 'Erro ao editar falta'),
  });

  const workflow = useMutation({
    mutationFn: (data) => executarWorkflow({ tipo_ref: 'faltas', ...data }),
    onSuccess: () => { invalidate(); notification.success('Acção de workflow executada'); },
    onError: (e) => notification.apiError(e, 'Erro no workflow'),
  });

  return {
    faltas: Array.isArray(query.data) ? query.data.map(r => ({ ...r, id: r.pk })) : [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    criar: criar.mutateAsync,
    isCriando: criar.isPending,
    editar: editar.mutateAsync,
    isEditando: editar.isPending,
    workflow: workflow.mutateAsync,
    isWorkflow: workflow.isPending,
  };
};
