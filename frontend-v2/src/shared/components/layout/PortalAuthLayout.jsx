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
            px: { xs: 3, sm: 5, md: 6 },
            py: 4,
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 480 }}>
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
