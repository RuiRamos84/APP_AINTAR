import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';

export interface Local {
  pk: number;
  nome: string;
  descr: string | null;
  latitude: number;
  longitude: number;
  raio_metros: number;
  ativo: boolean;
}

export interface PontoAlerta {
  pk: number;
  tb_user_fk: number;
  colaborador_nome: string;
  data: string;
  ts_registo: string;
  evento_descr: string;
  latitude: number;
  longitude: number;
  distancia_metros: number | null;
  local_nome: string | null;
  local_raio: number | null;
}

// Só leitura — o CRUD de locais é uma funcionalidade de administração, fora
// desta fase (chefia/supervisão).
export const useLocais = () => {
  const query = useQuery<Local[]>({
    queryKey: ['rh', 'locais'],
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/locais');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { locais: query.data ?? [], isLoading: query.isLoading };
};

export const usePontoAlertas = (params: { user_fk?: number; data_inicio?: string; data_fim?: string } = {}) => {
  const query = useQuery<PontoAlerta[]>({
    queryKey: ['rh', 'ponto', 'alertas', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/ponto/alertas', { params });
      return data;
    },
    staleTime: 60 * 1000,
  });

  return { alertas: query.data ?? [], isLoading: query.isLoading };
};
