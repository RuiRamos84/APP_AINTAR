/**
 * useDashboard
 * React Query hooks para dados de dashboard
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDashboardCategoryData, getDashboardViewData, getLandingData, clearDashboardCache, getMunicipalities } from '../services/dashboardService';

const STALE = 5 * 60 * 1000; // 5 minutos

export const useDashboardCategory = (category, filters = {}) =>
  useQuery({
    queryKey: ['dashboard', 'category', category, filters],
    queryFn: () => getDashboardCategoryData(category, filters),
    staleTime: STALE,
    enabled: !!category,
    select: (res) => res?.data ?? res ?? {},
  });

export const useDashboardView = (viewName, filters = {}) =>
  useQuery({
    queryKey: ['dashboard', 'view', viewName, filters],
    queryFn: () => getDashboardViewData(viewName, filters),
    staleTime: STALE,
    enabled: !!viewName,
    select: (res) => res?.data ?? res ?? [],
  });

/** Mapa pk → nome dos municípios — stale longa (dados estáticos) */
export const useMunicipalities = () =>
  useQuery({
    queryKey: ['municipalities'],
    queryFn: getMunicipalities,
    staleTime: 60 * 60 * 1000, // 1 hora — dados raramente mudam
    select: (res) => {
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      return Object.fromEntries(list.map((m) => [String(m.pk), m.value]));
    },
  });

export const useLandingData = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dashboard', 'landing'],
    queryFn: getLandingData,
    staleTime: STALE,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const forceRefetch = async () => {
    await clearDashboardCache();
    queryClient.removeQueries({ queryKey: ['dashboard', 'landing'] });
    return query.refetch();
  };

  return { ...query, forceRefetch };
};
