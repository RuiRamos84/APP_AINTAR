import { useState, useEffect } from 'react';
import {
  Toolbar, Typography, Button, Box, IconButton,
  Container, Menu, MenuItem, Avatar, Divider, alpha, useTheme,
} from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import { useUIStore } from '@/core/store/uiStore';
import { useAuth } from '@/core/contexts/AuthContext';
import { NotificationCenter } from '@/shared/components/layout/NotificationCenter';

export const PortalNavbar = () => {
  const navigate = useNavigate();
  const muiTheme = useTheme();
  const isLight = muiTheme.palette.mode === 'light';
  const themeMode = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const { user, logoutUser } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    setAnchorEl(null);
    setMobileOpen(false);
    await logoutUser();
    navigate('/login');
  };

  const navBg = scrolled
    ? isLight ? 'rgba(255,255,255,0.85)' : 'rgba(10,22,40,0.9)'
    : 'transparent';
  const navTextColor = isLight ? '#0A1628' : '#ffffff';

  return (
    <>
      <Box
        component={motion.header}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          backgroundColor: navBg,
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.08)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : 'none',
          transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        {/* Barra de progresso de scroll */}
        <Box
          component={motion.div}
          style={{ scaleX }}
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            bgcolor: '#29B5E8',
            transformOrigin: 'left',
            zIndex: 50,
          }}
        />

        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 }, gap: 1 }}>

            {/* Logo */}
            <Box
              onClick={() => navigate('/pedidos')}
              sx={{
                display: 'flex', alignItems: 'center', cursor: 'pointer',
                mr: 4, flexShrink: 0, transition: 'transform 0.2s',
                '&:hover': { transform: 'scale(1.02)' },
              }}
            >
              <img
                src="/logos/logo-horizontal-color.png"
                alt="AINTAR"
                style={{ height: '30px', width: 'auto' }}
              />
            </Box>

            {/* Links — Desktop */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
              {user && (
                <>
                  <Button
                    onClick={() => navigate('/pedidos')}
                    sx={{ borderRadius: 100, px: 2, fontWeight: 600, color: navTextColor, '&:hover': { bgcolor: alpha('#1B5E8E', 0.08) } }}
                  >
                    Pedidos
                  </Button>
                  <Button
                    onClick={() => navigate('/faturas')}
                    sx={{ borderRadius: 100, px: 2, fontWeight: 600, color: navTextColor, '&:hover': { bgcolor: alpha('#1B5E8E', 0.08) } }}
                  >
                    Faturas
                  </Button>
                </>
              )}
            </Box>

            {/* Acções à direita */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton onClick={toggleTheme} sx={{ color: navTextColor }}>
                {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>

              {user && <NotificationCenter />}

              {user ? (
                <>
                  <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small" sx={{ ml: 0.5 }}>
                    <Avatar
                      sx={{
                        width: 34, height: 34, bgcolor: 'primary.main',
                        fontSize: '0.85rem', fontWeight: 'bold',
                        border: '2px solid rgba(27,94,142,0.2)',
                        transition: 'border-color 0.2s, transform 0.2s',
                        '&:hover': { borderColor: '#1B5E8E', transform: 'scale(1.05)' },
                      }}
                    >
                      {(user?.name || user?.user_name)?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={menuOpen}
                    onClose={() => setAnchorEl(null)}
                    onClick={() => setAnchorEl(null)}
                    PaperProps={{
                      elevation: 0,
                      sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.12))',
                        mt: 1.5,
                        '&::before': {
                          content: '""', display: 'block', position: 'absolute',
                          top: 0, right: 14, width: 10, height: 10,
                          bgcolor: 'background.paper',
                          transform: 'translateY(-50%) rotate(45deg)', zIndex: 0,
                        },
                      },
                    }}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  >
                    <Box sx={{ px: 2.5, py: 2 }}>
                      <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'primary.main', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem', mb: 0.5 }}>
                        Sessão Ativa
                      </Typography>
                      <Typography variant="body1" fontWeight={700} noWrap sx={{ maxWidth: 200 }}>
                        {user?.name || user?.user_name || 'Cliente AINTAR'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 200 }}>
                        {user?.email || 'N/A'}
                      </Typography>
                    </Box>
                    <Divider />
                    <MenuItem onClick={() => navigate('/perfil')} sx={{ py: 1, my: 0.5, mx: 1, borderRadius: 2 }}>
                      <PersonIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                      <Typography variant="body2" fontWeight={500}>Dados do Perfil</Typography>
                    </MenuItem>
                    <MenuItem onClick={() => navigate('/alterar-password')} sx={{ py: 1, my: 0.5, mx: 1, borderRadius: 2 }}>
                      <LockIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                      <Typography variant="body2" fontWeight={500}>Alterar Password</Typography>
                    </MenuItem>
                    <Divider sx={{ my: 1 }} />
                    <MenuItem
                      onClick={handleLogout}
                      sx={{ py: 1, my: 0.5, mx: 1, borderRadius: 2, color: 'error.main', '&:hover': { bgcolor: alpha(muiTheme.palette.error.main, 0.08) } }}
                    >
                      <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
                      <Typography variant="body2" fontWeight={700}>Sair da Conta</Typography>
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => navigate('/login')}
                  sx={{ ml: 1, borderRadius: 100, px: 3, display: { xs: 'none', md: 'flex' } }}
                >
                  Entrar
                </Button>
              )}

              {/* Hambúrguer — Mobile */}
              <IconButton
                onClick={() => setMobileOpen(!mobileOpen)}
                sx={{ display: { xs: 'flex', md: 'none' }, color: navTextColor, ml: 0.5 }}
                aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              >
                {mobileOpen ? <CloseIcon /> : <MenuIcon />}
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </Box>

      {/* Menu Mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', top: 64, left: 0, right: 0, zIndex: 1099,
              backgroundColor: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            }}
          >
            <Container maxWidth="lg" sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {user ? (
                  <>
                    <Button fullWidth onClick={() => { navigate('/pedidos'); setMobileOpen(false); }}
                      sx={{ justifyContent: 'flex-start', px: 2, py: 1.5, borderRadius: 2, color: 'text.primary', fontWeight: 600 }}>
                      Pedidos
                    </Button>
                    <Button fullWidth onClick={() => { navigate('/faturas'); setMobileOpen(false); }}
                      sx={{ justifyContent: 'flex-start', px: 2, py: 1.5, borderRadius: 2, color: 'text.primary', fontWeight: 600 }}>
                      Faturas
                    </Button>
                    <Button fullWidth onClick={() => { navigate('/perfil'); setMobileOpen(false); }}
                      sx={{ justifyContent: 'flex-start', px: 2, py: 1.5, borderRadius: 2, color: 'text.primary', fontWeight: 600 }}>
                      O Meu Perfil
                    </Button>
                    <Divider sx={{ my: 1 }} />
                    <Button fullWidth variant="outlined" color="error" onClick={handleLogout}
                      sx={{ borderRadius: 2, py: 1.5, fontWeight: 700 }}>
                      Sair da Conta
                    </Button>
                  </>
                ) : (
                  <Button fullWidth variant="contained" onClick={() => { navigate('/login'); setMobileOpen(false); }}
                    sx={{ borderRadius: 2, py: 1.5, fontWeight: 700 }}>
                    Entrar
                  </Button>
                )}
              </Box>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PortalNavbar;
