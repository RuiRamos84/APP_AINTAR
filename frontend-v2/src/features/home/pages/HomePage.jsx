/**
 * HomePage
 * Página inicial pública da aplicação
 */

import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import DevicesIcon from '@mui/icons-material/Devices';

export const HomePage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <SecurityIcon sx={{ fontSize: 48 }} />,
      title: 'Segurança',
      description: 'Sistema de autenticação robusto com JWT e refresh tokens',
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 48 }} />,
      title: 'Performance',
      description: 'Built com React + Vite para máxima velocidade',
    },
    {
      icon: <DevicesIcon sx={{ fontSize: 48 }} />,
      title: 'Responsivo',
      description: 'Design mobile-first que funciona em todos os dispositivos',
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: (theme) =>
            theme.palette.mode === 'light'
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={3}>
                <Typography
                  variant="h2"
                  fontWeight="bold"
                  sx={{
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                  }}
                >
                  Bem-vindo ao APP v2
                </Typography>
                <Typography variant="h5" sx={{ opacity: 0.9 }}>
                  A nova geração da nossa aplicação com arquitetura moderna,
                  segura e escalável.
                </Typography>
                <Box sx={{ pt: 2 }}>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<RocketLaunchIcon />}
                      onClick={() => navigate('/login')}
                      sx={{
                        bgcolor: 'white',
                        color: 'primary.main',
                        '&:hover': {
                          bgcolor: 'grey.100',
                        },
                        textTransform: 'none',
                        fontSize: '1.1rem',
                        px: 4,
                      }}
                    >
                      Começar Agora
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => navigate('/about')}
                      sx={{
                        borderColor: 'white',
                        color: 'white',
                        '&:hover': {
                          borderColor: 'white',
                          bgcolor: 'rgba(255,255,255,0.1)',
                        },
                        textTransform: 'none',
                        fontSize: '1.1rem',
                        px: 4,
                      }}
                    >
                      Saber Mais
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 400,
                    height: 400,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <RocketLaunchIcon sx={{ fontSize: 200, opacity: 0.8 }} />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h3"
          textAlign="center"
          fontWeight="bold"
          gutterBottom
          sx={{ mb: 6 }}
        >
          Funcionalidades Principais
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid key={index} size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box
                    sx={{
                      color: 'primary.main',
                      mb: 2,
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 8,
        }}
      >
        <Container maxWidth="md">
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Typography variant="h3" fontWeight="bold">
              Pronto para começar?
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Crie a sua conta e descubra todas as funcionalidades da plataforma
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'grey.100',
                },
                textTransform: 'none',
                fontSize: '1.1rem',
                px: 6,
                py: 1.5,
              }}
            >
              Criar Conta Grátis
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          py: 4,
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" textAlign="center">
            © 2024 APP v2 - Todos os direitos reservados
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
