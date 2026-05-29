import { useQuery } from '@tanstack/react-query';
import { getStockTypes, getUnits, getStockItems } from '../services/stockService';

export const STOCK_META_KEYS = {
  types: ['stock', 'types'],
  units: ['stock', 'units'],
  items: ['stock', 'items'],
};

export const useStockTypes = () => {
  const q = useQuery({
    queryKey: STOCK_META_KEYS.types,
    queryFn: async () => {
      const res = await getStockTypes();
      return res?.types ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
  return { types: q.data ?? [], isLoading: q.isLoading };
};

export const useUnits = () => {
  const q = useQuery({
    queryKey: STOCK_META_KEYS.units,
    queryFn: async () => {
      const res = await getUnits();
      return res?.units ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
  return { units: q.data ?? [], isLoading: q.isLoading };
};

export const useStockItems = () => {
  const q = useQuery({
    queryKey: STOCK_META_KEYS.items,
    queryFn: async () => {
      const res = await getStockItems();
      return res?.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  return { items: q.data ?? [], isLoading: q.isLoading, isError: q.isError };
};
