import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsService } from '../api/documentsService';
import { toast } from 'sonner';

// Query Keys
export const documentKeys = {
  all: ['documents'],
  lists: () => [...documentKeys.all, 'list'],
  list: (filter) => [...documentKeys.lists(), filter],
  details: () => [...documentKeys.all, 'detail'],
  detail: (id) => [...documentKeys.details(), id],
  steps: (id) => [...documentKeys.detail(id), 'steps'],
  annexes: (id) => [...documentKeys.detail(id), 'annexes'],
  params: (id) => [...documentKeys.detail(id), 'params'],
  entityTypes: (entityPk) => [...documentKeys.all, 'entityTypes', entityPk],
};

/**
 * Hook to fetch documents based on access type
 * @param {string} type 'all' | 'assigned' | 'created' | 'late'
 */
export const useDocuments = (type = 'all', options = {}) => {
  return useQuery({
    queryKey: documentKeys.list(type),
    queryFn: async () => {
      switch (type) {
        case 'assigned':  return documentsService.fetchAssigned();
        case 'created':   return documentsService.fetchCreated();
        case 'late':      return documentsService.fetchLate();
        case 'all':
        default:          return documentsService.fetchAll();
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
};

/**
 * Hook to fetch single document details
 */
export const useDocumentDetails = (id) => {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => documentsService.fetchById(id),
    enabled: !!id,
    staleTime: 1000 * 30, // 30 seconds — details change rarely while viewing
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to fetch document steps
 */
export const useDocumentSteps = (id) => {
  return useQuery({
    queryKey: documentKeys.steps(id),
    queryFn: () => documentsService.fetchSteps(id),
    enabled: !!id,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to create a document
 */
export const useCreateDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => documentsService.create(formData),
    onSuccess: () => {
      toast.success('Pedido criado com sucesso');
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
    onError: (error) => {
      toast.error('Erro ao criar pedido: ' + (error.response?.data?.error || error.message));
    }
  });
};

/**
 * Hook to add a step
 */
export const useAddStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, formData }) => documentsService.addStep(id, formData),
    onSuccess: (_, variables) => {
      toast.success('Passo adicionado com sucesso');
      queryClient.invalidateQueries({ queryKey: documentKeys.steps(variables.id) });
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
    onError: (error) => {
      const backendMsg = error.response?.data?.error;
      toast.error('Erro ao adicionar ação: ' + (backendMsg || error.message));
    }
  });
};

/**
 * Hook to clear notification
 */
export const useClearNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => documentsService.clearNotification(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.setQueryData(documentKeys.detail(id), (old) => {
        if (!old) return old;
        return { ...old, notification: 0 };
      });
    },
  });
};

// ==================== NOVOS HOOKS (Fase 1) ====================

/**
 * Hook to fetch document annexes
 */
export const useDocumentAnnexes = (id) => {
  return useQuery({
    queryKey: documentKeys.annexes(id),
    queryFn: () => documentsService.fetchAnnexes(id),
    enabled: !!id,
    staleTime: 1000 * 60, // 1 minute — annexes are static once added
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to add annex to document
 * Variables: { docId: number, formData: FormData }
 */
export const useAddAnnex = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ docId: _id, formData }) => documentsService.addAnnex(formData),
    onSuccess: (_, { docId }) => {
      toast.success('Anexo adicionado com sucesso');
      if (docId) {
        queryClient.invalidateQueries({ queryKey: documentKeys.annexes(Number(docId)) });
        queryClient.invalidateQueries({ queryKey: documentKeys.detail(Number(docId)) });
      }
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
    onError: (error) => {
      toast.error('Erro ao adicionar anexo: ' + (error.response?.data?.error || error.message));
    },
  });
};

/**
 * Hook to replicate document
 */
export const useReplicateDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newType }) => documentsService.replicate(id, newType),
    onSuccess: () => {
      toast.success('Pedido replicado com sucesso');
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
    onError: (error) => {
      toast.error('Erro ao replicar pedido: ' + (error.response?.data?.error || error.message));
    },
  });
};

/**
 * Hook to fetch document params
 */
export const useDocumentParams = (id) => {
  return useQuery({
    queryKey: documentKeys.params(id),
    queryFn: () => documentsService.fetchParams(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes — params are very static
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch document types for a specific entity
 */
export const useEntityDocumentTypes = (entityPk) => {
  return useQuery({
    queryKey: documentKeys.entityTypes(entityPk),
    queryFn: () => documentsService.fetchEntityDocumentTypes(entityPk),
    enabled: !!entityPk,
  });
};

/**
 * Hook to download comprovativo
 */
export const useDownloadComprovativo = () => {
  return useMutation({
    mutationFn: (id) => documentsService.downloadComprovativo(id),
    onSuccess: (blob, id) => {
      // Criar link para download do blob
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `comprovativo_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Comprovativo descarregado');
    },
    onError: (error) => {
      toast.error('Erro ao descarregar comprovativo: ' + (error.message || 'Erro desconhecido'));
    },
  });
};
