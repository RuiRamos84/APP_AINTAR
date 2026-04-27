import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import notification from '@/core/services/notification';
import { getLookups, getColaboradoresLista } from '../services/rhService';

export const useRhLookups = () => {
  const q = useQuery({
    queryKey: ['rh-lookups'],
    queryFn: () => getLookups(),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (q.isError) notification.error('Erro ao carregar lookups RH');
  }, [q.isError]);

  return {
    lookups: q.data || {},
    isLoading: q.isLoading,
  };
};

export const useColaboradores = () => {
  const q = useQuery({
    queryKey: ['rh-colaboradores-lista'],
    queryFn: () => getColaboradoresLista(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (q.isError) notification.error('Erro ao carregar lista de colaboradores');
  }, [q.isError]);

  return {
    colaboradores: Array.isArray(q.data) ? q.data : [],
    isLoading: q.isLoading,
  };
};
