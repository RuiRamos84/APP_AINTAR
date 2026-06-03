import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/notification';
import {
  getColaboradores,
  getColaborador,
  upsertColaboradorPerfil,
  getConfigColaborador,
  upsertConfigAno,
  initConfigAno,
  initConfigAnoTodos,
} from '../services/rhService';

// ─── Lista de colaboradores (com perfil completo) ────────────────────────────
export const useGestaoColaboradores = () => {
  const query = useQuery({
    queryKey: ['rh-gestao-colaboradores'],
    queryFn: getColaboradores,
    staleTime: 5 * 60 * 1000,
  });

  return {
    colaboradores: Array.isArray(query.data) ? query.data.map(r => ({ ...r, id: r.pk })) : [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};

// ─── Perfil de um colaborador específico (inclui gps_obrigatorio) ────────────
export const useColaboradorPerfil = (userFk) => {
  const query = useQuery({
    queryKey: ['rh-colaborador-perfil', userFk],
    queryFn: () => getColaborador(userFk),
    enabled: !!userFk,
    staleTime: 5 * 60 * 1000,
  });
  return {
    perfil:    query.data || null,
    isLoading: query.isLoading,
  };
};

// ─── Config anual de um colaborador ─────────────────────────────────────────
export const useColaboradorConfig = (userFk) => {
  const query = useQuery({
    queryKey: ['rh-config', userFk],
    queryFn: () => getConfigColaborador(userFk),
    enabled: !!userFk,
    staleTime: 2 * 60 * 1000,
  });

  return {
    configs: Array.isArray(query.data) ? query.data : [],
    isLoading: query.isLoading,
  };
};

// ─── Mutações de gestão ──────────────────────────────────────────────────────
export const useGestaoActions = () => {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['rh-gestao-colaboradores'] });
    qc.invalidateQueries({ queryKey: ['rh-config'] });
  };

  const guardarPerfil = useMutation({
    mutationFn: (data) => upsertColaboradorPerfil(data),
    onSuccess: () => { invalidate(); notification.success('Perfil RH guardado'); },
    onError: (e) => notification.apiError(e, 'Erro ao guardar perfil'),
  });

  const guardarConfig = useMutation({
    mutationFn: (data) => upsertConfigAno(data),
    onSuccess: () => { invalidate(); notification.success('Configuração anual guardada'); },
    onError: (e) => notification.apiError(e, 'Erro ao guardar configuração'),
  });

  const inicializarAno = useMutation({
    mutationFn: (data) => initConfigAno(data),
    onSuccess: () => { invalidate(); notification.success('Saldo anual inicializado'); },
    onError: (e) => notification.apiError(e, 'Erro ao inicializar saldo'),
  });

  const inicializarAnoTodos = useMutation({
    mutationFn: (data) => initConfigAnoTodos(data),
    onSuccess: () => { invalidate(); notification.success('Saldo anual inicializado para todos os colaboradores'); },
    onError: (e) => notification.apiError(e, 'Erro ao inicializar saldos'),
  });

  return {
    guardarPerfil: guardarPerfil.mutateAsync,
    isGuardandoPerfil: guardarPerfil.isPending,
    guardarConfig: guardarConfig.mutateAsync,
    isGuardandoConfig: guardarConfig.isPending,
    inicializarAno: inicializarAno.mutateAsync,
    isInicializando: inicializarAno.isPending,
    inicializarAnoTodos: inicializarAnoTodos.mutateAsync,
    isInicializandoTodos: inicializarAnoTodos.isPending,
  };
};
