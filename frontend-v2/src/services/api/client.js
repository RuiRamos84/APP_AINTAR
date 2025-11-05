/**
 * API Client
 * Instância Axios configurada com interceptors
 */

import axios from 'axios';
import { API_CONFIG } from '@/core/config/api.config';
import { setupRequestInterceptor } from './interceptors/requestInterceptor';
import { setupResponseInterceptor } from './interceptors/responseInterceptor';

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
 * Configurar interceptors
 */
setupRequestInterceptor(apiClient);
setupResponseInterceptor(apiClient);

export default apiClient;
