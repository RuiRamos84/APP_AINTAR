/**
 * UnauthorizedPage
 * Página mostrada quando o utilizador não tem permissões
 */

import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BlockIcon from '@mui/icons-material/Block';

export const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center' }}>
          <BlockIcon
            sx={{
              fontSize: 120,
              color: 'error.main',
              mb: 3,
            }}
          />
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Acesso Negado
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Não tem permissões para aceder a esta página.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/dashboard')}
          >
            Voltar ao Dashboard
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default UnauthorizedPage;
