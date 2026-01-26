/**
 * Dashboard Overview Page - Módulo Dashboards
 * Visão geral do sistema
 */

import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

const stats = [
  {
    title: 'Tarefas Ativas',
    value: '23',
    change: '+12%',
    icon: AssignmentIcon,
    color: '#2196f3',
  },
  {
    title: 'Clientes Ativos',
    value: '1,234',
    change: '+5%',
    icon: PeopleIcon,
    color: '#4caf50',
  },
  {
    title: 'Faturas Pendentes',
    value: '45',
    change: '-8%',
    icon: AttachMoneyIcon,
    color: '#ff9800',
  },
  {
    title: 'Utilização ETAR',
    value: '78%',
    change: '+3%',
    icon: TrendingUpIcon,
    color: '#9c27b0',
  },
];

export const DashboardOverviewPage = () => {
  return (
    <ModulePage
      title="Visão Geral"
      subtitle="Dashboard principal do sistema AINTAR"
      icon={DashboardIcon}
      color="#9c27b0"
      breadcrumbs={[
        { label: 'Dashboards', path: '/dashboards/overview' },
        { label: 'Visão Geral', path: '/dashboards/overview' },
      ]}
    >
      <Grid container spacing={3}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography color="text.secondary" variant="body2" gutterBottom>
                        {stat.title}
                      </Typography>
                      <Typography variant="h4" fontWeight={600}>
                        {stat.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: `${stat.color}15`,
                      }}
                    >
                      <Icon sx={{ color: stat.color, fontSize: 24 }} />
                    </Box>
                  </Box>
                  <Typography
                    variant="body2"
                    color={stat.change.startsWith('+') ? 'success.main' : 'error.main'}
                  >
                    {stat.change} vs mês anterior
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </ModulePage>
  );
};

export default DashboardOverviewPage;
