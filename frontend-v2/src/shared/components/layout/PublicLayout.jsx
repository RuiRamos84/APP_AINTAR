/**
 * PublicLayout Component
 * Layout para páginas públicas (homepage, about, etc)
 * Sem sidebar, apenas navbar
 */

import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';

export const PublicLayout = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      {/* Navbar */}
      <PublicNavbar />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default PublicLayout;
