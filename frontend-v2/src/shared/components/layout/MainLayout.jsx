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

import { useState, useEffect, useMemo } from 'react';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';
import { ModuleBottomNav } from './ModuleBottomNav';
import { PageTransition } from './PageTransition';
import { useUIStore } from '@/core/store/uiStore';
import { getAccessibleModules, getModuleById } from '@/core/config/moduleConfig';
import { useCurrentModule } from '@/shared/hooks/useCurrentModule';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { useAvalPending } from '@/features/aval/hooks/useAvalPending';
import { AvalPendingModal } from '@/features/aval/components/AvalPendingModal';

export const MainLayout = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Módulo derivado directamente da URL — fonte de verdade única, sem race conditions
  const { moduleId: currentModule } = useCurrentModule();
  const setCurrentModule = useUIStore((state) => state.setCurrentModule);

  const { hasPermission, hasAnyPermission } = usePermissionContext();
  const { data: pendingData, open: pendingOpen, dismiss: dismissPending } = useAvalPending();

  const accessibleModules = useMemo(
    () => getAccessibleModules(hasPermission, hasAnyPermission),
    [hasPermission, hasAnyPermission]
  );

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

  // Handler do BottomNav mobile: troca de módulo + navega
  const handleBottomNavChange = (moduleId) => {
    setCurrentModule(moduleId);
    const module = getModuleById(moduleId);
    if (module?.defaultRoute) navigate(module.defaultRoute);
  };

  return (
    <Box sx={{ display: 'flex' }}>
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
        component="main"
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
        {/* Spacer com a altura total da navbar — sincronizado com NAVBAR_HEIGHT */}
        <Toolbar sx={{ minHeight: { xs: 64, sm: 72 }, flexShrink: 0 }} />
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
