import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, Stack, Typography, Grid } from '@mui/material';
import {
  ManageAccounts as GestPessoalIcon,
  LocationOn as LocalIcon,
  HealthAndSafety as EPIIcon,
  Grading as AvalIcon,
  AdminPanelSettings as RhAdminIcon,
  ChevronRight as ArrowIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { RH_COLOR as COLOR } from '../utils/rhUtils';

const SECTIONS = [
  {
    to: '/rh/gestao/colaboradores',
    icon: GestPessoalIcon,
    title: 'Colaboradores',
    color: '#0891b2',
    descr: 'Perfis RH, saldos de férias e configuração de horários.',
    permission: 'rh.admin',
  },
  {
    to: '/rh/gestao/locais',
    icon: LocalIcon,
    title: 'Locais Predefinidos',
    color: '#16a34a',
    descr: 'Geofencing — locais válidos para registo de ponto.',
    permission: 'rh.admin',
  },
  {
    to: '/epi',
    icon: EPIIcon,
    title: 'Gestão de EPI',
    color: '#d97706',
    descr: 'Equipamento de proteção individual atribuído por colaborador.',
    permission: 'epi.view',
  },
  {
    to: '/rh/gestao/aval-config',
    icon: AvalIcon,
    title: 'Configuração de Avaliações',
    color: '#7c3aed',
    descr: 'Critérios, ciclos e modelos de avaliação de desempenho.',
    permission: 'aval.edit',
  },
];

const NavCard = ({ to, icon: Icon, title, color, descr }) => {
  const navigate = useNavigate();
  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${alpha(color, 0.2)}`,
        borderRadius: 3,
        transition: 'box-shadow 0.2s, transform 0.15s',
        '&:hover': {
          boxShadow: `0 8px 24px ${alpha(color, 0.18)}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardActionArea onClick={() => navigate(to)} sx={{ p: 0 }}>
        <Box
          sx={{
            px: 2.5, py: 1.5,
            background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.75)})`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Icon sx={{ color: 'white', fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={700} color="white">{title}</Typography>
          </Stack>
          <ArrowIcon sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }} />
        </Box>
        <CardContent sx={{ px: 2.5, py: 2, minHeight: 70 }}>
          <Typography variant="body2" color="text.secondary">{descr}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

const RhAdminPage = () => {
  const { hasPermission } = usePermissions();
  const visible = SECTIONS.filter((s) => hasPermission(s.permission));

  return (
    <ModulePage
      title="Administração RH"
      subtitle="Gestão de colaboradores, EPI e avaliações"
      icon={RhAdminIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Administração RH' }]}
    >
      <Grid container spacing={2.5}>
        {visible.map((s) => (
          <Grid key={s.to} size={{ xs: 12, sm: 6, lg: 4 }}>
            <NavCard {...s} />
          </Grid>
        ))}
      </Grid>
    </ModulePage>
  );
};

export default RhAdminPage;
