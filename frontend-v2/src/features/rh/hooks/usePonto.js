import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import notification from '@/core/services/notification';
import {
  getPonto, registarPontoEvento, submeterPontoMensal,
  getPontoMensal, corrigirPonto,
} from '../services/rhService';
import { executarWorkflow } from '../services/rhService';

const today = () => new Date().toISOString().slice(0, 10);

export const usePontoHoje = (userFk) => {
  const query = useQuery({
    queryKey: ['rh-ponto-hoje', userFk],
    queryFn: () => getPonto({ user_fk: userFk, data_inicio: today(), data_fim: today() }),
    enabled: !!userFk,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  return {
    eventosHoje: Array.isArray(query.data) ? query.data : [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};

export const usePontoMes = (userFk, ano, mes) => {
  const query = useQuery({
    queryKey: ['rh-ponto-mes', userFk, ano, mes],
    queryFn: () => {
      const mm = String(mes).padStart(2, '0');
      const lastDay = new Date(ano, mes, 0).getDate(); // dia 0 do mês seguinte = último dia do mês actual
      return getPonto({ user_fk: userFk, data_inicio: `${ano}-${mm}-01`, data_fim: `${ano}-${mm}-${lastDay}` });
    },
    enabled: !!userFk && !!ano && !!mes,
    staleTime: 2 * 60 * 1000,
  });

  return {
    registosMes: Array.isArray(query.data) ? query.data : [],
    isLoading: query.isLoading,
  };
};

export const usePontoMensal = (params = {}) => {
  const query = useQuery({
    queryKey: ['rh-ponto-mensal', params],
    queryFn: () => getPontoMensal(params),
    staleTime: 2 * 60 * 1000,
  });

  return {
    mapas: Array.isArray(query.data) ? query.data.map(r => ({ ...r, id: r.pk })) : [],
    isLoading: query.isLoading,
  };
};

export const usePontoActions = (userFk) => {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['rh-ponto-hoje'] });
    qc.invalidateQueries({ queryKey: ['rh-ponto-mes'] });
    qc.invalidateQueries({ queryKey: ['rh-ponto-mensal'] });
  };

  const registar = useMutation({
    mutationFn: (data) => registarPontoEvento({ user_fk: userFk, ...data }),
    onSuccess: () => { invalidate(); notification.success('Ponto registado'); },
    onError: (e) => notification.apiError(e, 'Erro ao registar ponto'),
  });

  const submeter = useMutation({
    mutationFn: ({ ano, mes, notas }) => submeterPontoMensal({ user_fk: userFk, ano, mes, notas }),
    onSuccess: () => { invalidate(); notification.success('Mapa mensal submetido'); },
    onError: (e) => notification.apiError(e, 'Erro ao submeter mapa'),
  });

  const corrigir = useMutation({
    mutationFn: ({ pk, data }) => corrigirPonto(pk, data),
    onSuccess: () => { invalidate(); notification.success('Registo corrigido'); },
    onError: (e) => notification.apiError(e, 'Erro ao corrigir registo'),
  });

  const workflow = useMutation({
    mutationFn: (data) => executarWorkflow({ tipo_ref: 'ponto', ...data }),
    onSuccess: () => { invalidate(); notification.success('Workflow executado'); },
    onError: (e) => notification.apiError(e, 'Erro no workflow'),
  });

  return {
    registar: registar.mutateAsync,
    isRegistando: registar.isPending,
    submeter: submeter.mutateAsync,
    isSubmetendo: submeter.isPending,
    corrigir: corrigir.mutateAsync,
    isCorrigindo: corrigir.isPending,
    workflow: workflow.mutateAsync,
    isWorkflow: workflow.isPending,
  };
};
