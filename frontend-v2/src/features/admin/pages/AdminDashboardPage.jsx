/**
 * AdminDashboardPage
 * Dashboard administrativo com estatísticas e métricas do sistema
 *
 * Features:
 * - Visão geral de utilizadores, tarefas, documentos
 * - Gráficos e estatísticas
 * - Ações rápidas de administração
 */

import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as TasksIcon,
  Description as DocumentsIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { FadeIn } from '@/shared/components/animation';

const AdminDashboardPage = () => {
  // Responsividade
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // TODO: Fetch real statistics from API
  const stats = [
    {
      title: 'Total de Utilizadores',
      value: '127',
      icon: PeopleIcon,
      color: 'primary.main',
      change: '+12%',
    },
    {
      title: 'Tarefas Ativas',
      value: '43',
      icon: TasksIcon,
      color: 'success.main',
      change: '+5%',
    },
    {
      title: 'Documentos',
      value: '892',
      icon: DocumentsIcon,
      color: 'info.main',
      change: '+23%',
    },
    {
      title: 'Admins Ativos',
      value: '8',
      icon: AdminIcon,
      color: 'warning.main',
      change: '0%',
    },
  ];

  return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <FadeIn direction="down">
          <Box sx={{ mb: { xs: 3, sm: 4 } }}>
            <Typography
              variant={isMobile ? 'h5' : 'h4'}
              component="h1"
              fontWeight="bold"
              gutterBottom
            >
              Dashboard Admin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Visão geral do sistema e estatísticas administrativas
            </Typography>
          </Box>
        </FadeIn>

        {/* Statistics Cards */}
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 3, sm: 4 } }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Grid size={{ xs: 6, sm: 6, md: 3 }} key={stat.title}>
                <FadeIn delay={0.1 * (index + 1)}>
                  <Card
                    sx={{
                      height: '100%',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: isMobile ? 'none' : 'translateY(-4px)',
                        boxShadow: isMobile ? 1 : 4,
                      },
                    }}
                  >
                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1, sm: 2 } }}>
                        <Box
                          sx={{
                            bgcolor: stat.color,
                            color: 'white',
                            p: { xs: 1, sm: 1.5 },
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            ml: 'auto',
                            color: stat.change.startsWith('+') ? 'success.main' : 'text.secondary',
                            fontWeight: 'bold',
                            fontSize: { xs: '0.65rem', sm: '0.75rem' },
                          }}
                        >
                          {stat.change}
                        </Typography>
                      </Box>
                      <Typography
                        variant={isMobile ? 'h5' : 'h4'}
                        fontWeight="bold"
                        gutterBottom
                        sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        {stat.title}
                      </Typography>
                    </CardContent>
                  </Card>
                </FadeIn>
              </Grid>
            );
          })}
        </Grid>

        {/* Content Areas */}
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {/* Recent Activity */}
          <Grid size={{ xs: 12, md: 6 }}>
            <FadeIn delay={0.5}>
              <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
                <Typography
                  variant={isMobile ? 'subtitle1' : 'h6'}
                  fontWeight="bold"
                  gutterBottom
                >
                  Atividade Recente
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Últimas ações no sistema (Em desenvolvimento)
                </Typography>
                {/* TODO: Add activity timeline */}
              </Paper>
            </FadeIn>
          </Grid>

          {/* System Status */}
          <Grid size={{ xs: 12, md: 6 }}>
            <FadeIn delay={0.6}>
              <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
                <Typography
                  variant={isMobile ? 'subtitle1' : 'h6'}
                  fontWeight="bold"
                  gutterBottom
                >
                  Estado do Sistema
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status dos serviços e recursos (Em desenvolvimento)
                </Typography>
                {/* TODO: Add system status indicators */}
              </Paper>
            </FadeIn>
          </Grid>

          {/* Quick Actions */}
          <Grid size={{ xs: 12 }}>
            <FadeIn delay={0.7}>
              <Paper sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography
                  variant={isMobile ? 'subtitle1' : 'h6'}
                  fontWeight="bold"
                  gutterBottom
                >
                  Ações Rápidas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Atalhos para tarefas administrativas comuns (Em desenvolvimento)
                </Typography>
                {/* TODO: Add quick action buttons */}
              </Paper>
            </FadeIn>
          </Grid>
        </Grid>
      </Container>
  );
};

export default AdminDashboardPage;
