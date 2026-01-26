/**
 * AppBar Component - Modern & Glassmorphism
 * Features:
 * - Glassmorphism effect
 * - Clean navigation tabs
 * - Modern user menu
 * - Responsive design
 */

import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Divider,
  ListItemIcon,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
  Select,
  FormControl,
  alpha,
} from '@mui/material';
import { useState, useMemo } from 'react';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import LockIcon from '@mui/icons-material/Lock';
import { useUIStore } from '@/core/store/uiStore';
import { useAuth } from '@/core/contexts/AuthContext';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { useNavigate } from 'react-router-dom';
import { getAccessibleModules, getModuleById } from '@/core/config/moduleConfig';
import { NotificationCenter } from './NotificationCenter';

export const AppBar = ({ onMenuClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const themeMode = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const currentModule = useUIStore((state) => state.currentModule);
  const setCurrentModule = useUIStore((state) => state.setCurrentModule);

  const { user, logoutUser } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissionContext();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const accessibleModules = useMemo(() => {
    return getAccessibleModules(hasPermission, hasAnyPermission);
  }, [hasPermission, hasAnyPermission]);

  const handleOpenMenu = (event) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const handleNavigateToProfile = () => {
    handleCloseMenu();
    navigate('/profile');
  };

  const handleNavigateToChangePassword = () => {
    handleCloseMenu();
    navigate('/change-password');
  };

  const handleLogout = async () => {
    handleCloseMenu();
    try {
      await logoutUser();
    } catch (error) {
      console.error('[AppBar] Logout error:', error);
    }
  };

  const handleModuleChange = (_event, newModuleId) => {
    if (newModuleId !== null && newModuleId !== currentModule) {
      setCurrentModule(newModuleId);
      const module = getModuleById(newModuleId);
      if (module?.defaultRoute) navigate(module.defaultRoute);
    }
  };

  const handleMobileModuleChange = (event) => {
    const newModuleId = event.target.value;
    if (newModuleId && newModuleId !== currentModule) {
      setCurrentModule(newModuleId);
      const module = getModuleById(newModuleId);
      if (module?.defaultRoute) navigate(module.defaultRoute);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((word) => word[0]).join('').toUpperCase().substring(0, 2);
  };

  // Glassmorphism Styles
  const glassStyles = {
    backgroundColor: alpha(theme.palette.background.paper, 0.7),
    backdropFilter: 'blur(12px)',
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}`,
  };

  return (
    <MuiAppBar
      position="fixed"
      elevation={0}
      sx={{
        width: '100%',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        ...glassStyles,
        color: theme.palette.text.primary,
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 64, sm: 72 }, px: { xs: 2, sm: 3 } }}>
        {isMobile && currentModule && (
          <IconButton color="inherit" edge="start" onClick={onMenuClick} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
        )}

        {isMobile && !currentModule && (
          <IconButton color="inherit" edge="start" onClick={() => navigate('/home')} sx={{ mr: 1, p: 0.5 }}>
            <Box component="img" src="/logo.png" alt="AINTAR" sx={{ height: 32, width: 'auto' }} />
          </IconButton>
        )}

        {!isMobile && (
          <Tooltip title="Ir para Home">
            <IconButton
              onClick={() => navigate('/home')}
              sx={{
                p: 0.5,
                mr: 2,
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            >
              <Box component="img" src="/logo.png" alt="AINTAR" sx={{ height: 40, width: 'auto' }} />
            </IconButton>
          </Tooltip>
        )}

        {!isMobile && <Box sx={{ flexGrow: 1 }} />}

        {!isMobile && accessibleModules.length > 0 && (
          <Box sx={{ display: 'flex', mr: 3 }}>
            <Tabs
              value={currentModule || false}
              onChange={handleModuleChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 64,
                '& .MuiTab-root': {
                  minHeight: 64,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  minWidth: 100,
                  px: 2,
                  color: theme.palette.text.secondary,
                  transition: 'all 0.2s',
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                  },
                  '&:hover': {
                    color: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  },
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                  backgroundColor: theme.palette.primary.main,
                },
              }}
            >
              {accessibleModules.map((module) => (
                <Tab
                  key={module.id}
                  value={module.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <module.icon sx={{ fontSize: 20 }} />
                      {isDesktop && <Typography variant="inherit">{module.label}</Typography>}
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Box>
        )}

        {isMobile && accessibleModules.length > 0 && (
          <FormControl size="small" fullWidth sx={{ maxWidth: '200px' }}>
            <Select
              value={currentModule || ''}
              onChange={handleMobileModuleChange}
              displayEmpty
              variant="outlined"
              sx={{
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.background.paper, 0.5),
              }}
              renderValue={(selected) => {
                if (!selected) return <em style={{ fontSize: '0.875rem' }}>Selecionar área</em>;
                const module = getModuleById(selected);
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <module.icon sx={{ fontSize: 18, color: module.color }} />
                    <Typography variant="body2" noWrap>{module?.label}</Typography>
                  </Box>
                );
              }}
            >
              <MenuItem value="" disabled><em>Selecionar área</em></MenuItem>
              {accessibleModules.map((module) => (
                <MenuItem key={module.id} value={module.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <module.icon sx={{ fontSize: 20, color: module.color }} />
                    <Typography variant="body2">{module.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <NotificationCenter />
            <Tooltip title={`Alternar para tema ${themeMode === 'light' ? 'escuro' : 'claro'}`}>
              <IconButton
                onClick={toggleTheme}
                sx={{
                  mr: 2,
                  color: theme.palette.text.secondary,
                  '&:hover': { color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.1) },
                }}
              >
                {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Tooltip title="Conta">
          <IconButton
            onClick={handleOpenMenu}
            sx={{
              p: 0.5,
              border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              transition: 'all 0.2s',
              '&:hover': { borderColor: theme.palette.primary.main },
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: theme.palette.primary.main,
                fontSize: '0.9rem',
                fontWeight: 'bold',
              }}
            >
              {getInitials(user?.user_name)}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={openMenu}
          onClose={handleCloseMenu}
          onClick={handleCloseMenu}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1.5,
              minWidth: 220,
              borderRadius: 3,
              boxShadow: theme.shadows[10],
              ...glassStyles,
            },
          }}
        >
          <Box sx={{ px: 2.5, py: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" noWrap>
              {user?.user_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {user?.user_id}
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <MenuItem onClick={handleNavigateToProfile} sx={{ borderRadius: 1, mx: 1 }}>
            <ListItemIcon><AccountCircleIcon fontSize="small" /></ListItemIcon>
            <Typography variant="body2">Ver Perfil</Typography>
          </MenuItem>
          <MenuItem onClick={handleNavigateToChangePassword} sx={{ borderRadius: 1, mx: 1 }}>
            <ListItemIcon><LockIcon fontSize="small" /></ListItemIcon>
            <Typography variant="body2">Alterar Password</Typography>
          </MenuItem>
          <Divider sx={{ my: 1 }} />
          <MenuItem onClick={handleLogout} sx={{ borderRadius: 1, mx: 1, color: theme.palette.error.main }}>
            <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
            <Typography variant="body2">Sair</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;
