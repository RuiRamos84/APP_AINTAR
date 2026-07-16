import { useState } from 'react';
import authService, { type LoginCredentials } from '@/services/auth/authService';
import useAuthStore from '@/features/auth/store/authStore';

const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUser = useAuthStore((s) => s.setUser);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await authService.login(credentials);
      setUser(user);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err.message ?? 'Erro ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
};

export default useLogin;
