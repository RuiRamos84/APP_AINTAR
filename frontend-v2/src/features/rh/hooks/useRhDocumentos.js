import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/notification';
import {
  getTiposDocumento, getDocumentos, uploadDocumento,
  downloadDocumento, deleteDocumento,
} from '../services/rhService';

const KEYS = {
  tipos: ['rh-documentos-tipos'],
  list:  (p) => ['rh-documentos', p],
};

export const useTiposDocumento = () => {
  const q = useQuery({
    queryKey: KEYS.tipos,
    queryFn:  getTiposDocumento,
    staleTime: 60 * 60 * 1000,
  });
  return { tipos: Array.isArray(q.data) ? q.data : [], isLoading: q.isLoading };
};

export const useRhDocumentos = (userFk, ano) => {
  const qc = useQueryClient();
  const params = { user_fk: userFk, ano: ano || undefined };

  const q = useQuery({
    queryKey: KEYS.list(params),
    queryFn:  () => getDocumentos(params),
    enabled:  !!userFk,
    staleTime: 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rh-documentos'] });

  const upload = useMutation({
    mutationFn: ({ files, ano: anoUpload, ttTipoFk, notas, dataValidade }) => {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      if (anoUpload) fd.append('ano', anoUpload);
      fd.append('tt_tipo_fk', ttTipoFk);
      if (notas) fd.append('notas', notas);
      if (dataValidade) fd.append('data_validade', dataValidade);
      return uploadDocumento(userFk, fd);
    },
    onSuccess: (res) => {
      invalidate();
      const { adicionados = [], erros = [] } = res || {};
      if (adicionados.length) notification.success(`${adicionados.length} documento(s) carregado(s)`);
      if (erros.length) erros.forEach(e => notification.error(e));
    },
    onError: (e) => notification.apiError(e, 'Erro ao carregar documento'),
  });

  const remove = useMutation({
    mutationFn: (pk) => deleteDocumento(pk),
    onSuccess: () => { invalidate(); notification.success('Documento removido'); },
    onError:   (e) => notification.apiError(e, 'Erro ao remover documento'),
  });

  const download = async (pk, nomeOriginal) => {
    try {
      const blob = await downloadDocumento(pk);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = nomeOriginal || 'documento';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      notification.error('Erro ao descarregar ficheiro');
    }
  };

  return {
    documentos:  Array.isArray(q.data) ? q.data : [],
    isLoading:   q.isLoading,
    isError:     q.isError,
    upload:      upload.mutateAsync,
    isUploading: upload.isPending,
    remove:      remove.mutateAsync,
    isRemoving:  remove.isPending,
    download,
  };
};
