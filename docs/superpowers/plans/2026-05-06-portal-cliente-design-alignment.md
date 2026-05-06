# Portal Cliente — Design Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinhar visualmente o Portal do Cliente com o website AINTAR, mantendo o stack MUI v7.

**Architecture:** Seis mudanças independentes: fontes + logos, navbar com glass effect, auth layout split screen, atmosfera das páginas, footer com wave animada, e componente PortalPageHeader partilhado. Cada tarefa é autónoma e commitável separadamente.

**Tech Stack:** React 19, MUI v7, Framer Motion v12, @fontsource/plus-jakarta-sans, @fontsource/inter

---

## Ficheiros Afectados

| Acção | Caminho |
|---|---|
| Modificar | `frontend-v2/src/main.jsx` |
| Modificar | `frontend-v2/src/styles/global.css` |
| Modificar | `frontend-v2/src/shared/components/layout/PortalNavbar.jsx` |
| Modificar | `frontend-v2/src/shared/components/layout/PortalLayout.jsx` |
| Modificar | `frontend-v2/src/shared/components/layout/PortalFooter.jsx` |
| Modificar | `frontend-v2/src/core/routing/PortalRoutes.jsx` |
| Modificar | `frontend-v2/src/features/portal/pages/PortalPedidosPage.jsx` |
| Modificar | `frontend-v2/src/features/portal/pages/PortalFacturasPage.jsx` |
| Modificar | `frontend-v2/src/features/portal/pages/PortalPerfilPage.jsx` |
| Modificar | `frontend-v2/src/features/portal/pages/PortalNovoPedidoPage.jsx` |
| Modificar | `frontend-v2/src/features/portal/pages/PortalPedidoDetailPage.jsx` |
| Criar | `frontend-v2/src/shared/components/layout/PortalAuthLayout.jsx` |
| Criar | `frontend-v2/src/shared/components/layout/PortalPageHeader.jsx` |
| Copiar (assets) | `website/public/logos/` → `frontend-v2/public/logos/` |

---

## Task 1: Fontes, Assets e Imports

**Files:**
- Modify: `frontend-v2/src/main.jsx`
- Copy: `website/public/logos/` → `frontend-v2/public/logos/`

- [ ] **Step 1: Instalar pacotes de fontes**

```bash
cd frontend-v2
npm install @fontsource/plus-jakarta-sans @fontsource/inter
```

Resultado esperado: `added 2 packages` (ou similar, sem erros).

- [ ] **Step 2: Copiar logos do website para o portal**

```powershell
Copy-Item -Path "website\public\logos" -Destination "frontend-v2\public\logos" -Recurse
```

Verificar que `frontend-v2/public/logos/logo-horizontal-color.png` e `logo-horizontal-white.png` existem.

- [ ] **Step 3: Adicionar imports de fontes em main.jsx**

Substituir o conteúdo de `frontend-v2/src/main.jsx`:

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from '@/core/providers/AppProviders';
import App from './App.jsx';
import ErrorBoundary from '@/shared/components/common/ErrorBoundary';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@/styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>
);
```

- [ ] **Step 4: Verificar build**

```bash
cd frontend-v2
npm run build
```

Esperado: build sem erros. Ignorar aviso de chunk size se existir.

- [ ] **Step 5: Commit**

```bash
git add frontend-v2/src/main.jsx frontend-v2/public/logos/
git commit -m "feat(portal): instalar fontes Plus Jakarta Sans + Inter e copiar logos do website"
```

---

## Task 2: Keyframe waveSlide no CSS Global

**Files:**
- Modify: `frontend-v2/src/styles/global.css`

- [ ] **Step 1: Adicionar keyframe waveSlide ao final de global.css**

Adicionar imediatamente antes da última linha do ficheiro (após `.bg-blue-gradient { ... }`):

```css
/* ========== Wave Animation (Portal Footer) ========== */
@keyframes waveSlide {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

- [ ] **Step 2: Verificar que o keyframe está correcto**

O ficheiro `global.css` deve terminar com:

```css
.bg-blue-gradient {
  background: linear-gradient(135deg, #1B5E8E 0%, #2074AA 100%);
}

/* ========== Wave Animation (Portal Footer) ========== */
@keyframes waveSlide {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/styles/global.css
git commit -m "feat(portal): adicionar keyframe waveSlide ao CSS global"
```

---

## Task 3: PortalNavbar — Glass Effect + Scroll + Framer Motion

**Files:**
- Modify: `frontend-v2/src/shared/components/layout/PortalNavbar.jsx`

- [ ] **Step 1: Reescrever PortalNavbar.jsx**

Substituir o conteúdo completo do ficheiro por:

```jsx
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
                        transition: 'all 0.2s',
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
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend-v2 && npm run build
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/shared/components/layout/PortalNavbar.jsx
git commit -m "feat(portal): redesenhar PortalNavbar com glass effect, scroll progress e animação"
```

---

## Task 4: PortalAuthLayout — Split Screen

**Files:**
- Create: `frontend-v2/src/shared/components/layout/PortalAuthLayout.jsx`

- [ ] **Step 1: Criar o ficheiro PortalAuthLayout.jsx**

```jsx
import { Box, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || 'https://aintar.pt';

export const PortalAuthLayout = () => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>

      {/* Painel Esquerdo — Branding AINTAR (md+) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: '45%',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0A1628 0%, #1B5E8E 100%)',
          px: 8,
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Decoração — círculo sky */}
        <Box sx={{
          position: 'absolute', top: -120, right: -120,
          width: 400, height: 400, borderRadius: '50%',
          bgcolor: '#29B5E8', opacity: 0.06, filter: 'blur(80px)', pointerEvents: 'none',
        }} />
        {/* Decoração — círculo teal */}
        <Box sx={{
          position: 'absolute', bottom: -80, left: -80,
          width: 300, height: 300, borderRadius: '50%',
          bgcolor: '#2ABB9B', opacity: 0.04, filter: 'blur(80px)', pointerEvents: 'none',
        }} />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <img
            src="/logos/logo-horizontal-white.png"
            alt="AINTAR"
            style={{ height: '40px', width: 'auto', marginBottom: '48px' }}
          />
          <Typography variant="h3" sx={{ color: 'white', fontWeight: 800, lineHeight: 1.2, mb: 3 }}>
            Portal do<br />Cliente
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', maxWidth: 320, lineHeight: 1.8 }}>
            Gestão responsável dos sistemas de saneamento na região Centro.
          </Typography>
        </Box>
      </Box>

      {/* Painel Direito — Formulário */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          minHeight: '100vh',
        }}
      >
        {/* Logo mobile (só visível em xs/sm) */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', pt: 4, pb: 2 }}>
          <img
            src="/logos/logo-horizontal-color.png"
            alt="AINTAR"
            style={{ height: '28px', width: 'auto' }}
          />
        </Box>

        {/* Área do formulário */}
        <Box
          sx={{
            flex: 1, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            px: { xs: 3, sm: 6, md: 8 },
            py: 4,
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 420 }}>
            <Outlet />
          </Box>
        </Box>

        {/* Link de retorno */}
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
          <a
            href={WEBSITE_URL}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              color: '#9e9e9e', fontSize: '0.875rem', textDecoration: 'none',
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            Voltar ao website
          </a>
        </Box>
      </Box>
    </Box>
  );
};

export default PortalAuthLayout;
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend-v2 && npm run build
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/shared/components/layout/PortalAuthLayout.jsx
git commit -m "feat(portal): criar PortalAuthLayout com split screen e branding AINTAR"
```

---

## Task 5: PortalRoutes — Usar PortalAuthLayout nas Rotas de Auth

**Files:**
- Modify: `frontend-v2/src/core/routing/PortalRoutes.jsx`

- [ ] **Step 1: Actualizar PortalRoutes.jsx**

Substituir o conteúdo completo do ficheiro por:

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  LoginPage, RegisterPage, PublicRoute, ProtectedRoute,
  ForgotPasswordPage, ResetPasswordPage, ActivationPage,
} from '@/features/auth';
import { ForbiddenPage, UnauthorizedPage } from '@/features/errors/pages';

import { PortalLayout } from '@/shared/components/layout/PortalLayout';
import { PortalAuthLayout } from '@/shared/components/layout/PortalAuthLayout';
import PortalPedidosPage from '@/features/portal/pages/PortalPedidosPage';
import PortalNovoPedidoPage from '@/features/portal/pages/PortalNovoPedidoPage';
import PortalFacturasPage from '@/features/portal/pages/PortalFacturasPage';
import PortalPerfilPage from '@/features/portal/pages/PortalPerfilPage';
import PortalPedidoDetailPage from '@/features/portal/pages/PortalPedidoDetailPage';
import ChangePasswordPage from '@/features/user/pages/ChangePasswordPage';

export default function PortalRoutes() {
  return (
    <Routes>
      {/* ==================== AUTENTICAÇÃO (PortalAuthLayout) ==================== */}
      <Route element={<PortalAuthLayout />}>
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password"                element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token"          element={<ResetPasswordPage />} />
        <Route path="/activation/:id/:activation_code" element={<ActivationPage />} />
      </Route>

      {/* ==================== PÁGINAS DE ERRO ==================== */}
      <Route path="/401" element={<UnauthorizedPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      {/* ==================== PORTAL (PortalLayout) ==================== */}
      <Route element={<PortalLayout />}>
        <Route path="/" element={<Navigate to="/pedidos" replace />} />
        <Route path="/pedidos"     element={<ProtectedRoute><PortalPedidosPage /></ProtectedRoute>} />
        <Route path="/pedidos/:id" element={<ProtectedRoute><PortalPedidoDetailPage /></ProtectedRoute>} />
        <Route path="/novo-pedido" element={<ProtectedRoute><PortalNovoPedidoPage /></ProtectedRoute>} />
        <Route path="/faturas"     element={<ProtectedRoute><PortalFacturasPage /></ProtectedRoute>} />
        <Route path="/perfil"      element={<ProtectedRoute><PortalPerfilPage /></ProtectedRoute>} />
        <Route path="/alterar-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
      </Route>

      {/* ==================== 404 ==================== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend-v2 && npm run build
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/core/routing/PortalRoutes.jsx
git commit -m "feat(portal): usar PortalAuthLayout nas rotas de autenticação do portal"
```

---

## Task 6: PortalLayout — Atmosfera e Background

**Files:**
- Modify: `frontend-v2/src/shared/components/layout/PortalLayout.jsx`

- [ ] **Step 1: Actualizar PortalLayout.jsx**

Substituir o conteúdo completo do ficheiro por:

```jsx
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { PortalNavbar } from './PortalNavbar';
import { PortalFooter } from './PortalFooter';

export const PortalLayout = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: (theme) =>
          theme.palette.mode === 'light'
            ? 'radial-gradient(ellipse at top center, #EFF6FC 0%, #ffffff 60%)'
            : theme.palette.background.default,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Accent decorativo — círculo blur canto superior direito */}
      <Box
        sx={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          bgcolor: '#29B5E8',
          opacity: 0.03,
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <PortalNavbar />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Outlet />
      </Box>

      <PortalFooter />
    </Box>
  );
};

export default PortalLayout;
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend-v2 && npm run build
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/shared/components/layout/PortalLayout.jsx
git commit -m "feat(portal): adicionar gradiente e accent decorativo ao PortalLayout"
```

---

## Task 7: PortalPageHeader — Componente Partilhado

**Files:**
- Create: `frontend-v2/src/shared/components/layout/PortalPageHeader.jsx`

- [ ] **Step 1: Criar PortalPageHeader.jsx**

```jsx
import { Box, Container, Typography } from '@mui/material';
import { motion } from 'framer-motion';

export const PortalPageHeader = ({ title, subtitle, actions }) => {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            py: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Accent bar */}
            <Box
              sx={{
                width: 3,
                height: 28,
                bgcolor: 'secondary.main',
                borderRadius: 1,
                flexShrink: 0,
              }}
            />
            <Box>
              <Typography variant="h5" fontWeight={800}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          {actions && <Box>{actions}</Box>}
        </Box>
      </Container>
    </Box>
  );
};

export default PortalPageHeader;
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend-v2 && npm run build
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/shared/components/layout/PortalPageHeader.jsx
git commit -m "feat(portal): criar componente PortalPageHeader partilhado"
```

---

## Task 8: PortalFooter — Wave Animada + Contactos Reais

**Files:**
- Modify: `frontend-v2/src/shared/components/layout/PortalFooter.jsx`

- [ ] **Step 1: Reescrever PortalFooter.jsx**

Substituir o conteúdo completo do ficheiro por:

```jsx
import { Box, Container, Typography, Grid, Link, Stack, Divider, IconButton } from '@mui/material';
import {
  Phone as PhoneIcon,
  Mail as MailIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  OpenInNew as ExternalIcon,
} from '@mui/icons-material';

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || 'https://aintar.pt';

export const PortalFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: '#0A1628',
        color: 'white',
        pt: 10,
        pb: 4,
        mt: 'auto',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Wave animada — transição do conteúdo para o footer */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, overflow: 'hidden', pointerEvents: 'none', zIndex: 10 }}>
        {/* Camada 1 — semi-transparente, 12s reverso */}
        <Box
          sx={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '200%' }}
          style={{ animationName: 'waveSlide', animationDuration: '12s', animationTimingFunction: 'linear', animationIterationCount: 'infinite', animationDirection: 'reverse' }}
        >
          <svg viewBox="0 0 2880 64" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <path
              d="M0,32 C180,12 360,52 540,32 C720,12 900,52 1080,32 C1260,12 1440,52 1620,32 C1800,12 1980,52 2160,32 C2340,12 2520,52 2700,32 L2880,32 L2880,0 L0,0 Z"
              fill="rgba(255,255,255,0.25)"
            />
          </svg>
        </Box>
        {/* Camada 2 — branca sólida, 8s */}
        <Box
          sx={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '200%' }}
          style={{ animationName: 'waveSlide', animationDuration: '8s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }}
        >
          <svg viewBox="0 0 2880 64" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <path
              d="M0,40 C240,16 480,56 720,40 C960,16 1200,56 1440,40 C1680,16 1920,56 2160,40 C2400,16 2640,56 2880,40 L2880,0 L0,0 Z"
              fill="white"
            />
          </svg>
        </Box>
      </Box>

      {/* Gradient decorativo */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: 'linear-gradient(135deg, rgba(27,94,142,0.05) 0%, rgba(42,187,155,0.05) 100%)', pointerEvents: 'none' }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={6}>

          {/* Brand & Contactos */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ mb: 3 }}>
              <img src="/logos/logo-horizontal-white.png" alt="AINTAR" style={{ height: '32px', width: 'auto' }} />
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3, maxWidth: 300, lineHeight: 1.8 }}>
              Associação de Municípios para o Sistema Intermunicipal de Águas Residuais.
              Gestão responsável dos sistemas de saneamento na região Centro.
            </Typography>
            <Stack direction="row" spacing={1}>
              <IconButton
                component="a" href="tel:+351232017073" aria-label="Telefone"
                size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#29B5E8', bgcolor: 'rgba(41,181,232,0.1)' } }}
              >
                <PhoneIcon fontSize="small" />
              </IconButton>
              <IconButton
                component="a" href="mailto:geral@aintar.pt" aria-label="Email"
                size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#29B5E8', bgcolor: 'rgba(41,181,232,0.1)' } }}
              >
                <MailIcon fontSize="small" />
              </IconButton>
              <IconButton
                component="a" href="https://www.facebook.com/aintarjuntospeloambiente/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#1877F2', bgcolor: 'rgba(24,119,242,0.1)' } }}
              >
                <FacebookIcon fontSize="small" />
              </IconButton>
              <IconButton
                component="a" href="https://www.instagram.com/aintar_juntospeloambiente/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#E1306C', bgcolor: 'rgba(225,48,108,0.1)' } }}
              >
                <InstagramIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Grid>

          {/* Links — Empresa */}
          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
              Empresa
            </Typography>
            <Stack spacing={1.5}>
              {[
                { label: 'Sobre a AINTAR', href: `${WEBSITE_URL}/quem-somos` },
                { label: 'Órgãos Sociais', href: `${WEBSITE_URL}/quem-somos/orgaos-sociais` },
                { label: 'Recursos Humanos', href: `${WEBSITE_URL}/recursos-humanos` },
              ].map((item) => (
                <Link key={item.label} href={item.href} underline="none" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', '&:hover': { color: '#29B5E8' } }}>
                  {item.label}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Links — Serviços */}
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
              Serviços
            </Typography>
            <Stack spacing={1.5}>
              {[
                { label: 'Saneamento em Alta', href: `${WEBSITE_URL}/saneamento` },
                { label: 'Qualidade do Serviço', href: `${WEBSITE_URL}/saneamento/qualidade` },
                { label: 'Sustentabilidade', href: `${WEBSITE_URL}/sustentabilidade` },
              ].map((item) => (
                <Link key={item.label} href={item.href} underline="none" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', '&:hover': { color: '#29B5E8' } }}>
                  {item.label}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Área de Cliente */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
              Área de Cliente
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 3, lineHeight: 1.6 }}>
              Aceda aos seus pedidos, faturas e notificações em tempo real.
            </Typography>
            <Link
              href={WEBSITE_URL}
              underline="none"
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1,
                bgcolor: 'rgba(255,255,255,0.05)', px: 2, py: 1, borderRadius: 2,
                color: 'white', fontSize: '0.875rem',
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: '#29B5E8' },
              }}
            >
              Voltar ao Início
            </Link>
          </Grid>
        </Grid>

        <Divider sx={{ my: 6, borderColor: 'rgba(255,255,255,0.06)' }} />

        {/* Bottom Bar */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}
        >
          <Typography variant="caption">
            © {currentYear} AINTAR — Todos os direitos reservados.
          </Typography>
          <Stack direction="row" spacing={3}>
            <Link href={`${WEBSITE_URL}/politica-privacidade`} underline="hover" sx={{ color: 'inherit', fontSize: '0.75rem' }}>Privacidade</Link>
            <Link href={`${WEBSITE_URL}/termos-utilizacao`} underline="hover" sx={{ color: 'inherit', fontSize: '0.75rem' }}>Termos</Link>
            <Link href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: 'inherit', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              Livro Reclamações <ExternalIcon sx={{ fontSize: 10 }} />
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default PortalFooter;
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend-v2 && npm run build
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/shared/components/layout/PortalFooter.jsx
git commit -m "feat(portal): redesenhar PortalFooter com wave animada e contactos reais"
```

---

## Task 9: Aplicar PortalPageHeader nas Páginas do Portal

**Files:**
- Modify: `frontend-v2/src/features/portal/pages/PortalPedidosPage.jsx`
- Modify: `frontend-v2/src/features/portal/pages/PortalFacturasPage.jsx`
- Modify: `frontend-v2/src/features/portal/pages/PortalPerfilPage.jsx`
- Modify: `frontend-v2/src/features/portal/pages/PortalNovoPedidoPage.jsx`
- Modify: `frontend-v2/src/features/portal/pages/PortalPedidoDetailPage.jsx`

### 9.1 — PortalPedidosPage

- [ ] **Step 1: Adicionar import de PortalPageHeader**

No topo de `PortalPedidosPage.jsx`, adicionar após os imports existentes:

```jsx
import { PortalPageHeader } from '@/shared/components/layout/PortalPageHeader';
```

- [ ] **Step 2: Substituir o cabeçalho inline**

Localizar e substituir o bloco de cabeçalho (desde `<Container maxWidth="lg" sx={{ py: 4 }}>` até ao fecho do `Box` de cabeçalho + o `Stack` de pesquisa, mantendo o Grid de resultados):

A estrutura do return deve ficar:

```jsx
return (
  <>
    <PortalPageHeader
      title="Os Meus Pedidos"
      subtitle="Acompanhe o estado e histórico dos seus requerimentos."
      actions={
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/novo-pedido')}
          sx={{
            borderRadius: '12px', px: 3, py: 1,
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
            '&:hover': { boxShadow: `0 12px 20px ${alpha(theme.palette.primary.main, 0.35)}` },
          }}
        >
          Novo Pedido
        </Button>
      }
    />

    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Barra de Pesquisa e Refresh */}
      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        <Box sx={{ flexGrow: 1 }}>
          <SearchBar searchTerm={searchTerm} onSearch={setSearchTerm} placeholder="Pesquisar por nº de registo ou tipo..." />
        </Box>
        <Button variant="outlined" onClick={() => refetch()} disabled={isFetching} sx={{ borderRadius: '12px', minWidth: '48px', p: 0 }}>
          <RefreshIcon className={isFetching ? 'animate-spin' : ''} />
        </Button>
      </Stack>

      {/* Lista de Resultados */}
      {results.length > 0 ? (
        <Grid container spacing={3}>
          {results.map((pedido) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={pedido.pk}>
              <PedidoCard pedido={pedido} onClick={(p) => navigate(`/pedidos/${p.pk}`)} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ py: 10, textAlign: 'center', bgcolor: alpha(theme.palette.divider, 0.03), borderRadius: 6, border: '2px dashed', borderColor: 'divider' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? 'Nenhum pedido encontrado para esta pesquisa.' : 'Ainda não tem pedidos submetidos.'}
          </Typography>
          {!searchTerm && (
            <Button variant="text" startIcon={<AddIcon />} onClick={() => navigate('/novo-pedido')} sx={{ mt: 1 }}>
              Submeter o meu primeiro pedido
            </Button>
          )}
        </Box>
      )}
    </Container>
  </>
);
```

### 9.2 — PortalFacturasPage

- [ ] **Step 3: Adicionar import PortalPageHeader em PortalFacturasPage**

```jsx
import { PortalPageHeader } from '@/shared/components/layout/PortalPageHeader';
```

- [ ] **Step 4: Substituir o cabeçalho inline em PortalFacturasPage**

Localizar no return o bloco `{/* Cabeçalho */}` e o seu `Box` pai imediato e substituir toda a estrutura de retorno para:

```jsx
return (
  <>
    <PortalPageHeader
      title="Faturas e Pagamentos"
      subtitle="Consulte e pague as suas faturas pendentes."
    />
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* manter conteúdo existente a partir daqui, removendo apenas o Box do cabeçalho inline */}
    </Container>
  </>
);
```

**Nota de implementação:** Ler o ficheiro completo para identificar exactamente o bloco a remover. O padrão é `<Box sx={{ mb: 4, ... }}>` com Typography h4 "Faturas" (ou similar). Remover esse Box e substituir pela estrutura acima.

### 9.3 — PortalPerfilPage

- [ ] **Step 5: Adicionar import PortalPageHeader em PortalPerfilPage**

```jsx
import { PortalPageHeader } from '@/shared/components/layout/PortalPageHeader';
```

- [ ] **Step 6: Adicionar PortalPageHeader antes do Container em PortalPerfilPage**

O perfil mantém o seu Avatar + dados inline dentro do Container. O PortalPageHeader é adicionado ANTES do Container (não substitui o conteúdo do perfil):

```jsx
return (
  <>
    <PortalPageHeader
      title="O Meu Perfil"
      subtitle="Gerir os seus dados pessoais e contactos."
    />
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* conteúdo existente mantido integralmente */}
    </Container>
  </>
);
```

### 9.4 — PortalNovoPedidoPage

- [ ] **Step 7: Adicionar import PortalPageHeader em PortalNovoPedidoPage**

```jsx
import { PortalPageHeader } from '@/shared/components/layout/PortalPageHeader';
```

- [ ] **Step 8: Substituir cabeçalho em PortalNovoPedidoPage**

Localizar o bloco de cabeçalho existente (que provavelmente tem BackIcon + Typography "Novo Pedido") e substituir o return por:

```jsx
return (
  <>
    <PortalPageHeader
      title="Submeter Pedido"
      subtitle="Preencha os campos abaixo para registar o seu pedido."
      actions={
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => navigate('/pedidos')}
          sx={{ borderRadius: '12px' }}
        >
          Voltar
        </Button>
      }
    />
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* conteúdo do wizard mantido integralmente */}
    </Container>
  </>
);
```

**Nota de implementação:** Ler o ficheiro para confirmar que o Container do wizard tem `maxWidth="md"` e que o BackIcon import já existe.

### 9.5 — PortalPedidoDetailPage

- [ ] **Step 9: Adicionar import PortalPageHeader em PortalPedidoDetailPage**

```jsx
import { PortalPageHeader } from '@/shared/components/layout/PortalPageHeader';
```

- [ ] **Step 10: Substituir cabeçalho em PortalPedidoDetailPage**

```jsx
return (
  <>
    <PortalPageHeader
      title={pedido?.regnumber ? `Pedido ${pedido.regnumber}` : 'Detalhe do Pedido'}
      subtitle={pedido?.tt_type || ''}
      actions={
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => navigate('/pedidos')}
          sx={{ borderRadius: '12px' }}
        >
          Voltar
        </Button>
      }
    />
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* conteúdo existente mantido integralmente */}
    </Container>
  </>
);
```

**Nota de implementação:** O `BackIcon` já está importado em `PortalPedidoDetailPage` como `ArrowBack as BackIcon`.

- [ ] **Step 11: Verificar build**

```bash
cd frontend-v2 && npm run build
```

Esperado: sem erros.

- [ ] **Step 12: Commit**

```bash
git add frontend-v2/src/features/portal/pages/
git commit -m "feat(portal): aplicar PortalPageHeader consistente em todas as páginas do portal"
```

---

## Task 10: Verificação Final

- [ ] **Step 1: Build limpo**

```bash
cd frontend-v2 && npm run build
```

Esperado: build sem erros. Avisos de chunk size são aceitáveis.

- [ ] **Step 2: Iniciar servidor de dev**

```bash
cd frontend-v2 && npm run dev
```

- [ ] **Step 3: Testar fluxo de autenticação**

Abrir `http://localhost:5173/login` (ou a porta que o Vite usar).

Verificar:
- [ ] Layout split screen: painel AINTAR à esquerda, formulário à direita
- [ ] Logo branco visível no painel esquerdo
- [ ] Link "Voltar ao website" no rodapé do painel direito
- [ ] Em mobile (< 900px): painel esquerdo oculto, logo colorido no topo

- [ ] **Step 4: Testar navbar**

Fazer login e navegar para `/pedidos`.

Verificar:
- [ ] Navbar transparente no topo da página
- [ ] Scroll para baixo: navbar fica com glass effect (fundo branco semi-transparente, sombra subtil)
- [ ] Barra de progresso azul (#29B5E8) cresce ao scroll
- [ ] Logo visível e correcto
- [ ] Links "Pedidos" e "Faturas" com hover pill arredondado
- [ ] Avatar com dropdown funcional

- [ ] **Step 5: Testar páginas internas**

Verificar em `/pedidos`, `/faturas`, `/perfil`:
- [ ] PortalPageHeader visível: barra accent azul, título, subtítulo
- [ ] Background da página com gradiente subtil (não branco plano)
- [ ] Círculo decorativo visível no canto superior direito (muito subtil, 3% opacidade)

- [ ] **Step 6: Testar footer**

Scrollar até ao fundo de qualquer página.

Verificar:
- [ ] Wave animada visível no topo do footer
- [ ] Ícones de contacto clicáveis (phone, email, Facebook, Instagram)
- [ ] Links do bottom bar (Privacidade, Termos, Livro Reclamações)

- [ ] **Step 7: Commit final (se houver ajustes)**

```bash
git add -p  # adicionar só os ficheiros modificados
git commit -m "fix(portal): ajustes visuais após verificação final do alinhamento"
```
