/**
 * ForbiddenPage - 403 Forbidden
 * Shown when authenticated user tries to access a resource they don't have permission for
 */

import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const ForbiddenPage = () => {
  const navigate = useNavigate();

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
            <BlockIcon
              sx={{
                fontSize: 120,
                color: 'error.main',
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
              color: 'error.main',
              mb: 2,
            }}
          >
            403
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
            Acesso Negado
          </Typography>

          {/* Description */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            Lamentamos, mas não tem permissão para aceder a esta página.
            <br />
            Por favor, contacte o administrador se acredita que isto é um erro.
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
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              size="large"
            >
              Voltar
            </Button>

            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/dashboard')}
              size="large"
            >
              Ir para Dashboard
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ForbiddenPage;
