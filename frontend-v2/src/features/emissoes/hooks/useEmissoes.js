/**
 * useEmissoes / useTemplates
 * React Query hooks para o sistema de emissões
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getDocumentTypes,
  getEmissions,
  createEmission,
  updateEmission,
  deleteEmission,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  generatePDF,
  downloadPDF,
  viewPDF,
} from '../services/emissoesService';

const STALE = 3 * 60 * 1000; // 3 minutos

// ─── Tipos de Documento ───────────────────────────────────────────────────────

export const useDocumentTypes = () =>
  useQuery({
    queryKey: ['emissoes', 'types'],
    queryFn: () => getDocumentTypes(),
    staleTime: 10 * 60 * 1000, // tipos mudam raramente
    select: (res) => res?.data ?? [],
  });

// ─── Emissões ─────────────────────────────────────────────────────────────────

export const useEmissoes = (filters = {}) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['emissoes', 'list', filters],
    queryFn: () => getEmissions(filters),
    staleTime: STALE,
    select: (res) => res?.data ?? [],
  });

  const create = useMutation({
    mutationFn: createEmission,
    onSuccess: () => {
      toast.success('Emissão criada com sucesso!');
      qc.invalidateQueries({ queryKey: ['emissoes', 'list'] });
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => updateEmission(id, data),
    onSuccess: () => {
      toast.success('Emissão atualizada com sucesso!');
      qc.invalidateQueries({ queryKey: ['emissoes', 'list'] });
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: deleteEmission,
    onSuccess: () => {
      toast.success('Emissão cancelada com sucesso!');
      qc.invalidateQueries({ queryKey: ['emissoes', 'list'] });
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const genPDF = useMutation({
    mutationFn: generatePDF,
    onSuccess: () => toast.success('PDF gerado com sucesso!'),
    onError: (e) => toast.error(`Erro ao gerar PDF: ${e.message}`),
  });

  const dlPDF = useMutation({
    mutationFn: ({ id, filename }) => downloadPDF(id, filename),
    onError: (e) => toast.error(`Erro ao descarregar PDF: ${e.message}`),
  });

  const openPDF = useMutation({
    mutationFn: viewPDF,
    onError: (e) => toast.error(`Erro ao visualizar PDF: ${e.message}`),
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    create: create.mutate,
    isCreating: create.isPending,
    update: update.mutate,
    isUpdating: update.isPending,
    remove: remove.mutate,
    isRemoving: remove.isPending,
    generatePDF: genPDF.mutate,
    isGenerating: genPDF.isPending,
    downloadPDF: dlPDF.mutate,
    viewPDF: openPDF.mutate,
  };
};

// ─── Templates ────────────────────────────────────────────────────────────────

export const useTemplates = (filters = {}) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['emissoes', 'templates', filters],
    queryFn: () => getTemplates(filters),
    staleTime: STALE,
    select: (res) => res?.data ?? [],
  });

  const create = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      toast.success('Template criado com sucesso!');
      qc.invalidateQueries({ queryKey: ['emissoes', 'templates'] });
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => updateTemplate(id, data),
    onSuccess: () => {
      toast.success('Template atualizado com sucesso!');
      qc.invalidateQueries({ queryKey: ['emissoes', 'templates'] });
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      toast.success('Template removido com sucesso!');
      qc.invalidateQueries({ queryKey: ['emissoes', 'templates'] });
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    create: create.mutate,
    isCreating: create.isPending,
    update: update.mutate,
    isUpdating: update.isPending,
    remove: remove.mutate,
    isRemoving: remove.isPending,
  };
};
