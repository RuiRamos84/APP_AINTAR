import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import avalService from '../services/avalService';

export function useAvalAnalytics() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    avalService.getAnalytics()
      .then((res) => setRawData(Array.isArray(res) ? res : []))
      .catch(() => toast.error('Erro ao carregar dados de análise'))
      .finally(() => setLoading(false));
  }, []);

  // Períodos únicos ordenados cronologicamente pelo pk
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

  // Lista de colaboradores únicos
  const people = useMemo(
    () => [...new Set(rawData.map((d) => d.colaborador))].sort(),
    [rawData]
  );

  return { rawData, periods, people, loading };
}
