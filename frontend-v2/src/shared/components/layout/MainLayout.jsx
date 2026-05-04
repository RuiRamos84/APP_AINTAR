/**
 * MainLayout Component
 * Layout principal da aplicação com AppBar, Sidebar e BottomNav (mobile)
 *
 * Features:
 * - Sidebar dinâmica (collapsed/expanded) em desktop
 * - Drawer temporário para mobile
 * - BottomNavigation para troca de módulo em mobile
 * - Sincronização automática de módulo com rota
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';
import { ModuleBottomNav } from './ModuleBottomNav';
import { PageTransition } from './PageTransition';
import { useUIStore } from '@/core/store/uiStore';
import { detectModuleFromPath, getAccessibleModules, getModuleById } from '@/core/config/moduleConfig';
import { NAVBAR_HEIGHT } from '@/shared/components/layout/layoutConstants';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { useAvalPending } from '@/features/aval/hooks/useAvalPending';
import { AvalPendingModal } from '@/features/aval/components/AvalPendingModal';

export const MainLayout = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentModule = useUIStore((state) => state.currentModule);
  const setCurrentModule = useUIStore((state) => state.setCurrentModule);

  const { hasPermission, hasAnyPermission } = usePermissionContext();
  const { data: pendingData, open: pendingOpen, dismiss: dismissPending } = useAvalPending();

  // Módulos acessíveis para o BottomNav mobile
  const accessibleModules = useMemo(
    () => getAccessibleModules(hasPermission, hasAnyPermission),
    [hasPermission, hasAnyPermission]
  );

  // Estado collapsed da sidebar — persiste preferência do utilizador
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved !== null ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Ref sempre actualizada com o módulo actual — evita closures stale no effect abaixo
  const currentModuleRef = useRef(currentModule);
  currentModuleRef.current = currentModule;

  // Sincroniza módulo com a rota — corre APENAS quando o pathname muda (ex: F5, URL directa, links externos).
  // Usa ref para ler currentModule sem o colocar nas deps: se o módulo foi definido explicitamente
  // pelo AppBar/BottomNav, o pathname antigo não deve revertê-lo antes da navegação completar.
  useEffect(() => {
    const detectedModule = detectModuleFromPath(location.pathname);
    if (detectedModule && detectedModule !== currentModuleRef.current) {
      setCurrentModule(detectedModule);
    } else if (!detectedModule && location.pathname === '/home') {
      setCurrentModule(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, setCurrentModule]);

  // Fechar drawer mobile quando mudar para desktop
  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

  // Handler do BottomNav mobile: troca de módulo + navega com direção
  const handleBottomNavChange = (moduleId) => {
    const fromIndex = accessibleModules.findIndex((m) => m.id === currentModule);
    const toIndex   = accessibleModules.findIndex((m) => m.id === moduleId);
    setCurrentModule(moduleId, fromIndex, toIndex);
    const module = getModuleById(moduleId);
    if (module?.defaultRoute) navigate(module.defaultRoute);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Skip link — acessibilidade: permite saltar a navbar com Tab */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          top: -999,
          left: -999,
          zIndex: 9999,
          px: 3,
          py: 1.5,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderRadius: 1,
          fontWeight: 600,
          fontSize: '0.9rem',
          textDecoration: 'none',
          '&:focus': { top: 8, left: 8 },
        }}
      >
        Ir para o conteúdo principal
      </Box>

      {/* AppBar — ocupa todo o topo */}
      <AppBar onMenuClick={handleDrawerToggle} />

      {/* Sidebar — apenas quando há módulo ativo.
          Uma única instância: permanent em desktop, temporary em mobile. */}
      {currentModule && (
        isMobile
          ? <Sidebar variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} />
          : <Sidebar variant="permanent" collapsed={collapsed} onToggleCollapse={() => setCollapsed((prev) => !prev)} />
      )}

      {/* Conteúdo principal */}
      <Box
        id="main-content"
        component="main"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          bgcolor: 'background.default',
          p: { xs: 1.5, sm: 3 },
          // Padding-bottom extra em mobile para não ficar atrás do BottomNav + safe-area iPhone
          pb: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 82px)', sm: 3 },
          overflowX: 'hidden',
          position: 'relative',
        }}
      >
        {/* Spacer com a altura total da navbar — usa constante centralizada de layoutConstants */}
        <Toolbar sx={{ minHeight: NAVBAR_HEIGHT, flexShrink: 0 }} />
        <AnimatePresence mode="popLayout">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </Box>

      {/* Modal de avaliações pendentes */}
      <AvalPendingModal open={pendingOpen} data={pendingData} onDismiss={dismissPending} />

      {/* BottomNavigation mobile — troca de módulo */}
      {isMobile && accessibleModules.length > 0 && (
        <ModuleBottomNav
          modules={accessibleModules}
          currentModule={currentModule}
          onModuleChange={handleBottomNavChange}
        />
      )}
    </Box>
  );
};

export default MainLayout;
