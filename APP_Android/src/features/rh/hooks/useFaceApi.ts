import { useCallback, useState } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import apiClient from '@/services/api/apiClient';

// O cálculo do descritor facial é feito NO SERVIDOR (endpoint
// /rh/face/descriptor → micro-serviço face-service em Node), não no
// dispositivo. Motivo: o Hermes (motor JS do React Native) não tem JIT nem
// WebAssembly, e a inferência local em CPU pura demorava 12-48 segundos por
// análise — impraticável. No servidor a mesma análise demora <1s, com os
// MESMOS modelos do frontend-v2, garantindo descritores compatíveis com os
// utilizadores já registados na versão web.
//
// A foto é reduzida para esta largura antes do envio — o detector não precisa
// de mais, e mantém o payload pequeno (~30-60 KB) mesmo em redes móveis.
const UPLOAD_WIDTH = 480;

interface DescriptorResponse {
  detected: boolean;
  descriptor: number[] | null;
  ms?: number;
}

export function useFaceApi() {
  // Já não há modelos para carregar no dispositivo — mantêm-se os campos por
  // compatibilidade com os ecrãs (FaceEnrollScreen/FaceVerifyScreen).
  const [modelsReady] = useState(true);
  const [loadError] = useState<string | null>(null);

  const ensureModels = useCallback(async (): Promise<boolean> => true, []);

  /**
   * Envia uma foto (base64 JPEG) ao backend e devolve o descritor facial de
   * 128 valores calculado pelo servidor. Devolve null se não detectar rosto.
   * Lança erro se o serviço estiver indisponível — o ecrã mostra a mensagem.
   */
  const extractDescriptorFromBase64 = useCallback(
    async (base64Jpeg: string, minConfidence = 0.8): Promise<number[] | null> => {
      const t0 = Date.now();
      try {
        const { data } = await apiClient.post<DescriptorResponse>('/rh/face/descriptor', {
          image: base64Jpeg,
          minConfidence,
        });
        console.log(
          `[useFaceApi] descritor via servidor: ${Date.now() - t0}ms (inferência ${data.ms ?? '?'}ms) · rosto: ${data.detected ? 'SIM' : 'não'}`
        );
        return data.detected && data.descriptor ? data.descriptor : null;
      } catch (err: any) {
        // Substituir o erro técnico do axios pela mensagem do servidor, para
        // os ecrãs mostrarem algo legível ("Serviço … indisponível", etc.).
        const serverMsg = err?.response?.data?.error;
        throw new Error(serverMsg || 'Sem ligação ao serviço de reconhecimento facial. Verifique a internet e tente novamente.');
      }
    },
    []
  );

  /**
   * Caminho preferido a partir da câmara: recebe o URI da foto, reduz para
   * UPLOAD_WIDTH e envia ao servidor. Apaga os ficheiros temporários no final
   * (original + reduzido).
   */
  const extractDescriptorFromPhotoUri = useCallback(
    async (uri: string, minConfidence = 0.8): Promise<number[] | null> => {
      const resized = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: UPLOAD_WIDTH } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      try {
        if (!resized.base64) return null;
        return await extractDescriptorFromBase64(resized.base64, minConfidence);
      } finally {
        await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        await FileSystem.deleteAsync(resized.uri, { idempotent: true }).catch(() => {});
      }
    },
    [extractDescriptorFromBase64]
  );

  return { modelsReady, loadError, ensureModels, extractDescriptorFromBase64, extractDescriptorFromPhotoUri };
}
