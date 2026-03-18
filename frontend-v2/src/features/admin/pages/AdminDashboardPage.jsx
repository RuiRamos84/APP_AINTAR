/**
 * AdminDashboardPage
 * Dashboard administrativo com estatísticas reais do sistema
 */

import {
  Box, Grid, Card, CardContent, Typography, Button,
  Stack, Chip, Skeleton, useTheme, alpha,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as TasksIcon,
  Description as DocumentsIcon,
  AdminPanelSettings as AdminIcon,
  Settings as ConfigIcon,
  History as LogsIcon,
  Build as ActionsIcon,
  VpnKey as PermissionsIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import apiClient from '@/services/api/client';

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useAdminStats = () =>
  useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiClient.get('/admin/stats'),
    staleTime: 60 * 1000,
    select: (res) => res?.stats ?? res ?? null,
    retry: 1,
  });

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ title, value, icon: Icon, color, loading }) => {
  const theme = useTheme();
  return (
    <Card variant="outlined" sx={{ bgcolor: alpha(theme.palette[color]?.main || '#000', 0.04) }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette[color]?.main || '#000', 0.15) }}>
            <Icon sx={{ color: `${color}.main`, fontSize: 22 }} />
          </Box>
        </Box>
        {loading ? (
          <Skeleton variant="text" width={60} height={40} />
        ) : (
          <Typography variant="h4" fontWeight={800} color={`${color}.main`}>{value ?? '—'}</Typography>
        )}
        <Typography variant="caption" color="text.secondary">{title}</Typography>
      </CardContent>
    </Card>
  );
};

// ─── Quick Link ───────────────────────────────────────────────────────────────

const QuickLink = ({ title, description, path, icon: Icon, color }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  return (
    <Card
      variant="outlined"
      onClick={() => navigate(path)}
      sx={{
        cursor: 'pointer',
        transition: '0.2s',
        '&:hover': { boxShadow: 2, borderColor: color, transform: 'translateY(-2px)' },
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(color, 0.12), flexShrink: 0 }}>
          <Icon sx={{ color, fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>{title}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{description}</Typography>
        </Box>
        <ArrowIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
      </CardContent>
    </Card>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const AdminDashboardPage = () => {
  const { data: stats, isLoading } = useAdminStats();

  const statCards = [
    { title: 'Utilizadores', value: stats?.total_users,   icon: PeopleIcon,   color: 'primary' },
    { title: 'Tarefas Ativas', value: stats?.active_tasks, icon: TasksIcon,    color: 'success' },
    { title: 'Documentos',    value: stats?.total_docs,    icon: DocumentsIcon, color: 'info' },
    { title: 'Administradores', value: stats?.admin_count, icon: AdminIcon,    color: 'warning' },
  ];

  const quickLinks = [
    { title: 'Utilizadores', description: 'Gerir contas e permissões', path: '/admin/users', icon: PeopleIcon, color: '#2196f3' },
    { title: 'Permissões', description: 'Configurar acessos por perfil', path: '/admin/permissions', icon: PermissionsIcon, color: '#9c27b0' },
    { title: 'Configurações', description: 'Parâmetros e estado do sistema', path: '/admin/config', icon: ConfigIcon, color: '#f44336' },
    { title: 'Logs de Atividade', description: 'Auditoria de ações', path: '/admin/activity-logs', icon: LogsIcon, color: '#ff9800' },
    { title: 'Logs de Sessões', description: 'Histórico de autenticações', path: '/admin/session-logs', icon: LogsIcon, color: '#607d8b' },
    { title: 'Ações', description: 'Manutenção e ferramentas', path: '/admin/actions', icon: ActionsIcon, color: '#795548' },
  ];

  return (
    <ModulePage
      title="Sistema"
      subtitle="Dashboard administrativo — visão geral e acesso rápido"
      icon={AdminIcon}
      color="#f44336"
      breadcrumbs={[{ label: 'Sistema', path: '/admin' }, { label: 'Dashboard' }]}
    >
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s) => (
          <Grid key={s.title} size={{ xs: 6, sm: 3 }}>
            <StatCard {...s} loading={isLoading} />
          </Grid>
        ))}
      </Grid>

      {/* Quick links */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Acesso Rápido</Typography>
      <Grid container spacing={2}>
        {quickLinks.map((link) => (
          <Grid key={link.path} size={{ xs: 12, sm: 6, md: 4 }}>
            <QuickLink {...link} />
          </Grid>
        ))}
      </Grid>
    </ModulePage>
  );
};

export default AdminDashboardPage;
