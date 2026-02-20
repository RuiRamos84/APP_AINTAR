/**
 * Response Interceptor
 * Interceptor para responses HTTP
 */

import axios from 'axios';
import { API_CONFIG } from '@/core/config/api.config';
import { useAuthStore } from '@/core/store/authStore';
import { useUIStore } from '@/core/store/uiStore';

// Cliente dedicado para refresh (sem interceptors → evita loop infinito)
const refreshClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers,
  withCredentials: API_CONFIG.withCredentials,
});

// Mutex para evitar múltiplos refreshes simultâneos
let isRefreshing = false;
let pendingRequests = [];

function onRefreshSuccess(newToken) {
  pendingRequests.forEach((cb) => cb(newToken));
  pendingRequests = [];
}

function onRefreshFailure(err) {
  pendingRequests.forEach((cb) => cb(null));
  pendingRequests = [];
}

/**
 * Setup do Response Interceptor
 */
export function setupResponseInterceptor(client) {
  client.interceptors.response.use(
    (response) => {
      // Log em desenvolvimento
      if (import.meta.env.DEV) {
        console.log(`[API Response] ${response.config.url}`, response.data);
      }

      // Retornar apenas os dados (simplifica uso)
      return response.data;
    },
    async (error) => {
      const originalRequest = error.config;
      const status = error.response?.status;

      // 1. Tratar 401 (Token expirado) ou 419 (Sessão BD expirada) - Tentar refresh
      if ((status === 401 || status === 419) && !originalRequest._retry) {
        originalRequest._retry = true;

        const storedRefreshToken = useAuthStore.getState().refreshToken;
        if (!storedRefreshToken) {
          // Sem refresh token → logout direto
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined') window.location.href = '/login';
          return Promise.reject(error);
        }

        // Se já há um refresh em curso, esperar pelo resultado
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            pendingRequests.push((newToken) => {
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                resolve(client(originalRequest));
              } else {
                reject(error);
              }
            });
          });
        }

        isRefreshing = true;

        try {
          // Refresh: token no header, current_time no body (como o old frontend)
          const response = await refreshClient.post(
            '/auth/refresh',
            { current_time: Date.now() },
            {
              headers: { Authorization: `Bearer ${storedRefreshToken}` },
            }
          );

          const data = response.data;
          const newAccessToken = data.access_token;
          const newRefreshToken = data.refresh_token;

          if (!newAccessToken) throw new Error('Refresh não retornou access_token');

          // Atualizar store
          useAuthStore.getState().setToken(newAccessToken, newRefreshToken);

          // Desbloquear requests pendentes
          onRefreshSuccess(newAccessToken);

          // Retry request original com novo token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return client(originalRequest);
        } catch (refreshError) {
          console.error('[API] Refresh falhou:', refreshError);
          onRefreshFailure(refreshError);

          // Refresh falhou → logout
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined') window.location.href = '/login';

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // 2. Tratar 403 (Sem permissão)
      if (status === 403) {
        useUIStore.getState().addNotification({
          type: 'error',
          message: 'Não tem permissão para realizar esta ação',
        });
      }

      // 3. Tratar 413 (Ficheiro demasiado grande)
      if (status === 413) {
        const maxMB = error.response?.data?.max_size_mb || 100;
        useUIStore.getState().addNotification({
          type: 'error',
          message: `Ficheiro demasiado grande. Tamanho máximo permitido: ${maxMB}MB`,
        });
      }

      // 4. Tratar 404 (Não encontrado)
      if (status === 404) {
        console.warn('[API] Recurso não encontrado:', originalRequest?.url);
      }

      // 5. Tratar 500+ (Erro do servidor)
      if (status >= 500) {
        useUIStore.getState().addNotification({
          type: 'error',
          message: 'Erro no servidor. Por favor, tente novamente mais tarde.',
        });
      }

      // 6. Tratar erro de rede (sem resposta)
      if (!error.response) {
        useUIStore.getState().addNotification({
          type: 'error',
          message: 'Erro de conexão. Verifique a sua internet.',
        });
      }

      // Log do erro
      console.error('[API Error]', {
        status,
        message: error.message,
        url: originalRequest?.url,
      });

      return Promise.reject(error);
    }
  );
}
