/**
 * App Providers
 * Wrapper centralizado com todos os providers da aplicação
 */

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import { getTheme } from '@/styles/theme';
import { useUIStore } from '@/core/store/uiStore';
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
      retry: 1,
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
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PermissionProvider>
            <MetadataProvider>
              <SocketProvider>
                <AppThemeProvider>
                  {children}

                  {/* React Query DevTools apenas em desenvolvimento */}
                  {import.meta.env.DEV && (
                    <ReactQueryDevtools
                      initialIsOpen={false}
                      position="bottom-right"
                    />
                  )}
                </AppThemeProvider>
              </SocketProvider>
            </MetadataProvider>
          </PermissionProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
