import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import notification from '@/core/services/notification';
import {
  getPiquete, gerarEscala, confirmarPiquete,
  criarEscalaPiquete, editarEscalaPiquete,
  getPiqueteRegras, upsertPiqueteRegras,
  getOcorrencias, criarOcorrencia, editarOcorrencia,
} from '../services/rhService';

const ESCALA_KEY = (p) => ['rh-piquete', p];
const OCORR_KEY  = (p) => ['rh-ocorrencias', p];

export const usePiquete = (params = {}) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ESCALA_KEY(params),
    queryFn: () => getPiquete(params),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (query.isError) notification.error('Erro ao carregar escalas de piquete');
  }, [query.isError]);

  const invalidateEscala = () => qc.invalidateQueries({ queryKey: ['rh-piquete'] });

  const gerar = useMutation({
    mutationFn: gerarEscala,
    onSuccess: (r) => { invalidateEscala(); notification.success(`Escala gerada: ${r?.result || ''}`); },
    onError: (e) => notification.apiError(e, 'Erro ao gerar escala'),
  });

  const confirmar = useMutation({
    mutationFn: (pk) => confirmarPiquete(pk),
    onSuccess: () => { invalidateEscala(); notification.success('Piquete confirmado'); },
    onError: (e) => notification.apiError(e, 'Erro ao confirmar piquete'),
  });

  const criar = useMutation({
    mutationFn: criarEscalaPiquete,
    onSuccess: () => { invalidateEscala(); notification.success('Escala criada com sucesso'); },
    onError: (e) => notification.apiError(e, 'Erro ao criar escala'),
  });

  const editar = useMutation({
    mutationFn: ({ pk, ...data }) => editarEscalaPiquete(pk, data),
    onSuccess: () => { invalidateEscala(); notification.success('Escala atualizada com sucesso'); },
    onError: (e) => notification.apiError(e, 'Erro ao atualizar escala'),
  });

  return {
    escalas: Array.isArray(query.data) ? query.data.map(r => ({ ...r, id: r.pk })) : [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    gerar: gerar.mutateAsync,
    isGerando: gerar.isPending,
    confirmar: confirmar.mutateAsync,
    isConfirmando: confirmar.isPending,
    criar: criar.mutateAsync,
    isCriando: criar.isPending,
    editar: editar.mutateAsync,
    isEditando: editar.isPending,
  };
};

export const usePiqueteRegras = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['rh-piquete-regras'],
    queryFn: getPiqueteRegras,
    staleTime: 5 * 60 * 1000,
  });

  const save = useMutation({
    mutationFn: upsertPiqueteRegras,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh-piquete-regras'] });
      notification.success('Regras de piquete actualizadas');
    },
    onError: (e) => notification.apiError(e, 'Erro ao actualizar regras'),
  });

  return {
    regras: Array.isArray(query.data) ? query.data : [],
    isLoading: query.isLoading,
    save: save.mutateAsync,
    isSaving: save.isPending,
  };
};

export const useOcorrencias = (params = {}) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['rh-ocorrencias', params],
    queryFn: () => getOcorrencias(params),
    staleTime: 2 * 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rh-ocorrencias'] });

  const criar = useMutation({
    mutationFn: criarOcorrencia,
    onSuccess: () => { invalidate(); notification.success('Ocorrência registada'); },
    onError: (e) => notification.apiError(e, 'Erro ao registar ocorrência'),
  });

  const editar = useMutation({
    mutationFn: ({ pk, data }) => editarOcorrencia(pk, data),
    onSuccess: () => { invalidate(); notification.success('Ocorrência actualizada'); },
    onError: (e) => notification.apiError(e, 'Erro ao editar ocorrência'),
  });

  return {
    ocorrencias: Array.isArray(query.data) ? query.data.map(r => ({ ...r, id: r.pk })) : [],
    isLoading: query.isLoading,
    criar: criar.mutateAsync,
    isCriando: criar.isPending,
    editar: editar.mutateAsync,
    isEditando: editar.isPending,
  };
};
