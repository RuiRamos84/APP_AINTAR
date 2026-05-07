import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsService } from '@/features/documents/api/documentsService';
import { fetchMetaData } from '@/services/metadataService';
import notification from '@/core/services/notification';
import { portalKeys } from './useMeusPedidos';

/**
 * Hook to fetch available document types for the portal (based on user profile)
 */
export const usePortalDocTypes = () => {
  return useQuery({
    queryKey: ['portal', 'doc-types'],
    queryFn: async () => {
      const metadata = await fetchMetaData();
      return metadata.types || [];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Hook to submit a new request
 */
export const useSubmeterPedido = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => {
      return documentsService.create(formData);
    },
    onSuccess: (response) => {
      notification.success('Pedido submetido com sucesso!');
      queryClient.invalidateQueries({ queryKey: portalKeys.requests() });
    },
    onError: (error) => {
      const msg = error.response?.data?.error || error.message;
      notification.error('Erro ao submeter pedido: ' + msg);
    }
  });
};
