import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalService } from '@/services/portalService';
import { useAuth } from '@/core/contexts/AuthContext';
import notification from '@/core/services/notification';

// Query Keys para o Portal
export const portalKeys = {
  all: ['portal'],
  requests: () => [...portalKeys.all, 'my-requests'],
  details: () => [...portalKeys.all, 'detail'],
  detail: (id) => [...portalKeys.details(), id],
  timeline: (id) => [...portalKeys.detail(id), 'timeline'],
  annexes: (id) => [...portalKeys.detail(id), 'annexes'],
};

/**
 * Hook to fetch current user's requests (portal context)
 */
export const useMeusPedidos = (params = {}, options = {}) => {
  const { user } = useAuth();
  const userId = user?.user_id ?? null;

  return useQuery({
    queryKey: [...portalKeys.requests(), userId, params],
    queryFn: () => portalService.getMyRequests(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
    keepPreviousData: true, // Useful for pagination
    ...options,
  });
};

/**
 * Hook to fetch request details in portal context
 */
export const usePedidoDetails = (id) => {
  return useQuery({
    queryKey: portalKeys.detail(id),
    queryFn: () => portalService.getRequestDetail(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
};

/**
 * Hook to fetch request timeline/steps
 */
export const usePedidoTimeline = (id) => {
  return useQuery({
    queryKey: portalKeys.timeline(id),
    queryFn: () => portalService.getRequestTimeline(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to fetch request annexes
 */
export const usePedidoAnnexes = (id) => {
  return useQuery({
    queryKey: portalKeys.annexes(id),
    queryFn: () => portalService.getRequestAnnexes(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
};

/**
 * Hook to fetch request parameters
 */
export const usePedidoParameters = (id) => {
  return useQuery({
    queryKey: [...portalKeys.detail(id), 'parameters'],
    queryFn: () => portalService.getRequestParams(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
};

/**
 * Hook to fetch request payment info
 */
export const usePedidoPayments = (id) => {
  return useQuery({
    queryKey: [...portalKeys.detail(id), 'payments'],
    queryFn: () => portalService.getRequestPayments(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to download a file
 */
export const useDownloadFile = () => {
  return useMutation({
    mutationFn: ({ regnumber, filename, displayName }) => 
      portalService.downloadFile(regnumber, filename, displayName),
    onError: (error) => {
      notification.error('Erro ao descarregar ficheiro: ' + error.message);
    }
  });
};
