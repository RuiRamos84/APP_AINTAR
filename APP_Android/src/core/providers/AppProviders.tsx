import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/shared/theme/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 2 * 60 * 1000,
    },
  },
});

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: COLORS.primarySurface,
    onPrimaryContainer: COLORS.navy,
    secondary: COLORS.secondary,
    onSecondary: '#FFFFFF',
    secondaryContainer: COLORS.secondarySurface,
    onSecondaryContainer: COLORS.navy,
    background: COLORS.background,
    onBackground: COLORS.textPrimary,
    surface: COLORS.surface,
    onSurface: COLORS.textPrimary,
    surfaceVariant: COLORS.surfaceVariant,
    onSurfaceVariant: COLORS.textSecondary,
    error: COLORS.error,
    onError: '#FFFFFF',
    errorContainer: COLORS.errorSurface,
    onErrorContainer: '#7F0000',
    outline: COLORS.border,
    outlineVariant: COLORS.divider,
  },
};

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <StatusBar style="dark" backgroundColor={COLORS.background} />
        {children}
      </PaperProvider>
    </QueryClientProvider>
  </GestureHandlerRootView>
);

export default AppProviders;
