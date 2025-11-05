/**
 * PublicNavbar Component
 * Navbar para páginas públicas (sem autenticação)
 */

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Container,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LoginIcon from '@mui/icons-material/Login';
import { useUIStore } from '@/core/store/uiStore';

export const PublicNavbar = () => {
  const navigate = useNavigate();
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  return (
    <AppBar position="static" elevation={1}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          {/* Logo/Brand */}
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/')}
          >
            APP v2
          </Typography>

          {/* Navigation Links */}
          <Box sx={{ display: 'flex', gap: 2, mr: 2 }}>
            <Button color="inherit" onClick={() => navigate('/')}>
              Início
            </Button>
            <Button color="inherit" onClick={() => navigate('/about')}>
              Sobre
            </Button>
            <Button color="inherit" onClick={() => navigate('/contact')}>
              Contacto
            </Button>
          </Box>

          {/* Theme Toggle */}
          <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 1 }}>
            {theme === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>

          {/* Login Button */}
          <Button
            variant="contained"
            color="secondary"
            startIcon={<LoginIcon />}
            onClick={() => navigate('/login')}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Entrar
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default PublicNavbar;
