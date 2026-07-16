import axios, { InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import ENV from '@/core/config/env';

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  CREDENTIALS: 'auth_credentials',
};

export interface StoredCredentials {
  username: string;
  password: string;
}

export const tokenStorage = {
  getAccessToken: () => SecureStore.getItemAsync(KEYS.ACCESS_TOKEN),
  getRefreshToken: () => SecureStore.getItemAsync(KEYS.REFRESH_TOKEN),
  setTokens: (access: string, refresh: string) =>
    Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, access),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refresh),
    ]),
  clearTokens: () =>
    Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    ]),
  setUser: (user: object) =>
    SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(user)),
  getUser: async () => {
    const raw = await SecureStore.getItemAsync(KEYS.USER_DATA);
    return raw ? JSON.parse(raw) : null;
  },
  clearUser: () => SecureStore.deleteItemAsync(KEYS.USER_DATA),
  // Credenciais guardadas só para reautenticação de último recurso quando o
  // refresh token já não é válido (ex: dispositivo sem uso durante muito tempo)
  setCredentials: (username: string, password: string) =>
    SecureStore.setItemAsync(KEYS.CREDENTIALS, JSON.stringify({ username, password })),
  getCredentials: async (): Promise<StoredCredentials | null> => {
    const raw = await SecureStore.getItemAsync(KEYS.CREDENTIALS);
    return raw ? JSON.parse(raw) : null;
  },
  clearCredentials: () => SecureStore.deleteItemAsync(KEYS.CREDENTIALS),
};

// Callback para notificar o navigator quando a sessão expira definitivamente
// (sem credenciais guardadas para reautenticar, ou reautenticação falhou)
export let onAuthFailure: (() => void) | null = null;
export const setAuthFailureCallback = (cb: () => void) => {
  onAuthFailure = cb;
};

// Callback para pedir ao utilizador que confirme a renovação da sessão
// (mostrado quando o refresh falha mas há credenciais guardadas para tentar de novo)
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredCallback = (cb: () => void) => {
  onSessionExpired = cb;
};
let sessionExpiredNotified = false;
export const resetSessionExpiredNotification = () => {
  sessionExpiredNotified = false;
};

const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Anexa o JWT a cada pedido
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token!)
  );
  failedQueue = [];
};

// Interceptor de resposta: renova o access token automaticamente em caso de 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const req = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !req._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          req.headers.Authorization = `Bearer ${token}`;
          return apiClient(req);
        });
      }

      req._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) throw new Error('no_refresh_token');

        const { data } = await axios.post(
          `${ENV.API_BASE_URL}/auth/refresh`,
          { current_time: Date.now() },
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        );

        await tokenStorage.setTokens(data.access_token, data.refresh_token);
        processQueue(null, data.access_token);
        req.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(req);
      } catch (err: any) {
        processQueue(err, null);
        const status: number | undefined = err?.response?.status;
        // Só age se o servidor rejeitou o refresh token (401/403).
        // Erros de rede não devem apagar a sessão guardada.
        if (status === 401 || status === 403) {
          const creds = await tokenStorage.getCredentials();
          if (creds && onSessionExpired) {
            // Há credenciais guardadas: pede confirmação para reautenticar
            // em vez de forçar logout imediato
            if (!sessionExpiredNotified) {
              sessionExpiredNotified = true;
              onSessionExpired();
            }
          } else {
            await tokenStorage.clearTokens();
            await tokenStorage.clearUser();
            if (onAuthFailure) onAuthFailure();
          }
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
