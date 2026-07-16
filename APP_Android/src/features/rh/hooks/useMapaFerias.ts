import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';

export interface RegistoMapaFerias {
  pk: number;
  colaborador_nome: string;
  tt_rh_equipa_fk: number | null;
  equipa_codigo: string | null;
  equipa_nome: string | null;
  data_inicio: string;
  data_fim: string;
  ts_estado_fk: number;
  estado_descr: string;
}

export const useMapaFerias = (ano: number) => {
  const query = useQuery<RegistoMapaFerias[]>({
    queryKey: ['rh-ferias-mapa', ano],
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/ferias/mapa', { params: { ano } });
      return data;
    },
    enabled: !!ano,
    staleTime: 2 * 60 * 1000,
  });

  return { registos: query.data ?? [], isLoading: query.isLoading, error: query.error };
};
