import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import notification from '@/core/services/notification';
import { getFerias, criarFerias, editarFerias, executarWorkflow } from '../services/rhService';

const KEY = (p) => ['rh-ferias', p];

export const useFerias = (params = {}) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY(params),
    queryFn: () => getFerias(params),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (query.isError) notification.error('Erro ao carregar férias');
  }, [query.isError]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rh-ferias'] });

  const criar = useMutation({
    mutationFn: criarFerias,
    onSuccess: () => { invalidate(); notification.success('Pedido de férias criado'); },
    onError: (e) => notification.apiError(e, 'Erro ao criar pedido'),
  });

  const editar = useMutation({
    mutationFn: ({ pk, data }) => editarFerias(pk, data),
    onSuccess: () => { invalidate(); notification.success('Pedido actualizado'); },
    onError: (e) => notification.apiError(e, 'Erro ao editar pedido'),
  });

  const workflow = useMutation({
    mutationFn: (data) => executarWorkflow({ tipo_ref: 'ferias', ...data }),
    onSuccess: () => { invalidate(); notification.success('Acção de workflow executada'); },
    onError: (e) => notification.apiError(e, 'Erro no workflow'),
  });

  return {
    ferias: Array.isArray(query.data) ? query.data.map(r => ({ ...r, id: r.pk })) : [],
    isLoading: query.isLoading,
    criar: criar.mutateAsync,
    isCriando: criar.isPending,
    editar: editar.mutateAsync,
    isEditando: editar.isPending,
    workflow: workflow.mutateAsync,
    isWorkflow: workflow.isPending,
  };
};
