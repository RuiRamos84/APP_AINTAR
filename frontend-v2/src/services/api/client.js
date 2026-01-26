/**
 * API Client
 * Instância Axios configurada
 *
 * NOTA: Os interceptors são configurados pelo AuthManager durante a inicialização
 * para evitar duplicação e garantir que o token correto é sempre usado.
 */

import axios from 'axios';
import { API_CONFIG } from '@/core/config/api.config';

/**
 * Criar instância Axios
 */
export const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers,
  withCredentials: API_CONFIG.withCredentials,
});

/**
 * IMPORTANTE: Interceptors são configurados pelo AuthManager.setupApiInterceptors()
 * Não adicionar interceptors aqui para evitar duplicação!
 */

export default apiClient;
