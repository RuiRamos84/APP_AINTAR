/**
 * DashboardPage
 * Página principal do dashboard com Glassmorphism e Animações
 */

import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import { useAuth } from '@/core/contexts/AuthContext';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { motion } from 'framer-motion';

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Glass Style Helper
const useGlassStyle = () => {
  const theme = useTheme();
  return {
    backgroundColor: alpha(theme.palette.background.paper, 0.7),
    backdropFilter: 'blur(12px)',
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}`,
    borderRadius: 3,
  };
};

// Componente de Card de Estatística
const StatCard = ({ title, value, icon, color = 'primary', trend }) => {
  const glassStyle = useGlassStyle();
  const theme = useTheme();

  return (
    <Card
      component={motion.div}
      variants={itemVariants}
      sx={{
        height: '100%',
        ...glassStyle,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${alpha(theme.palette[color].main, 0.2)}`,
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
              width: 56,
              height: 56,
              borderRadius: 2.5,
              background: `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.8)}, ${theme.palette[color].dark})`,
              color: 'white',
              mr: 2,
              boxShadow: `0 4px 12px ${alpha(theme.palette[color].main, 0.3)}`,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ color: theme.palette.text.primary }}>
              {value}
            </Typography>
          </Box>
        </Box>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <TrendingUpIcon
              sx={{
                fontSize: 18,
                color: trend > 0 ? 'success.main' : 'error.main',
                mr: 0.5,
              }}
            />
            <Typography
              variant="subtitle2"
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
  const glassStyle = useGlassStyle();
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
    <Paper component={motion.div} variants={itemVariants} sx={{ p: 3, height: '100%', ...glassStyle }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Atividade Recente
      </Typography>
      <Box sx={{ mt: 2 }}>
        {activities.map((activity, index) => (
          <Box
            key={activity.id}
            sx={{
              py: 2.5,
              borderBottom: index < activities.length - 1 ? 1 : 0,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {activity.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 1 }}>
                {activity.time}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {activity.description}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

// Componente de Card de Progresso
const ProgressCard = ({ title, value, total, color = 'primary' }) => {
  const glassStyle = useGlassStyle();
  const theme = useTheme(); // Hook was missing in this component scope or not used correctly
  const percentage = (value / total) * 100;

  return (
    <Paper component={motion.div} variants={itemVariants} sx={{ p: 3, ...glassStyle }}>
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
            height: 10,
            borderRadius: 5,
            bgcolor: alpha(theme.palette[color].main, 0.1),
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
              bgcolor: `${color}.main`,
            },
          }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: 'block', textAlign: 'right' }}
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
    <Box
      component={motion.div}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Section */}
      <Box component={motion.div} variants={itemVariants} sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="800" gutterBottom sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
          <Stack spacing={3} component={motion.div} variants={containerVariants}>
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

export default DashboardPage;
