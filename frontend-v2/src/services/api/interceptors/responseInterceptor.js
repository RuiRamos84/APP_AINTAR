/**
 * Response Interceptor
 * Interceptor para responses HTTP
 */

import { useAuthStore } from '@/core/store/authStore';
import { useUIStore } from '@/core/store/uiStore';

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

      // 1. Tratar 401 (Não autorizado) - Tentar refresh token
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Tentar refresh do token
          const refreshToken = useAuthStore.getState().refreshToken;

          if (refreshToken) {
            const response = await client.post('/auth/refresh', { refreshToken });

            const { token, refreshToken: newRefreshToken } = response;

            // Atualizar token no store
            useAuthStore.getState().setToken(token, newRefreshToken);

            // Atualizar header do request original
            originalRequest.headers.Authorization = `Bearer ${token}`;

            // Retry request original
            return client(originalRequest);
          }
        } catch (refreshError) {
          // Refresh falhou - fazer logout
          useAuthStore.getState().logout();

          // Redirecionar para login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }

          return Promise.reject(refreshError);
        }
      }

      // 2. Tratar 403 (Sem permissão)
      if (error.response?.status === 403) {
        useUIStore.getState().addNotification({
          type: 'error',
          message: 'Não tem permissão para realizar esta ação',
        });
      }

      // 3. Tratar 404 (Não encontrado)
      if (error.response?.status === 404) {
        console.warn('[API] Recurso não encontrado:', originalRequest?.url);
      }

      // 4. Tratar 500+ (Erro do servidor)
      if (error.response?.status >= 500) {
        useUIStore.getState().addNotification({
          type: 'error',
          message: 'Erro no servidor. Por favor, tente novamente mais tarde.',
        });
      }

      // 5. Tratar erro de rede (sem resposta)
      if (!error.response) {
        useUIStore.getState().addNotification({
          type: 'error',
          message: 'Erro de conexão. Verifique a sua internet.',
        });
      }

      // Log do erro
      console.error('[API Error]', {
        status: error.response?.status,
        message: error.message,
        url: originalRequest?.url,
      });

      return Promise.reject(error);
    }
  );
}
