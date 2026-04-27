import { useQuery } from '@tanstack/react-query';
import { getLookups, getColaboradores } from '../services/rhService';

export const useRhLookups = () => {
  const q = useQuery({
    queryKey: ['rh-lookups'],
    queryFn: () => getLookups(),
    staleTime: 10 * 60 * 1000,
  });

  return {
    lookups: q.data || {},
    isLoading: q.isLoading,
  };
};

export const useColaboradores = () => {
  const q = useQuery({
    queryKey: ['rh-colaboradores'],
    queryFn: () => getColaboradores(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    colaboradores: Array.isArray(q.data) ? q.data : [],
    isLoading: q.isLoading,
  };
};
