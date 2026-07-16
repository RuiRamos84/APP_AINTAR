import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import useAuthStore from '@/features/auth/store/authStore';
import { tokenStorage, setAuthFailureCallback, setSessionExpiredCallback } from '@/services/api/apiClient';
import authService from '@/services/auth/authService';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import LoadingScreen from '@/shared/components/LoadingScreen';

const AppNavigator = () => {
  const { isAuthenticated, isLoading, setUser, clearUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Quando o interceptor deteta sessão expirada, redireciona para login
    setAuthFailureCallback(clearUser);

    // Quando o refresh falha mas há credenciais guardadas, pede confirmação
    // ao utilizador antes de reautenticar em segundo plano
    setSessionExpiredCallback(() => {
      Alert.alert(
        'Sessão expirada',
        'A sua sessão precisa de ser renovada para continuar a usar a aplicação.',
        [
          {
            text: 'Renovar sessão',
            onPress: async () => {
              const ok = await authService.renewSession();
              if (!ok) clearUser();
            },
          },
        ],
        { cancelable: false }
      );
    });

    const bootstrap = async () => {
      try {
        const [token, user] = await Promise.all([
          tokenStorage.getAccessToken(),
          tokenStorage.getUser(),
        ]);

        if (token && user) {
          setUser(user);
          // Refrescar token em background — se falhar o interceptor trata
          authService.refreshToken().catch(() => {});
        } else {
          clearUser();
        }
      } catch {
        clearUser();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  if (isLoading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;
