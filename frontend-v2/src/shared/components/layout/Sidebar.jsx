/**
 * Sidebar Component - Moderna e Dinâmica
 * Features:
 * - Toggle collapsed/expanded
 * - Tooltips no modo collapsed
 * - Integração com routeConfig dinâmico
 * - Persistência de estado
 * - Animações suaves
 * - Totalmente responsiva
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Divider,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getSidebarRoutes } from '@/core/config/routeConfig';
import { usePermissionContext } from '@/core/contexts/PermissionContext';

const DRAWER_WIDTH_EXPANDED = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

export const Sidebar = ({
  open,
  onClose,
  variant = 'permanent',
  collapsed: collapsedProp,
  onToggleCollapse
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { hasPermission } = usePermissionContext();

  // Estado collapsed vem das props (controlado por MainLayout)
  const collapsed = collapsedProp ?? true;

  // Persistir estado quando muda (apenas em desktop)
  useEffect(() => {
    if (!isMobile && collapsedProp !== undefined) {
      localStorage.setItem('sidebar_collapsed', JSON.stringify(collapsedProp));
    }
  }, [collapsedProp, isMobile]);

  // Obter rotas visíveis baseado em permissões (já filtradas)
  const visibleRoutes = useMemo(() => {
    return getSidebarRoutes(hasPermission);
  }, [hasPermission]);

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (variant === 'temporary') {
      onClose?.();
    }
  };

  const isActive = (path) => location.pathname === path;

  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  const renderMenuItem = (route) => {
    const active = isActive(route.path);
    const Icon = route.icon;

    const button = (
      <ListItemButton
        selected={active}
        onClick={() => handleNavigation(route.path)}
        sx={{
          minHeight: 48,
          justifyContent: collapsed ? 'center' : 'initial',
          px: 2.5,
          borderRadius: 1,
          mx: 0.5,
          mb: 0.5,
          transition: 'all 0.2s',
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '& .MuiListItemIcon-root': {
              color: 'white',
            },
          },
          '&:hover': {
            bgcolor: active ? 'primary.dark' : 'action.hover',
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            mr: collapsed ? 0 : 2,
            justifyContent: 'center',
            color: active ? 'white' : 'inherit',
            transition: 'margin 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Icon />
        </ListItemIcon>
        <ListItemText
          primary={route.text}
          sx={{
            opacity: collapsed ? 0 : 1,
            display: collapsed ? 'none' : 'block',
            transition: 'opacity 0.6s ease-in-out',
          }}
        />
      </ListItemButton>
    );

    // Tooltip apenas quando collapsed
    if (collapsed) {
      return (
        <Tooltip
          key={route.path}
          title={route.text}
          placement="right"
          arrow
        >
          <ListItem disablePadding>
            {button}
          </ListItem>
        </Tooltip>
      );
    }

    return (
      <ListItem key={route.path} disablePadding>
        {button}
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-start',
          alignItems: 'center',
          px: collapsed ? 1 : 2,
        }}
      >
        {!collapsed && (
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              fontWeight: 600,
              opacity: collapsed ? 0 : 1,
              transition: 'opacity 0.6s ease-in-out',
            }}
          >
            APP
          </Typography>
        )}
      </Toolbar>

      <Divider />

      {/* Menu Principal */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 1 }}>
        <List>
          {visibleRoutes.map(route => renderMenuItem(route))}
        </List>
      </Box>

      {/* Footer - versão/info */}
      {!collapsed && (
        <>
          <Divider />
          <Box
            sx={{
              p: 2,
              textAlign: 'center',
              opacity: collapsed ? 0 : 1,
              transition: 'opacity 0.6s ease-in-out',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              v2.0.0
            </Typography>
          </Box>
        </>
      )}

      {/* Botão Toggle - Fundo da Sidebar */}
      {variant === 'permanent' && !isMobile && (
        <>
          <Divider />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 1.5,
            }}
          >
            <Tooltip title={collapsed ? 'Expandir menu' : 'Colapsar menu'} placement="right">
              <IconButton
                onClick={handleToggleCollapse}
                sx={{
                  bgcolor: 'action.hover',
                  '&:hover': {
                    bgcolor: 'action.selected',
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
    </Box>
  );

  // Mobile drawer (temporary)
  if (variant === 'temporary') {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH_EXPANDED,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Desktop drawer (permanent)
  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: 'none', sm: 'block' },
        width: drawerWidth,
        flexShrink: 0,
        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden',
        },
      }}
      open
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
