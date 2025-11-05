/**
 * DashboardPage
 * Página principal do dashboard
 */

import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import { useAuth } from '@/core/contexts/AuthContext';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

// Componente de Card de Estatística
const StatCard = ({ title, value, icon, color = 'primary', trend }) => {
  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${color}.main`,
              color: 'white',
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
          </Box>
        </Box>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <TrendingUpIcon
              sx={{
                fontSize: 16,
                color: trend > 0 ? 'success.main' : 'error.main',
                mr: 0.5,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: trend > 0 ? 'success.main' : 'error.main',
                fontWeight: 'bold',
              }}
            >
              {trend > 0 ? '+' : ''}
              {trend}%
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              vs. mês anterior
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Componente de Card de Atividade Recente
const RecentActivityCard = () => {
  const activities = [
    {
      id: 1,
      title: 'Nova tarefa criada',
      description: 'Implementar sistema de autenticação',
      time: 'há 2 horas',
    },
    {
      id: 2,
      title: 'Utilizador registado',
      description: 'João Silva juntou-se à plataforma',
      time: 'há 5 horas',
    },
    {
      id: 3,
      title: 'Tarefa concluída',
      description: 'Setup do projeto frontend v2',
      time: 'há 1 dia',
    },
  ];

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Atividade Recente
      </Typography>
      <Box sx={{ mt: 2 }}>
        {activities.map((activity, index) => (
          <Box
            key={activity.id}
            sx={{
              py: 2,
              borderBottom: index < activities.length - 1 ? 1 : 0,
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              {activity.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {activity.description}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {activity.time}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

// Componente de Card de Progresso
const ProgressCard = ({ title, value, total, color = 'primary' }) => {
  const percentage = (value / total) * 100;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Progresso
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {value} / {total}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={percentage}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              bgcolor: `${color}.main`,
              borderRadius: 4,
            },
          }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: 'block' }}
        >
          {percentage.toFixed(0)}% completo
        </Typography>
      </Box>
    </Paper>
  );
};

export const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <Box>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Bem-vindo de volta, {user?.user_name?.split(' ')[0]}! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Aqui está um resumo das suas atividades
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total de Utilizadores"
            value="1,234"
            icon={<PeopleIcon />}
            color="primary"
            trend={12}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Tarefas Ativas"
            value="56"
            icon={<AssignmentIcon />}
            color="info"
            trend={8}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Tarefas Concluídas"
            value="128"
            icon={<CheckCircleIcon />}
            color="success"
            trend={15}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Taxa de Sucesso"
            value="94%"
            icon={<TrendingUpIcon />}
            color="warning"
            trend={3}
          />
        </Grid>
      </Grid>

      {/* Content Grid */}
      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid size={{ xs: 12, md: 8 }}>
          <RecentActivityCard />
        </Grid>

        {/* Progress Cards */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            <ProgressCard
              title="Tarefas do Mês"
              value={42}
              total={60}
              color="primary"
            />
            <ProgressCard
              title="Objetivos Atingidos"
              value={7}
              total={10}
              color="success"
            />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

// Import necessário para Stack
import { Stack } from '@mui/material';

export default DashboardPage;
