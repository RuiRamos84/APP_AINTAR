/**
 * Sidebar Component - Modern & Responsive
 * Features:
 * - Glassmorphism effect
 * - Smooth transitions
 * - Dynamic module filtering
 * - Collapsible state persistence
 */

import { getSidebarRoutesForModule } from '@/core/config/routeConfig';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { useSocket } from '@/core/contexts/SocketContext';
import { useUIStore } from '@/core/store/uiStore';
import { getModuleById } from '@/core/config/moduleConfig';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
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
  useMediaQuery,
  useTheme,
  Chip,
  alpha,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { hasPermission } = usePermissionContext();
  const { isConnected } = useSocket();

  const collapsed = variant === 'temporary' ? false : (collapsedProp ?? true);
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [popoverRoute, setPopoverRoute] = useState(null);
  const currentModule = useUIStore((state) => state.currentModule);

  useEffect(() => {
    if (!isMobile && collapsedProp !== undefined) {
      localStorage.setItem('sidebar_collapsed', JSON.stringify(collapsedProp));
    }
  }, [collapsedProp, isMobile]);

  const visibleRoutes = useMemo(() => {
    if (!currentModule) {
      return [];
    }
    return getSidebarRoutesForModule(currentModule, hasPermission);
  }, [currentModule, hasPermission]);

  const activeModule = useMemo(() => {
    return currentModule ? getModuleById(currentModule) : null;
  }, [currentModule]);

  const handleToggleCollapse = () => onToggleCollapse?.();

  const handleToggleSubmenu = (routeId) => {
    setOpenSubmenus(prev => ({ ...prev, [routeId]: !prev[routeId] }));
  };

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

  // Styles for Glassmorphism
  const glassStyles = {
    backgroundColor: alpha(theme.palette.background.paper, 0.8),
    backdropFilter: 'blur(12px)',
    borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
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
          minHeight: 48,
          justifyContent: collapsed ? 'center' : 'initial',
          px: collapsed ? 2.5 : 2.5, // Remove padding when collapsed to allow centering
          mx: 1, // Keep margin as requested
          borderRadius: 2, // Keep rounded corners as requested
          mb: 0.5,
          transition: 'all 0.2s ease-in-out',
          '&.Mui-selected': {
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: 'white',
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': {
              background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
            },
            '& .MuiListItemIcon-root': { color: 'white' },
          },
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            transform: 'translateX(4px)',
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
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Icon />
        </ListItemIcon>
        <ListItemText
          primary={route.text}
          primaryTypographyProps={{
            fontWeight: active ? 600 : 400,
            fontSize: '0.9rem',
            noWrap: true, // Prevent text wrapping
          }}
          sx={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto', // Collapse width
            overflow: 'hidden', // Hide overflow
            transition: 'all 0.2s',
            m: 0, // Reset margin
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
                        color: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        fontWeight: 600,
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, mr: 2 }}>
                      <SubIcon fontSize="small" sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={subRoute.text} 
                      primaryTypographyProps={{ fontSize: '0.85rem' }}
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden', pt: 2 }}>
      {activeModule && (
        <Box
          sx={{
            px: 2,
            py: 2,
            mx: 1,
            mb: 2,
            borderRadius: 3,
            backgroundColor: alpha(activeModule.color, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 1.5,
            transition: 'all 0.3s ease',
          }}
        >
          <activeModule.icon sx={{ color: activeModule.color }} />
          {!collapsed && (
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{ color: activeModule.color, textTransform: 'uppercase', letterSpacing: 1 }}
            >
              {activeModule.label}
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', px: 0.5 }}>
        <List>{visibleRoutes.map(renderMenuItem)}</List>
      </Box>

      {variant === 'permanent' && !isMobile && (
        <Box sx={{ p: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 2 }}>
            {collapsed ? (
              <Tooltip title={isConnected ? 'Online' : 'Offline'}>
                {isConnected ? <WifiIcon color="success" fontSize="small" /> : <WifiOffIcon color="error" fontSize="small" />}
              </Tooltip>
            ) : (
              <Chip
                icon={isConnected ? <WifiIcon fontSize="small" /> : <WifiOffIcon fontSize="small" />}
                label={isConnected ? 'Online' : 'Offline'}
                size="small"
                color={isConnected ? 'success' : 'default'}
                variant="outlined"
                sx={{ width: '100%' }}
              />
            )}
          </Box>
          <IconButton
            onClick={handleToggleCollapse}
            sx={{
              width: '100%',
              borderRadius: 2,
              bgcolor: alpha(theme.palette.divider, 0.05),
              '&:hover': { bgcolor: alpha(theme.palette.divider, 0.1) },
            }}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
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
            marginTop: variant === 'permanent' ? '72px' : 0, // Começa abaixo da AppBar
            height: variant === 'permanent' ? 'calc(100vh - 72px)' : '100vh',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: collapsed
                ? theme.transitions.duration.leavingScreen
                : theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        {drawerContent}
      </Drawer>
      {popoverMenu}
    </>
  );
};

export default Sidebar;
