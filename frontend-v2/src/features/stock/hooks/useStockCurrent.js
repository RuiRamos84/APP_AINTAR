import { useQuery } from '@tanstack/react-query';
import { getStockCurrent } from '../services/stockService';

export const STOCK_CURRENT_KEY = ['stock', 'current'];

export const useStockCurrent = () => {
  const q = useQuery({
    queryKey: STOCK_CURRENT_KEY,
    queryFn: async () => {
      const res = await getStockCurrent();
      return (res?.current ?? []).map((r, i) => ({ ...r, id: i }));
    },
    staleTime: 2 * 60 * 1000,
  });
  return {
    current: q.data ?? [],
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
  };
};
