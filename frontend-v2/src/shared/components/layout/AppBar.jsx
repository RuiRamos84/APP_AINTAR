/**
 * AppBar Component
 * Barra de navegação superior da aplicação
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
} from '@mui/material';
import { useState } from 'react';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import LockIcon from '@mui/icons-material/Lock';
import { useUIStore } from '@/core/store/uiStore';
import { useAuth } from '@/core/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const AppBar = ({ onMenuClick }) => {
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

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
    if (import.meta.env.DEV) {
      console.log('[AppBar] Iniciando logout...');
    }
    try {
      await logoutUser();
      if (import.meta.env.DEV) {
        console.log('[AppBar] Logout concluído com sucesso');
      }
    } catch (error) {
      console.error('[AppBar] Erro durante logout:', error);
    }
  };

  // Obter iniciais do nome do utilizador
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <MuiAppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        boxShadow: (theme) =>
          theme.palette.mode === 'light'
            ? '0 1px 3px rgba(0,0,0,0.12)'
            : '0 1px 3px rgba(0,0,0,0.5)',
      }}
    >
      <Toolbar>
        {/* Menu Button */}
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo/Title */}
        <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
          APP v2
        </Typography>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Theme Toggle */}
        <Tooltip title={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}>
          <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 1 }}>
            {theme === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Tooltip>

        {/* User Menu */}
        <Tooltip title="Conta">
          <IconButton onClick={handleOpenMenu} sx={{ p: 0 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'secondary.main',
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
            elevation: 3,
            sx: {
              minWidth: 200,
              mt: 1.5,
            },
          }}
        >
          {/* User Info */}
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              {user?.user_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {user?.user_id}
            </Typography>
          </Box>

          <Divider />

          {/* Menu Items */}
          <MenuItem onClick={handleNavigateToProfile}>
            <ListItemIcon>
              <AccountCircleIcon fontSize="small" />
            </ListItemIcon>
            Ver Perfil
          </MenuItem>

          <MenuItem onClick={handleNavigateToChangePassword}>
            <ListItemIcon>
              <LockIcon fontSize="small" />
            </ListItemIcon>
            Alterar Password
          </MenuItem>

          <Divider />

          {/* Dark Mode Toggle */}
          <MenuItem onClick={toggleTheme}>
            <ListItemIcon>
              {theme === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </ListItemIcon>
            {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
          </MenuItem>

          <Divider />

          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Sair
          </MenuItem>
        </Menu>
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;
