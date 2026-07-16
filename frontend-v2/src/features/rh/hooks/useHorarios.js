import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import notification from '@/core/services/notification';
import { getHorarios, criarHorario, editarHorario } from '../services/rhService';

const KEY = (p) => ['rh-horarios', p];

export const useHorarios = (params = {}) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY(params),
    queryFn: () => getHorarios(params),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.isError) notification.error('Erro ao carregar horários');
  }, [query.isError]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rh-horarios'] });

  const criar = useMutation({
    mutationFn: criarHorario,
    onSuccess: () => { invalidate(); notification.success('Horário criado'); },
    onError: (e) => notification.apiError(e, 'Erro ao criar horário'),
  });

  const editar = useMutation({
    mutationFn: ({ pk, data }) => editarHorario(pk, data),
    onSuccess: () => { invalidate(); notification.success('Horário actualizado'); },
    onError: (e) => notification.apiError(e, 'Erro ao editar horário'),
  });

  return {
    horarios: Array.isArray(query.data) ? query.data.map(r => ({ ...r, id: r.pk })) : [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    criar: criar.mutateAsync,
    isCriando: criar.isPending,
    editar: editar.mutateAsync,
    isEditando: editar.isPending,
  };
};
