/**
 * Sidebar Component - Modern & Contextual
 * Features:
 * - Borda lateral colorida com a cor do módulo ativo
 * - Header de módulo proeminente com cor do módulo
 * - Itens ativos na cor do módulo (não genérico primary)
 * - Botão de collapse compacto e elegante
 * - Indicador de conectividade minimalista
 */

import { getSidebarRoutesForModule } from '@/core/config/routeConfig';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { useSocket } from '@/core/contexts/SocketContext';
import { useUIStore } from '@/core/store/uiStore';
import { getModuleById } from '@/core/config/moduleConfig';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavbarCompact } from '@/shared/hooks/useNavbarCompact';
import { useLocation, useNavigate } from 'react-router-dom';
import { DRAWER_WIDTH_COLLAPSED, DRAWER_WIDTH_EXPANDED } from './layoutConstants';

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
  const { hasPermission } = usePermissionContext();
  const { isConnected } = useSocket();
  const currentModule = useUIStore((state) => state.currentModule);

  const navbarH = useNavbarCompact() ? 54 : 72; // sincronizado com AppBar (sm breakpoint)

  const collapsed = variant === 'temporary' ? false : (collapsedProp ?? true);
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [popoverRoute, setPopoverRoute] = useState(null);

  useEffect(() => {
    if (variant !== 'temporary' && collapsedProp !== undefined) {
      localStorage.setItem('sidebar_collapsed', JSON.stringify(collapsedProp));
    }
  }, [collapsedProp, variant]);

  const visibleRoutes = useMemo(() => {
    if (!currentModule) return [];
    return getSidebarRoutesForModule(currentModule, hasPermission);
  }, [currentModule, hasPermission]);

  const activeModule = useMemo(
    () => (currentModule ? getModuleById(currentModule) : null),
    [currentModule]
  );

  // Cor do módulo para theming consistente
  const moduleColor = activeModule?.color || theme.palette.primary.main;

  const handleToggleCollapse = () => onToggleCollapse?.();
  const handleToggleSubmenu = (routeId) => setOpenSubmenus(prev => ({ ...prev, [routeId]: !prev[routeId] }));

  const handleOpenPopover = (event, route) => {
    setAnchorEl(event.currentTarget);
    setPopoverRoute(route);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
    setPopoverRoute(null);
  };

  const handleNavigation = (path) => {
    navigate(path);
    handleClosePopover();
    if (variant === 'temporary') onClose?.();
  };

  const isActive = (path) => location.pathname === path;
  const isSubmenuActive = (submenu) => submenu && Object.keys(submenu).some(path => location.pathname.startsWith(path));
  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  const glassStyles = {
    backgroundColor: alpha(theme.palette.background.paper, 0.72),
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: `2px 0 24px ${alpha(theme.palette.common.black, 0.06)}`,
  };

  const renderMenuItem = (route) => {
    const hasSubmenu = route.submenu && Object.keys(route.submenu).length > 0;
    const isSubmenuOpen = openSubmenus[route.id];
    const active = isActive(route.path) || isSubmenuActive(route.submenu);
    const Icon = route.icon;

    if (!Icon) return null;

    const button = (
      <ListItemButton
        selected={active}
        onClick={(event) => {
          if (hasSubmenu && !collapsed) handleToggleSubmenu(route.id);
          else if (hasSubmenu && collapsed) handleOpenPopover(event, route);
          else handleNavigation(route.path);
        }}
        sx={{
          minHeight: 44,
          justifyContent: collapsed ? 'center' : 'initial',
          px: 2.5,
          mx: 1,
          borderRadius: 2,
          mb: 0.5,
          transition: 'all 0.2s ease-in-out',
          '&.Mui-selected': {
            background: `linear-gradient(135deg, ${moduleColor}, ${alpha(moduleColor, 0.75)})`,
            color: 'white',
            boxShadow: `0 4px 12px ${alpha(moduleColor, 0.35)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${alpha(moduleColor, 0.85)}, ${moduleColor})`,
            },
            '& .MuiListItemIcon-root': { color: 'white' },
          },
          '&:not(.Mui-selected):hover': {
            backgroundColor: alpha(moduleColor, 0.08),
            transform: 'translateX(3px)',
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            mr: collapsed ? 0 : 2,
            justifyContent: 'center',
            color: active ? 'white' : theme.palette.text.secondary,
            transition: 'margin 0.2s',
          }}
        >
          <Icon />
        </ListItemIcon>
        <ListItemText
          primary={route.text}
          primaryTypographyProps={{ fontWeight: active ? 600 : 400, fontSize: '0.88rem', noWrap: true }}
          sx={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto',
            overflow: 'hidden',
            transition: 'all 0.2s',
            m: 0,
          }}
        />
        {hasSubmenu && !collapsed && (
          <Box sx={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s' }}>
            {isSubmenuOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </Box>
        )}
      </ListItemButton>
    );

    if (collapsed) {
      return (
        <Tooltip key={route.path} title={route.text} placement="right" arrow>
          <ListItem disablePadding>{button}</ListItem>
        </Tooltip>
      );
    }

    if (hasSubmenu) {
      return (
        <Box key={route.path}>
          <ListItem disablePadding>{button}</ListItem>
          <Collapse in={isSubmenuOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {Object.entries(route.submenu).map(([subPath, subRoute]) => {
                const subActive = isActive(subPath);
                const SubIcon = subRoute.icon;
                return (
                  <ListItemButton
                    key={subPath}
                    selected={subActive}
                    onClick={() => handleNavigation(subPath)}
                    sx={{
                      pl: 4,
                      mx: 1,
                      borderRadius: 2,
                      mb: 0.5,
                      '&.Mui-selected': {
                        color: moduleColor,
                        bgcolor: alpha(moduleColor, 0.1),
                        fontWeight: 600,
                      },
                      '&:not(.Mui-selected):hover': {
                        bgcolor: alpha(moduleColor, 0.06),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, mr: 2, color: subActive ? moduleColor : 'inherit' }}>
                      <SubIcon fontSize="small" sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={subRoute.text}
                      primaryTypographyProps={{ fontSize: '0.83rem' }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        </Box>
      );
    }

    return <ListItem key={route.path} disablePadding>{button}</ListItem>;
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden', pt: 1.5 }}>

      {/* Header do módulo — colorido e proeminente */}
      {activeModule && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            mx: 1,
            mb: 1.5,
            borderRadius: 2.5,
            backgroundColor: alpha(moduleColor, 0.1),
            backdropFilter: 'blur(12px) saturate(160%)',
            WebkitBackdropFilter: 'blur(12px) saturate(160%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 1.5,
            transition: 'all 0.3s ease',
          }}
        >
          <activeModule.icon sx={{ color: moduleColor, fontSize: 22, flexShrink: 0 }} />
          {!collapsed && (
            <Typography
              variant="caption"
              fontWeight={800}
              sx={{
                color: moduleColor,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                lineHeight: 1,
              }}
            >
              {activeModule.label}
            </Typography>
          )}
        </Box>
      )}

      {/* Lista de navegação */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', px: 0.5 }}>
        <List disablePadding>{visibleRoutes.map(renderMenuItem)}</List>
      </Box>

      {/* Rodapé: versão + conectividade + colapso — flexShrink:0 garante que nunca é comprimido */}
      {variant === 'permanent' && (
        <Box sx={{ p: 1.5, flexShrink: 0 }}>
          <Divider sx={{ mb: 1.5, opacity: 0.4 }} />

          {/* Linha única: estado de conexão + versão + botão colapso */}
          <Box sx={{ display: 'flex', justifyContent: collapsed ? 'center' : 'space-between', alignItems: 'center', px: 0.5 }}>
            {!collapsed && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'default' }}>
                <Tooltip title={isConnected ? 'Ligação ao servidor ativa' : 'Sem ligação ao servidor'} placement="top">
                  <Typography
                    variant="caption"
                    sx={{ color: isConnected ? 'success.main' : 'error.main', fontWeight: 500, pl: 0.5 }}
                  >
                    {isConnected ? 'Online' : 'Offline'}
                  </Typography>
                </Tooltip>
                <Typography variant="caption" sx={{ color: 'text.disabled', opacity: 0.5 }}>·</Typography>
                <Tooltip title={`Versão da aplicação · Build #${import.meta.env.VITE_APP_BUILD || '0'}`} placement="top">
                  <Typography
                    variant="caption"
                    sx={{ fontSize: '0.68rem', color: 'text.disabled', opacity: 0.6, letterSpacing: 0.3 }}
                  >
                    v{import.meta.env.VITE_APP_VERSION || '—'}
                  </Typography>
                </Tooltip>
              </Box>
            )}
            <Tooltip
              title={`${isConnected ? 'Online' : 'Offline'} · ${collapsed ? 'Expandir' : 'Recolher'}`}
              placement="right"
            >
              <IconButton
                onClick={handleToggleCollapse}
                size="small"
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: `2px solid ${isConnected ? '#4caf50' : '#f44336'}`,
                  bgcolor: alpha(isConnected ? '#4caf50' : '#f44336', 0.08),
                  color: isConnected ? 'success.main' : 'error.main',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: alpha(isConnected ? '#4caf50' : '#f44336', 0.18),
                    transform: 'scale(1.1)',
                  },
                }}
              >
                {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Box>
  );

  const popoverMenu = (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleClosePopover}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      PaperProps={{
        sx: {
          ml: 1,
          minWidth: 200,
          borderRadius: 3,
          boxShadow: theme.shadows[4],
          ...glassStyles,
        },
      }}
    >
      {popoverRoute?.submenu && Object.entries(popoverRoute.submenu).map(([subPath, subRoute]) => (
        <MenuItem
          key={subPath}
          selected={isActive(subPath)}
          onClick={() => handleNavigation(subPath)}
          sx={{ borderRadius: 1, mx: 1, my: 0.5 }}
        >
          <ListItemIcon><subRoute.icon fontSize="small" /></ListItemIcon>
          <ListItemText primary={subRoute.text} />
        </MenuItem>
      ))}
    </Menu>
  );

  return (
    <>
      <Drawer
        variant={variant}
        open={variant === 'temporary' ? open : true}
        onClose={onClose}
        sx={{
          width: variant === 'temporary' ? 'auto' : drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: variant === 'temporary' ? DRAWER_WIDTH_EXPANDED : drawerWidth,
            boxSizing: 'border-box',
            ...glassStyles,
            marginTop: variant === 'permanent' ? `${navbarH}px` : 0,
            height: variant === 'permanent' ? `calc(100vh - ${navbarH}px)` : '100vh',
            transition: [
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: collapsed
                  ? theme.transitions.duration.leavingScreen
                  : theme.transitions.duration.enteringScreen,
              }),
              'margin-top 0.35s ease',
              'height 0.35s ease',
            ].join(', '),
          },
        }}
      >
        {/* Sem Toolbar spacer: a sidebar começa com marginTop, não precisa de offset interno */}
        {drawerContent}
      </Drawer>
      {popoverMenu}
    </>
  );
};

export default Sidebar;
