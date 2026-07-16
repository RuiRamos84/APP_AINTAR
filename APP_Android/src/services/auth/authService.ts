import axios from 'axios';
import apiClient, { tokenStorage, resetSessionExpiredNotification } from '@/services/api/apiClient';
import ENV from '@/core/config/env';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  pk: number;
  username: string;
  name: string;
  permissions: string[];
  profile_pk: number;
  dark_mode?: boolean;
}

// Estrutura real devolvida pelo backend AINTAR (objeto flat)
interface BackendAuthResponse {
  access_token: string;
  refresh_token: string;
  user_id: number;
  user_name: string;
  permissions: string[];
  profil: number;
  dark_mode: boolean;
}

const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthUser> => {
    const { data } = await apiClient.post<BackendAuthResponse>('/auth/login', credentials);
    await tokenStorage.setTokens(data.access_token, data.refresh_token);
    await tokenStorage.setCredentials(credentials.username, credentials.password);
    const user: AuthUser = {
      pk: data.user_id,
      username: credentials.username,
      name: data.user_name,
      permissions: data.permissions ?? [],
      profile_pk: data.profil,
      dark_mode: data.dark_mode,
    };
    await tokenStorage.setUser(user);
    return user;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      await Promise.all([
        tokenStorage.clearTokens(),
        tokenStorage.clearUser(),
        tokenStorage.clearCredentials(),
      ]);
    }
  },

  // Chamada quando o utilizador confirma a renovação no alerta de sessão expirada.
  // Tenta primeiro o refresh token; só usa as credenciais guardadas como último
  // recurso, se o refresh já não for válido (ex: dispositivo sem uso prolongado).
  renewSession: async (): Promise<boolean> => {
    const refreshed = await authService.refreshToken();
    if (refreshed) {
      resetSessionExpiredNotification();
      return true;
    }

    try {
      const creds = await tokenStorage.getCredentials();
      if (!creds) return false;

      const { data } = await apiClient.post<BackendAuthResponse>('/auth/login', creds);
      await tokenStorage.setTokens(data.access_token, data.refresh_token);
      await tokenStorage.setUser({
        pk: data.user_id,
        username: creds.username,
        name: data.user_name,
        permissions: data.permissions ?? [],
        profile_pk: data.profil,
        dark_mode: data.dark_mode,
      });
      resetSessionExpiredNotification();
      return true;
    } catch {
      // Credenciais guardadas já não servem (ex: password foi alterada) — desiste
      await Promise.all([
        tokenStorage.clearTokens(),
        tokenStorage.clearUser(),
        tokenStorage.clearCredentials(),
      ]);
      return false;
    }
  },

  refreshToken: async (): Promise<string | null> => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) return null;
      const { data } = await axios.post(
        `${ENV.API_BASE_URL}/auth/refresh`,
        { current_time: Date.now() },
        { headers: { Authorization: `Bearer ${refreshToken}` } }
      );
      await tokenStorage.setTokens(data.access_token, data.refresh_token);
      return data.access_token;
    } catch (err: any) {
      const status: number | undefined = err?.response?.status;
      // Só apaga a sessão se o servidor rejeitou o token (401/403).
      // Erros de rede (sem resposta) mantêm a sessão para tentar mais tarde.
      if (status === 401 || status === 403) {
        await Promise.all([tokenStorage.clearTokens(), tokenStorage.clearUser()]);
      }
      return null;
    }
  },
};

export default authService;
