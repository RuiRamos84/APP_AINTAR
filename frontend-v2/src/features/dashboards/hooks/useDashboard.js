/**
 * useDashboard
 * React Query hooks para dados de dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { getDashboardCategoryData, getDashboardViewData } from '../services/dashboardService';

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
