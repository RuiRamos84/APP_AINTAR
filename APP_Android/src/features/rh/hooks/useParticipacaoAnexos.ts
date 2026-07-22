import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { fromByteArray } from 'base64-js';
import apiClient from '@/services/api/apiClient';

export interface UploadAnexosResult {
  adicionados: { filename: string; nome_original: string; tamanho: number; data: string }[];
  erros: string[];
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string | null;
}

export const useParticipacaoAnexos = (pk?: number) => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['rh-participacoes'] });

  const upload = useMutation({
    // Aceita um pk explícito por chamada (para o caso "criar depois anexar",
    // onde o pk só existe depois da mutação de criação resolver) — cai para
    // o pk do hook quando omitido (ex: dentro do formulário de edição).
    mutationFn: async ({ pk: targetPk = pk, files }: { pk?: number; files: PickedFile[] }) => {
      const formData = new FormData();
      files.forEach((f) => {
        formData.append('files', { uri: f.uri, name: f.name, type: f.mimeType || 'application/octet-stream' } as unknown as Blob);
      });
      const { data } = await apiClient.post<UploadAnexosResult>(`/rh/participacoes/${targetPk}/anexos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (filename: string) =>
      apiClient.delete(`/rh/participacoes/${pk}/anexos/${encodeURIComponent(filename)}`),
    onSuccess: invalidate,
  });

  const download = async (filename: string, nomeOriginal: string): Promise<void> => {
    const response = await apiClient.get(`/rh/participacoes/${pk}/anexos/${encodeURIComponent(filename)}`, {
      responseType: 'arraybuffer',
    });
    const base64 = fromByteArray(new Uint8Array(response.data));
    const localUri = `${FileSystem.cacheDirectory}${nomeOriginal || filename}`;
    await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri);
    }
  };

  return {
    upload: upload.mutateAsync,
    isUploading: upload.isPending,
    remove: remove.mutateAsync,
    isRemoving: remove.isPending,
    download,
  };
};
