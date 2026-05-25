import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entitiesService } from '../api/entitiesService';

export const ENTITY_KEYS = {
  all: ['entities'],
  detail: (pk) => ['entities', pk],
  byNipc: (nipc) => ['entities', 'nipc', nipc],
};

export function useEntities() {
  return useQuery({
    queryKey: ENTITY_KEYS.all,
    queryFn: async () => {
      const res = await entitiesService.getEntities();
      const raw = res?.entities || res?.data || res;
      return Array.isArray(raw) ? raw : [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pk, data }) => entitiesService.updateEntity(pk, data),
    onSuccess: (_, { pk, data }) => {
      // Actualizar cache optimisticamente com os dados enviados
      qc.setQueryData(ENTITY_KEYS.all, (prev) => {
        if (!prev) return prev;
        return prev.map((e) => (e.pk === pk ? { ...e, ...data } : e));
      });
    },
  });
}

export function useCreateEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => entitiesService.createEntity(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENTITY_KEYS.all });
    },
  });
}
