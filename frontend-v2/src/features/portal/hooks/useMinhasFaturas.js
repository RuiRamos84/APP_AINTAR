import { useQuery } from '@tanstack/react-query';
import { portalService } from '@/services/portalService';

export const paymentKeys = {
  all: ['portal', 'payments'],
  lists: () => [...paymentKeys.all, 'list'],
  list: (filters) => [...paymentKeys.lists(), { filters }],
};

export const contractKeys = {
  all: ['portal', 'contracts'],
  lists: () => [...contractKeys.all, 'list'],
};

export const useMinhasFaturas = () => {
  return useQuery({
    queryKey: paymentKeys.lists(),
    queryFn: () => portalService.getMyPayments(),
  });
};

export const useMeusContratos = () => {
  return useQuery({
    queryKey: contractKeys.lists(),
    queryFn: () => portalService.getMyContracts(),
  });
};
