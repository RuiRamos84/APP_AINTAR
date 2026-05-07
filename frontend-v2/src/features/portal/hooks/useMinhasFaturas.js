import { useQuery } from '@tanstack/react-query';
import { portalService } from '@/services/portalService';

export const paymentKeys = {
  all: ['portal', 'payments'],
  lists: () => [...paymentKeys.all, 'list'],
  list: (filters) => [...paymentKeys.lists(), { filters }],
};

/**
 * Hook to fetch all user payments/invoices
 */
export const useMinhasFaturas = () => {
  return useQuery({
    queryKey: paymentKeys.lists(),
    queryFn: async () => {
      return portalService.getMyPayments();
    },
  });
};
