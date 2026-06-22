import { useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/notification';
import { uploadAnexosFalta, deleteAnexoFalta, downloadAnexoFalta } from '../services/rhService';

export const useFaltasAnexos = (pk) => {
  const qc = useQueryClient();

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rh-faltas'] });

  const upload = useMutation({
    mutationFn: (formData) => uploadAnexosFalta(pk, formData),
    onSuccess: (res) => {
      invalidate();
      const { adicionados = [], erros = [] } = res || {};
      if (adicionados.length) notification.success(`${adicionados.length} ficheiro(s) carregado(s)`);
      if (erros.length) erros.forEach(e => notification.error(e));
    },
    onError: (e) => notification.apiError(e, 'Erro ao carregar anexos'),
  });

  const remove = useMutation({
    mutationFn: (filename) => deleteAnexoFalta(pk, filename),
    onSuccess: () => { invalidate(); notification.success('Anexo removido'); },
    onError: (e) => notification.apiError(e, 'Erro ao remover anexo'),
  });

  const download = async (filename, nomeOriginal) => {
    try {
      const blob = await downloadAnexoFalta(pk, filename);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = nomeOriginal || filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      notification.error('Erro ao descarregar ficheiro');
    }
  };

  return {
    upload:      upload.mutateAsync,
    isUploading: upload.isPending,
    remove:      remove.mutateAsync,
    isRemoving:  remove.isPending,
    download,
  };
};
