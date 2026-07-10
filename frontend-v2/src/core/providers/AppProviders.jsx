/**
 * App Providers
 * Wrapper centralizado com todos os providers da aplicação
 */

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { getTheme } from '@/styles/theme';
import { useUIStore } from '@/core/store/uiStore';
import { IS_PORTAL } from '@/core/config/appContext';
import { AuthProvider } from '@/core/contexts/AuthContext';
import { PermissionProvider } from '@/core/contexts/PermissionContext';
import { SocketProvider } from '@/core/contexts/SocketContext';
import { MetadataProvider } from '@/core/contexts/MetadataContext';
import { ThemedToaster } from '@/shared/components/notifications/ThemedToaster';

/**
 * Configuração do React Query Client
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minuto
      gcTime: 5 * 60 * 1000, // 5 minutos (cache time)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      // Erros de negócio (4xx) nunca se resolvem ao repetir — só faz sentido
      // reexecutar em falhas transitórias (rede, 5xx). Sem isto, qualquer
      // conflito/validação falhada (ex.: reserva sobreposta, 409) era
      // automaticamente reenviado pelo React Query, duplicando o pedido e o
      // log no servidor sem qualquer ação do utilizador.
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
      onError: (error) => {
        console.error('[Mutation Error]', error);
      },
    },
  },
});

/**
 * Theme Provider com modo claro/escuro
 */
function AppThemeProvider({ children }) {
  const theme = useUIStore((state) => state.theme);
  const muiTheme = getTheme(theme);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <ThemedToaster />
      {children}
    </ThemeProvider>
  );
}

/**
 * Provider centralizado da aplicação
 */
export function AppProviders({ children }) {
  return (
    <BrowserRouter basename={import.meta.env.PROD && !IS_PORTAL ? '/v2' : '/'}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MetadataProvider>
            <PermissionProvider>
              <SocketProvider>
                <AppThemeProvider>
                  {children}

                </AppThemeProvider>
              </SocketProvider>
            </PermissionProvider>
          </MetadataProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

