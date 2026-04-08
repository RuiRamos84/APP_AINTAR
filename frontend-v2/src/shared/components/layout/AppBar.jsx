/**
 * AppBar Component - Modern & Contextual
 * Features:
 * - Glassmorphism com borda colorida pelo módulo ativo
 * - Tabs com cor própria de cada módulo
 * - "AINTAR" brandmark em desktop
 * - Mobile: chip indicador do módulo atual (módulo switching via BottomNav)
 * - NotificationCenter sempre visível
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
  Badge,
  Tooltip,
  Divider,
  ListItemIcon,
  Switch,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
  Chip,
  alpha,
} from '@mui/material';
import { useState, useMemo } from 'react';
import { useNavbarCompact } from '@/shared/hooks/useNavbarCompact';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import LockIcon from '@mui/icons-material/Lock';
import SettingsIcon from '@mui/icons-material/Settings';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import WorkIcon from '@mui/icons-material/Work';
import { useUIStore } from '@/core/store/uiStore';
import { useAuth } from '@/core/contexts/AuthContext';
import logoSrc from '/logo.png';
import { usePermissionContext } from '@/core/contexts/PermissionContext';
import { useNavigate } from 'react-router-dom';
import { getAccessibleModules, getModuleById } from '@/core/config/moduleConfig';
import { NotificationCenter } from './NotificationCenter';

export const AppBar = ({ onMenuClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const themeMode = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const currentModule = useUIStore((state) => state.currentModule);
  const setCurrentModule = useUIStore((state) => state.setCurrentModule);

  const scrolled = useNavbarCompact();

  const { user, logoutUser, toggleVacationStatus } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissionContext();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const accessibleModules = useMemo(
    () => getAccessibleModules(hasPermission, hasAnyPermission),
    [hasPermission, hasAnyPermission]
  );

  const activeModule = useMemo(
    () => (currentModule ? getModuleById(currentModule) : null),
    [currentModule]
  );

  const handleOpenMenu = (event) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const handleNavigateToProfile = () => { handleCloseMenu(); navigate('/profile'); };
  const handleNavigateToChangePassword = () => { handleCloseMenu(); navigate('/change-password'); };
  const handleNavigateToSettings = () => { handleCloseMenu(); navigate('/settings'); };

  const handleLogout = async () => {
    handleCloseMenu();
    try { await logoutUser(); } catch (error) { console.error('[AppBar] Logout error:', error); }
  };

  const handleToggleVacation = async (e) => {
    e.stopPropagation();
    try { await toggleVacationStatus(); } catch (error) { console.error('[AppBar] Toggle vacation error:', error); }
  };

  const handleModuleChange = (_event, newModuleId) => {
    if (newModuleId !== null && newModuleId !== currentModule) {
      setCurrentModule(newModuleId);
      const module = getModuleById(newModuleId);
      if (module?.defaultRoute) navigate(module.defaultRoute);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((word) => word[0]).join('').toUpperCase().substring(0, 2);
  };

  const accentColor = activeModule?.color;

  // Dimensões que variam com o scroll
  const toolbarHeight = { xs: scrolled ? 48 : 64, sm: scrolled ? 54 : 72 };
  const logoHeight   = { xs: scrolled ? 24 : 32, sm: scrolled ? 30 : 40 };
  const tabHeight    = scrolled ? 54 : 64;
  const avatarSize   = scrolled ? 30 : 36;
  const tabFontSize  = scrolled ? '0.82rem' : '0.9rem';
  const tabIconSize  = scrolled ? 18 : 20;

  // Glass: mais opaco + sombra mais forte quando scrolled
  const glassStyles = {
    backgroundColor: alpha(theme.palette.background.paper, scrolled ? 0.92 : 0.72),
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: scrolled
      ? `0 4px 32px ${alpha(theme.palette.common.black, 0.14)}, inset 0 -2px 0 ${alpha(accentColor || theme.palette.primary.main, 0.35)}`
      : `0 2px 24px ${alpha(theme.palette.common.black, 0.08)}`,
    transition: 'box-shadow 0.35s ease, background-color 0.35s ease',
  };

  return (
    <MuiAppBar
      position="fixed"
      elevation={0}
      sx={{
        width: '100%',
        zIndex: (t) => t.zIndex.drawer + 1,
        ...glassStyles,
        color: theme.palette.text.primary,
      }}
    >
      <Toolbar sx={{
        minHeight: toolbarHeight,
        px: { xs: 1.5, sm: 3 },
        gap: 1,
        transition: 'min-height 0.35s ease',
      }}>

        {/* Mobile: hamburger quando há módulo ativo */}
        {isMobile && currentModule && (
          <IconButton color="inherit" edge="start" onClick={onMenuClick} sx={{ flexShrink: 0 }}>
            <MenuIcon />
          </IconButton>
        )}

        {/* Logo */}
        <Tooltip title="Ir para Home">
          <IconButton
            onClick={() => navigate('/home')}
            sx={{ p: 0.5, flexShrink: 0, '&:hover': { transform: 'scale(1.05)' } }}
          >
            <Box
              component="img"
              src={logoSrc}
              alt="AINTAR"
              sx={{ height: logoHeight, width: 'auto', transition: 'height 0.35s ease' }}
            />
          </IconButton>
        </Tooltip>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Desktop/Tablet: tabs de módulos */}
        {!isMobile && accessibleModules.length > 0 && (
          <Tabs
            value={currentModule || false}
            onChange={handleModuleChange}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{
              style: {
                backgroundColor: accentColor || theme.palette.primary.main,
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
            sx={{
              minHeight: tabHeight,
              mr: 2,
              transition: 'min-height 0.35s ease',
              '& .MuiTab-root': {
                minHeight: tabHeight,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: tabFontSize,
                minWidth: { sm: 60, md: 100 },
                px: { sm: 1.5, md: 2 },
                color: theme.palette.text.secondary,
                transition: 'min-height 0.35s ease, font-size 0.35s ease, color 0.2s',
              },
            }}
          >
            {accessibleModules.map((module) => (
              <Tab
                key={module.id}
                value={module.id}
                sx={{
                  '&.Mui-selected': { color: module.color, fontWeight: 600 },
                  '&:hover': { color: module.color, backgroundColor: alpha(module.color, 0.06) },
                }}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <module.icon sx={{ fontSize: tabIconSize, transition: 'font-size 0.35s ease' }} />
                    {isDesktop && <span>{module.label}</span>}
                  </Box>
                }
              />
            ))}
          </Tabs>
        )}

        {/* Mobile: chip indicador do módulo atual */}
        {isMobile && activeModule && (
          <Chip
            icon={
              <activeModule.icon
                sx={{ fontSize: '18px !important', color: `${activeModule.color} !important` }}
              />
            }
            label={activeModule.label}
            size="small"
            sx={{
              backgroundColor: alpha(activeModule.color, 0.12),
              color: activeModule.color,
              fontWeight: 600,
              fontSize: '0.78rem',
              border: `1px solid ${alpha(activeModule.color, 0.3)}`,
              mr: 1,
            }}
          />
        )}

        {/* Notificações */}
        <NotificationCenter />

        {/* Tema — apenas desktop/tablet */}
        {!isMobile && (
          <Tooltip title={`Alternar para tema ${themeMode === 'light' ? 'escuro' : 'claro'}`}>
            <IconButton
              onClick={toggleTheme}
              sx={{
                color: theme.palette.text.secondary,
                mr: 1,
                '&:hover': { color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.1) },
              }}
            >
              {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
        )}

        {/* Avatar / menu utilizador */}
        <Tooltip title={user?.vacation ? 'Conta (de férias)' : 'Conta'}>
          <IconButton
            onClick={handleOpenMenu}
            sx={{
              p: 0.5,
              border: `2px solid ${user?.vacation ? alpha(theme.palette.warning.main, 0.5) : accentColor ? alpha(accentColor, 0.4) : alpha(theme.palette.primary.main, 0.2)}`,
              borderRadius: '50%',
              transition: 'all 0.35s ease',
              '&:hover': { borderColor: user?.vacation ? theme.palette.warning.main : accentColor || theme.palette.primary.main },
            }}
          >
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                user?.vacation
                  ? <BeachAccessIcon sx={{ fontSize: 12, color: 'warning.main', bgcolor: 'background.paper', borderRadius: '50%' }} />
                  : null
              }
            >
              <Avatar
                sx={{
                  width: avatarSize,
                  height: avatarSize,
                  bgcolor: user?.vacation ? 'warning.main' : accentColor || theme.palette.primary.main,
                  fontSize: scrolled ? '0.75rem' : '0.85rem',
                  fontWeight: 'bold',
                  transition: 'all 0.35s ease',
                }}
              >
                {getInitials(user?.user_name)}
              </Avatar>
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Menu de utilizador */}
        <Menu
          anchorEl={anchorEl}
          open={openMenu}
          onClose={handleCloseMenu}
          onClick={handleCloseMenu}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 0,
            sx: { mt: 1.5, minWidth: 220, borderRadius: 3, boxShadow: theme.shadows[10], ...glassStyles },
          }}
        >
          <Box sx={{ px: 2.5, py: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" noWrap>
              {user?.user_name}
            </Typography>
            {activeModule && (
              <Typography variant="caption" sx={{ color: activeModule.color, fontWeight: 500 }}>
                {activeModule.label}
              </Typography>
            )}
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
          <MenuItem onClick={handleNavigateToSettings} sx={{ borderRadius: 1, mx: 1 }}>
            <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
            <Typography variant="body2">Configurações</Typography>
          </MenuItem>
          <MenuItem
            onClick={handleToggleVacation}
            sx={{ borderRadius: 1, mx: 1, justifyContent: 'space-between' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ListItemIcon>
                {user?.vacation
                  ? <BeachAccessIcon fontSize="small" color="warning" />
                  : <WorkIcon fontSize="small" />}
              </ListItemIcon>
              <Typography variant="body2">{user?.vacation ? 'De Férias' : 'Disponível'}</Typography>
            </Box>
            <Switch
              checked={!!user?.vacation}
              onChange={handleToggleVacation}
              size="small"
              color="warning"
              onClick={(e) => e.stopPropagation()}
            />
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
