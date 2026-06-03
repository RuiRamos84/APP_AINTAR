import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/notification';
import {
  getMotivosParticipacao, getParticipacoes,
  criarParticipacao, editarParticipacao, workflowParticipacao,
  uploadAnexosParticipacao,
} from '../services/rhService';

export const PART_KEYS = {
  all:    ['rh-participacoes'],
  list:   (p) => ['rh-participacoes', 'list', p],
  motivos: ['rh-participacoes-motivos'],
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

  const invalidate = () => qc.invalidateQueries({ queryKey: PART_KEYS.all });

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

  const workflow = useMutation({
    mutationFn: workflowParticipacao,
    onSuccess: () => { invalidate(); notification.success('Acção executada'); },
    onError:   (e) => notification.apiError(e, 'Erro no workflow'),
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

  return {
    participacoes: Array.isArray(q.data) ? q.data.map(r => ({ ...r, id: r.pk })) : [],
    isLoading:      q.isLoading,
    isError:        q.isError,
    criar:          criar.mutateAsync,
    isCriando:      criar.isPending,
    editar:         editar.mutateAsync,
    isEditando:     editar.isPending,
    workflow:       workflow.mutateAsync,
    isWorkflow:     workflow.isPending,
    uploadAnexos:   uploadAnexos.mutateAsync,
    isUploading:    uploadAnexos.isPending,
  };
};
