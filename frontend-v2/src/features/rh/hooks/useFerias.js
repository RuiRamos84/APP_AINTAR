import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import notification from '@/core/services/notification';
import { getFerias, criarFerias, editarFerias, executarWorkflow, getConflitosFerias, getMapaFerias } from '../services/rhService';

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

// Conflitos de equipa — chamado com datas para mostrar aviso no form
export const useConflitosFerias = ({ user_fk, data_inicio, data_fim, excluir_pk } = {}) => {
  const enabled = !!(user_fk && data_inicio && data_fim);
  const query = useQuery({
    queryKey: ['rh-ferias-conflitos', user_fk, data_inicio, data_fim, excluir_pk],
    queryFn: () => getConflitosFerias({ user_fk, data_inicio, data_fim, excluir_pk }),
    enabled,
    staleTime: 30 * 1000,
  });
  return {
    conflitos: Array.isArray(query.data) ? query.data : [],
    isLoading: query.isFetching,
  };
};

// Mapa anual de férias por equipa
export const useMapaFerias = ({ ano, equipa_fk } = {}) => {
  const query = useQuery({
    queryKey: ['rh-ferias-mapa', ano, equipa_fk],
    queryFn: () => getMapaFerias({ ano, equipa_fk }),
    staleTime: 2 * 60 * 1000,
    enabled: !!ano,
  });

  useEffect(() => {
    if (query.isError) notification.error('Erro ao carregar mapa de férias');
  }, [query.isError]);

  return {
    registos: Array.isArray(query.data) ? query.data : [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
};
