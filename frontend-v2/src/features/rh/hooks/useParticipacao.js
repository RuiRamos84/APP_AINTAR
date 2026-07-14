import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/notification';
import {
  getMotivosParticipacao, getParticipacoes, getParticipacaoByPk,
  criarParticipacao, editarParticipacao, workflowParticipacao,
  uploadAnexosParticipacao, deleteAnexoParticipacao,
} from '../services/rhService';

export const PART_KEYS = {
  all:    ['rh-participacoes'],
  list:   (p) => ['rh-participacoes', 'list', p],
  detail: (pk) => ['rh-participacoes', 'detail', pk],
  motivos: ['rh-participacoes-motivos'],
};

// Invalidação partilhada — a fila de pendentes (Gestão Centralizada) mostra
// o mesmo registo; sem isto o item não desaparece da lista ao validar a
// partir de lá.
const _invalidateAll = (qc) => {
  qc.invalidateQueries({ queryKey: PART_KEYS.all });
  qc.invalidateQueries({ queryKey: ['rh-gestao-pendentes'] });
};

// ---------------------------------------------------------------------------
// Detalhe de uma participação (modal de revisão)
// ---------------------------------------------------------------------------

export const useParticipacaoDetail = (pk) => {
  const q = useQuery({
    queryKey: PART_KEYS.detail(pk),
    queryFn:  () => getParticipacaoByPk(pk),
    enabled:  !!pk,
    staleTime: 2 * 60 * 1000,
  });
  return {
    participacao: q.data ?? null,
    isLoading:    q.isLoading,
    isError:      q.isError,
  };
};

// ---------------------------------------------------------------------------
// Workflow isolado — usado pelo modal de revisão, que não precisa da lista
// completa de participações só para disparar a acção de aprovar/rejeitar.
// ---------------------------------------------------------------------------

export const useParticipacaoWorkflow = () => {
  const qc = useQueryClient();

  const workflow = useMutation({
    mutationFn: workflowParticipacao,
    onSuccess: () => { _invalidateAll(qc); notification.success('Acção executada'); },
    onError:   (e) => notification.apiError(e, 'Erro no workflow'),
  });

  return { workflow: workflow.mutateAsync, isWorkflow: workflow.isPending };
};

// ---------------------------------------------------------------------------
// Motivos legais (lookup estático)
// ---------------------------------------------------------------------------

export const useMotivosParticipacao = () => {
  const q = useQuery({
    queryKey: PART_KEYS.motivos,
    queryFn:  getMotivosParticipacao,
    staleTime: 60 * 60 * 1000,
  });
  return {
    motivos:   Array.isArray(q.data) ? q.data : [],
    isLoading: q.isLoading,
  };
};

// ---------------------------------------------------------------------------
// Lista + mutações
// ---------------------------------------------------------------------------

export const useParticipacoes = (params = {}) => {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: PART_KEYS.list(params),
    queryFn:  () => getParticipacoes(params),
    staleTime: 2 * 60 * 1000,
  });

  const invalidate = () => _invalidateAll(qc);

  const { workflow, isWorkflow } = useParticipacaoWorkflow();

  const criar = useMutation({
    mutationFn: criarParticipacao,
    onSuccess: () => { invalidate(); notification.success('Participação registada'); },
    onError:   (e) => notification.apiError(e, 'Erro ao registar participação'),
  });

  const editar = useMutation({
    mutationFn: ({ pk, data }) => editarParticipacao(pk, data),
    onSuccess: () => { invalidate(); notification.success('Participação actualizada'); },
    onError:   (e) => notification.apiError(e, 'Erro ao actualizar participação'),
  });

  const uploadAnexos = useMutation({
    mutationFn: ({ pk, files }) => {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      return uploadAnexosParticipacao(pk, fd);
    },
    onSuccess: () => { invalidate(); notification.success('Anexos adicionados'); },
    onError:   (e) => notification.apiError(e, 'Erro ao adicionar anexos'),
  });

  const removeAnexo = useMutation({
    mutationFn: ({ pk, filename }) => deleteAnexoParticipacao(pk, filename),
    onSuccess: () => { invalidate(); notification.success('Anexo removido'); },
    onError:   (e) => notification.apiError(e, 'Erro ao remover anexo'),
  });

  return {
    participacoes: Array.isArray(q.data) ? q.data.map(r => ({ ...r, id: r.pk })) : [],
    isLoading:      q.isLoading,
    isError:        q.isError,
    criar:          criar.mutateAsync,
    isCriando:      criar.isPending,
    editar:         editar.mutateAsync,
    isEditando:     editar.isPending,
    workflow,
    isWorkflow,
    uploadAnexos:   uploadAnexos.mutateAsync,
    isUploading:    uploadAnexos.isPending,
    removeAnexo:    removeAnexo.mutateAsync,
    isRemovendo:    removeAnexo.isPending,
  };
};
