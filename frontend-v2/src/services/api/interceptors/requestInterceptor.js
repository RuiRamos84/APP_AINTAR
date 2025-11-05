/**
 * Request Interceptor
 * Interceptor para requests HTTP
 */

import { useAuthStore } from '@/core/store/authStore';

/**
 * Setup do Request Interceptor
 */
export function setupRequestInterceptor(client) {
  client.interceptors.request.use(
    (config) => {
      // 1. Adicionar token de autenticação
      const token = useAuthStore.getState().token;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 2. Adicionar timestamp para cache-busting (se necessário)
      if (config.cacheBusting && config.method === 'get') {
        config.params = {
          ...config.params,
          _t: Date.now(),
        };
      }

      // 3. Log em desenvolvimento
      if (import.meta.env.DEV) {
        console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
        });
      }

      return config;
    },
    (error) => {
      console.error('[API Request Error]', error);
      return Promise.reject(error);
    }
  );
}
