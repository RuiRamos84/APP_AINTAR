/**
 * MainLayout Component
 * Layout principal da aplicação com AppBar e Sidebar
 * Adaptado para sidebar dinâmica (collapsed/expanded)
 */

import { useState } from 'react';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';

const DRAWER_WIDTH_EXPANDED = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

export const MainLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);

  // Estado collapsed da sidebar - partilhado entre MainLayout e Sidebar
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved ? JSON.parse(saved) : true; // Collapsed por padrão
    }
    return true;
  });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Desktop: margem ajusta-se ao estado da sidebar
  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
      <AppBar onMenuClick={handleDrawerToggle} />

      {/* Sidebar - Desktop */}
      <Sidebar
        variant="permanent"
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(prev => !prev)}
      />

      {/* Sidebar - Mobile */}
      <Sidebar
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        collapsed={true}
      />

      {/* Main Content - Acompanha movimento da sidebar */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          bgcolor: 'background.default',
          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          p: 3,
        }}
      >
        <Toolbar /> {/* Espaço para o AppBar */}
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
