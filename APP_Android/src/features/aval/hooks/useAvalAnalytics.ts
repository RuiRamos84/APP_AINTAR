import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';

const STALE = 60 * 1000;

export interface AvalRawRecord {
  period_pk: number;
  periodo_data: string | null;
  periodo: string;
  colaborador: string;
  total_avaliacoes: number;
  media_personal_colab: number;
  media_personal_rel: number;
  media_profissional: number;
  media_global: number;
  year: number;
}

export interface AvalGlobalRecord {
  periodo_data: string | null;
  periodo: string;
  total_avaliacoes: number;
  media_personal_colab: number;
  media_personal_rel: number;
  media_profissional: number;
  media_global: number;
}

export interface AvalUserRecord extends AvalRawRecord {
  rank_global: number;
  rank_colab: number;
  rank_rel: number;
  rank_prof: number;
  total_users: number;
}

export interface AvalEnriched {
  global: AvalGlobalRecord[];
  users: AvalUserRecord[];
  me: string | null;
}

export interface AvalPeriodOption {
  pk: number;
  label: string;
}

// Campos numéricos vêm do Postgres como Decimal — o SQLAlchemy/Flask por vezes
// serializa como string. Forçar Number(...) evita NaN/concatenação de strings.
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const normalizeRaw = (r: any): AvalRawRecord => ({
  period_pk: r.period_pk,
  periodo_data: r.periodo_data ?? null,
  periodo: r.periodo,
  colaborador: r.colaborador,
  total_avaliacoes: num(r.total_avaliacoes),
  media_personal_colab: num(r.media_personal_colab),
  media_personal_rel: num(r.media_personal_rel),
  media_profissional: num(r.media_profissional),
  media_global: num(r.media_global),
  year: r.year,
});

const normalizeGlobal = (r: any): AvalGlobalRecord => ({
  periodo_data: r.periodo_data ?? null,
  periodo: r.periodo,
  total_avaliacoes: num(r.total_avaliacoes),
  media_personal_colab: num(r.media_personal_colab),
  media_personal_rel: num(r.media_personal_rel),
  media_profissional: num(r.media_profissional),
  media_global: num(r.media_global),
});

const normalizeUser = (r: any): AvalUserRecord => ({
  ...normalizeRaw(r),
  rank_global: r.rank_global,
  rank_colab: r.rank_colab,
  rank_rel: r.rank_rel,
  rank_prof: r.rank_prof,
  total_users: r.total_users,
});

export const useAvalAnalytics = () => {
  const analyticsQuery = useQuery<AvalRawRecord[]>({
    queryKey: ['aval-analytics'],
    queryFn: async () => {
      const { data } = await apiClient.get('/aval/analytics');
      return (Array.isArray(data) ? data : []).map(normalizeRaw);
    },
    staleTime: STALE,
  });

  const enrichedQuery = useQuery<AvalEnriched>({
    queryKey: ['aval-analytics-enriched'],
    queryFn: async () => {
      const { data } = await apiClient.get('/aval/analytics/enriched');
      return {
        global: (data?.global ?? []).map(normalizeGlobal),
        users: (data?.users ?? []).map(normalizeUser),
        me: data?.me ?? null,
      };
    },
    staleTime: STALE,
  });

  const rawData = analyticsQuery.data ?? [];
  const enriched = enrichedQuery.data ?? { global: [], users: [], me: null };
  const loading = analyticsQuery.isFetching || enrichedQuery.isFetching;
  const hasError = analyticsQuery.isError || enrichedQuery.isError;

  // Inclui TODOS os períodos (ativos ou não) — enriched.global/users só tem os ativos
  const periods = useMemo<AvalPeriodOption[]>(() => {
    const seen = new Set<number>();
    const list: AvalPeriodOption[] = [];
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
    () => [...new Set(rawData.map((d) => d.colaborador))].sort((a, b) => a.localeCompare(b, 'pt')),
    [rawData]
  );

  return { rawData, enriched, periods, people, loading, hasError };
};
