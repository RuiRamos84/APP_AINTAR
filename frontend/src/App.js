// frontend/src/App.js - VERSÃO SIMPLIFICADA E FUNCIONAL

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { CssBaseline, ThemeProvider, useMediaQuery, Box, CircularProgress } from "@mui/material";
import { BrowserRouter as Router, useLocation, useNavigate } from "react-router-dom";
import "./App.css";
import "./styles/global.css";
import "./styles/sessionAlert.css";
import { darkTheme, lightTheme } from "./styles/theme";


// === PROVIDERS ===
import ErrorBoundary from "./components/common/ErrorBoundary";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PermissionProvider } from './contexts/PermissionContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import { SocketProvider } from "./contexts/SocketContext";
import { MetaDataProvider } from "./contexts/MetaDataContext";
import { EpiProvider } from "./contexts/EpiContext";
import { ModalProvider } from "./contexts/ModalContext";

// === COMPONENTES ===
import { ThemedToaster } from "./components/common/Toaster/ThemedToaster";
import Sidebar from "./components/common/Sidebar/Sidebar";
import PublicNavbar from "./components/layout/PublicNavbar";
import AppRoutes from './components/routing/AppRoutes';

import AppModals from './components/modals/AppModals'; // NOVO
// ===== HOOKS =====
import { useAppEffects } from './hooks/useAppEffects'; // NOVO

import { SWRConfig } from 'swr';
import { swrConfig } from './pages/Operation/services/cacheService';


// Componente de fallback para o Suspense
const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 128px)' }}>
    <CircularProgress />
  </Box>
);

// ===== COMPONENTE PRINCIPAL =====

const AppContent = () => {
  const { user, isLoading, isLoggingOut } = useAuth();
  const { sidebarMode } = useSidebar();
  const isDarkMode = user ? user.dark_mode : false;
  const isTablet = useMediaQuery('(max-width: 1920px) and (min-width: 768px)');
  const isTouch = 'ontouchstart' in window;

  // Usar os hooks refatorados
  useAppEffects(user, isLoading, isLoggingOut, sidebarMode, isDarkMode);

  if (isTablet && isTouch) {
    document.body.style.touchAction = 'pan-y';
  }

  // Layout para utilizadores não autenticados
  if (!user) {
    return (
      <ThemeProvider theme={lightTheme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
          <PublicNavbar />
          <Suspense fallback={<PageLoader />}>
            <Box sx={{ mt: 8 }}>
              <AppRoutes user={user} />
            </Box>
          </Suspense>
        </Box>
        <ThemedToaster />
      </ThemeProvider>
    );
  }

  // Layout para utilizadores autenticados
  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <Sidebar />
        <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', backgroundColor: 'background.default' }}>
          <Suspense fallback={<PageLoader />}>
            <Box sx={{ p: 2.5 }}>
              <AppModals /> {/* NOVO */}
              <AppRoutes user={user} />
            </Box>
          </Suspense>
        </Box>
      </Box>
      <ThemedToaster />
    </ThemeProvider>
  );
};

// ===== APP PRINCIPAL COM PROVIDERS =====

const App = () => (
  <Router>
    <ErrorBoundary>
      <SWRConfig value={swrConfig}>
      <AuthProvider>
        <ModalProvider>
          <PermissionProvider>
            <SidebarProvider>
              <SocketProvider>
                <MetaDataProvider>
                  <EpiProvider>
                  <AppContent />
                  </EpiProvider>
                </MetaDataProvider>
              </SocketProvider>
            </SidebarProvider>
          </PermissionProvider>
        </ModalProvider>
        </AuthProvider>
        </SWRConfig>
    </ErrorBoundary>
  </Router>
);

export default App;