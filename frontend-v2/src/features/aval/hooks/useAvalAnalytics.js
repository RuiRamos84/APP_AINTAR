import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import avalService from '../services/avalService';

export function useAvalAnalytics() {
  const [rawData,  setRawData]  = useState([]);
  const [enriched, setEnriched] = useState({ global: [], users: [], me: null });
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      avalService.getAnalytics(),
      avalService.getAnalyticsEnriched(),
    ])
      .then(([analytics, enrichedRes]) => {
        setRawData(Array.isArray(analytics) ? analytics : []);
        setEnriched(enrichedRes ?? { global: [], users: [], me: null });
      })
      .catch(() => toast.error('Erro ao carregar dados de análise'))
      .finally(() => setLoading(false));
  }, []);

  const periods = useMemo(() => {
    const seen = new Set();
    const list = [];
    [...rawData]
      .sort((a, b) => a.period_pk - b.period_pk)
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
    [rawData]
  );

  return { rawData, periods, people, enriched, loading };
}
