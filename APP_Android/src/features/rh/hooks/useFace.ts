import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api/apiClient';

const FACE_KEYS = {
  status: (userFk?: number) => ['rh', 'face', 'status', userFk] as const,
};

export interface FaceStatus {
  enrolled: boolean;
  template_count: number;
}

export interface VerifyFaceResult {
  verified: boolean;
  score: number | null;
  error?: string;
}

export const useFaceStatus = (userFk?: number) =>
  useQuery<FaceStatus>({
    queryKey: FACE_KEYS.status(userFk),
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/face/status', { params: { user_fk: userFk } });
      return data;
    },
    enabled: !!userFk,
    staleTime: 60 * 1000,
  });

// ─── Consentimento RGPD (art.º 9.º — dado biométrico) ───────────────────────
// O backend recusa o enrolamento (403) sem consentimento explícito activo.
// Chamadas one-shot dentro do fluxo de registo — não precisam de react-query.

export interface FaceConsentStatus {
  consentido: boolean;
  versao: string | null;
  ts_consentimento: string | null;
}

export const fetchFaceConsent = async (): Promise<FaceConsentStatus> => {
  const { data } = await apiClient.get('/rh/face/consent');
  return data;
};

export const registerFaceConsent = async (versao: string): Promise<void> => {
  await apiClient.post('/rh/face/consent', { versao });
};

export const useEnrollFace = (userFk?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (descriptors: number[][]) => {
      const { data } = await apiClient.post('/rh/face/enroll', { descriptors });
      return data as { message: string; template_count: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FACE_KEYS.status(userFk) }),
  });
};

export const useVerifyFace = () =>
  useMutation({
    mutationFn: async (descriptor: number[]) => {
      const { data } = await apiClient.post('/rh/face/verify', { descriptor });
      return data as VerifyFaceResult;
    },
  });

export interface FaceUserStatus {
  user_fk: number;
  name: string;
  enrolled: boolean;
  template_count: number;
}

// Admin — lista de colaboradores com estado de reconhecimento facial.
export const useFaceUsers = () =>
  useQuery<FaceUserStatus[]>({
    queryKey: ['rh', 'face', 'users'],
    queryFn: async () => {
      const { data } = await apiClient.get('/rh/face/users');
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

export const useResetFaceAdmin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userFk: number) => apiClient.delete(`/rh/face/${userFk}/reset`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh', 'face', 'users'] });
      qc.invalidateQueries({ queryKey: ['rh', 'face', 'status'] });
    },
  });
};
