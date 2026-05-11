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
