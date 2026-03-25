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
import { detectModuleFromPath, getAccessibleModules, getModuleById } from '@/core/config/moduleConfig';
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

  // Auto-detectar e sincronizar módulo baseado na rota atual
  useEffect(() => {
    const detectedModule = detectModuleFromPath(location.pathname);
    if (detectedModule && detectedModule !== currentModule) {
      setCurrentModule(detectedModule);
    } else if (!detectedModule && location.pathname === '/home') {
      setCurrentModule(null);
    }
  }, [location.pathname, currentModule, setCurrentModule]);

  // Fechar drawer mobile quando mudar para desktop
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
          p: { xs: 2, sm: 3 },
          // Padding-bottom extra em mobile para não ficar atrás do BottomNav
          pb: { xs: '74px', sm: 3 },
          overflowX: 'hidden',
          position: 'relative',
        }}
      >
        {/* Spacer com a altura total da navbar — conteúdo nunca fica por trás */}
        <Toolbar sx={{ minHeight: { xs: 64, sm: 72 } }} />
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
