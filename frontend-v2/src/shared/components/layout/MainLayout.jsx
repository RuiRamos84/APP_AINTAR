/**
 * MainLayout Component
 * Layout principal da aplicação com AppBar e Sidebar
 *
 * Features:
 * - Sidebar dinâmica (collapsed/expanded)
 * - Suporte completo mobile/tablet/desktop
 * - Drawer temporário para mobile
 * - Drawer permanente para desktop
 * - Persistência de estado collapsed
 * - Transições suaves
 * - Sincronização automática de módulo com rota
 * - Sidebar apenas visível quando há módulo ativo
 */

import { useState, useEffect } from 'react';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';
import { PageTransition } from './PageTransition';
import { useUIStore } from '@/core/store/uiStore';
import { detectModuleFromPath } from '@/core/config/moduleConfig';

export const MainLayout = () => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentModule = useUIStore((state) => state.currentModule);
  const setCurrentModule = useUIStore((state) => state.setCurrentModule);

  // Metadata já é carregado globalmente pelo MetadataContext (AppProviders.jsx)

  // Estado collapsed da sidebar - partilhado entre MainLayout e Sidebar
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved ? JSON.parse(saved) : true; // Collapsed por padrão
    }
    return true;
  });

  // Auto-detectar e sincronizar módulo baseado na rota atual
  useEffect(() => {
    const detectedModule = detectModuleFromPath(location.pathname);

    if (detectedModule && detectedModule !== currentModule) {
      // Rota pertence a um módulo específico -> selecionar esse módulo
      setCurrentModule(detectedModule);
    } else if (!detectedModule && location.pathname === '/home') {
      // Na Home, limpar o módulo ativo (sidebar não deve aparecer)
      setCurrentModule(null);
    }
    // Se detectedModule é null mas currentModule existe, manter o módulo atual
    // (permite navegar para rotas globais como /profile sem perder contexto)
  }, [location.pathname, currentModule, setCurrentModule]);

  // Fechar drawer mobile quando mudar para desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar - ocupa todo o topo */}
      <AppBar onMenuClick={handleDrawerToggle} />

      {/* Sidebar - Apenas quando há módulo ativo */}
      {currentModule && (
        <>
          {/* Sidebar - Desktop */}
          <Sidebar
            variant="permanent"
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(prev => !prev)}
          />

          {/* Sidebar - Mobile (sempre expandida) */}
          <Sidebar
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
          />
        </>
      )}

      {/* Main Content - Responsivo e adaptativo */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          bgcolor: 'background.default',
          p: { xs: 2, sm: 3 },
          overflowX: 'hidden',
          position: 'relative',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, sm: 72 } }} />
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </Box>
    </Box>
  );
};

export default MainLayout;
