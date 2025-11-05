/**
 * UnauthorizedPage - 401 Unauthorized
 * Shown when unauthenticated user tries to access a protected resource
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LoginIcon from '@mui/icons-material/Login';
import HomeIcon from '@mui/icons-material/Home';

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = () => {
    // Redirect to login with return URL
    navigate('/login', {
      state: { from: location.state?.from || location.pathname }
    });
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            width: '100%',
          }}
        >
          {/* Icon */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <LockIcon
              sx={{
                fontSize: 120,
                color: 'warning.main',
                opacity: 0.8,
              }}
            />
          </Box>

          {/* Status Code */}
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '4rem', sm: '6rem' },
              fontWeight: 700,
              color: 'warning.main',
              mb: 2,
            }}
          >
            401
          </Typography>

          {/* Title */}
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 600,
              mb: 2,
            }}
          >
            Acesso Não Autorizado
          </Typography>

          {/* Description */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            Tentou aceder a uma área protegida sem estar autenticado.
            <br />
            Por favor, faça login para continuar.
          </Typography>

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'center',
            }}
          >
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              size="large"
            >
              Página Inicial
            </Button>

            <Button
              variant="contained"
              startIcon={<LoginIcon />}
              onClick={handleLogin}
              size="large"
            >
              Fazer Login
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default UnauthorizedPage;
