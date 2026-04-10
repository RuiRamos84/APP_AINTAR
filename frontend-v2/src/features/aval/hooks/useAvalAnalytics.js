import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import notification from '@/core/services/notification';
import avalService from '../services/avalService';

const STALE = 60 * 1000; // 1 minuto

export function useAvalAnalytics() {
  const analyticsQuery = useQuery({
    queryKey: ['aval-analytics'],
    queryFn: () => avalService.getAnalytics(),
    staleTime: STALE,
  });

  const enrichedQuery = useQuery({
    queryKey: ['aval-analytics-enriched'],
    queryFn: () => avalService.getAnalyticsEnriched(),
    staleTime: STALE,
  });

  useEffect(() => {
    if (analyticsQuery.isError || enrichedQuery.isError)
      notification.error('Erro ao carregar dados de análise');
  }, [analyticsQuery.isError, enrichedQuery.isError]);

  const rawData = Array.isArray(analyticsQuery.data) ? analyticsQuery.data : [];
  const enriched = enrichedQuery.data ?? { global: [], users: [], me: null };
  const loading = analyticsQuery.isFetching || enrichedQuery.isFetching;

  const periods = useMemo(() => {
    const seen = new Set();
    const list = [];
    [...rawData]
      .sort((a, b) => {
        const yearDiff = (a.year ?? 0) - (b.year ?? 0);
        if (yearDiff !== 0) return yearDiff;
        const tA = a.periodo_data ? new Date(a.periodo_data).getTime() : Infinity;
        const tB = b.periodo_data ? new Date(b.periodo_data).getTime() : Infinity;
        if (tA !== tB) return tA - tB;
        return a.period_pk - b.period_pk;
      })
      .forEach((d) => {
        if (!seen.has(d.period_pk)) {
          seen.add(d.period_pk);
          list.push({ pk: d.period_pk, label: d.periodo });
        }
      });
    return list;
  }, [rawData]);

  const people = useMemo(
    () => [...new Set(rawData.map((d) => d.colaborador))].sort(),
    [rawData],
  );

  return { rawData, periods, people, enriched, loading };
}
