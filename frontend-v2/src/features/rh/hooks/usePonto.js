import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import notification from '@/core/services/notification';
import {
  getPonto, registarPontoEvento, submeterPontoMensal,
  getPontoMensal, corrigirPonto, adicionarPontoAdmin, getFaceStatus,
  resetFaceSelf, resetFaceAdmin, getFaceUsersStatus,
  executarWorkflow,
} from '../services/rhService';

const today = () => new Date().toISOString().slice(0, 10);

export const usePontoHoje = (userFk) => {
  const query = useQuery({
    queryKey: ['rh-ponto-hoje', userFk],
    queryFn: () => getPonto({ user_fk: userFk, data_inicio: today(), data_fim: today() }),
    enabled: !!userFk,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
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

export const useFaceStatus = (userFk) => {
  const query = useQuery({
    queryKey: ['rh-face-status', userFk],
    queryFn: () => getFaceStatus(userFk),
    enabled: !!userFk,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    enrolled: query.data?.enrolled ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};

export const useResetFaceSelf = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resetFaceSelf,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-face-status'] });
      notification.success('Rosto removido. Faça um novo registo facial.');
    },
    onError: (e) => notification.apiError(e, 'Erro ao remover rosto'),
  });
};

export const useResetFaceAdmin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userFk) => resetFaceAdmin(userFk),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-face-status'] });
      qc.invalidateQueries({ queryKey: ['rh-face-users'] });
      notification.success('Rosto do colaborador removido.');
    },
    onError: (e) => notification.apiError(e, 'Erro ao remover rosto'),
  });
};

export const useFaceUsers = () => {
  const query = useQuery({
    queryKey: ['rh-face-users'],
    queryFn: getFaceUsersStatus,
    staleTime: 2 * 60 * 1000,
  });

  return {
    users: Array.isArray(query.data) ? query.data : [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};

export const usePontoActions = (userFk) => {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['rh-ponto-hoje'] });
    qc.invalidateQueries({ queryKey: ['rh-ponto-mes'] });
    qc.invalidateQueries({ queryKey: ['rh-ponto-mensal'] });
  };

  const registar = useMutation({
    mutationFn: (data) => registarPontoEvento({ user_fk: userFk, ...data }),
    onSuccess: (data) => {
      invalidate();
      if (data?.participacao_criada) {
        qc.invalidateQueries({ queryKey: ['rh-participacoes'] });
        toast.success('Regresso registado', {
          description: 'Ausência parcial criada automaticamente. Adicione a justificação legal.',
          action: { label: 'Justificar agora', onClick: () => navigate('/rh/pessoal/participacoes') },
          duration: 8000,
        });
      } else {
        notification.success('Ponto registado');
      }
    },
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

  const adicionarAdmin = useMutation({
    mutationFn: adicionarPontoAdmin,
    onSuccess: () => { invalidate(); notification.success('Evento adicionado'); },
    onError: (e) => notification.apiError(e, 'Erro ao adicionar evento'),
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
    adicionarAdmin: adicionarAdmin.mutateAsync,
    isAdicionandoAdmin: adicionarAdmin.isPending,
    workflow: workflow.mutateAsync,
    isWorkflow: workflow.isPending,
  };
};
