import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, Stack, Typography, Grid } from '@mui/material';
import {
  Map as MapaIcon,
  SupervisorAccount as SupervisorIcon,
  ChevronRight as ArrowIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { RH_COLOR as COLOR } from '../utils/rhUtils';

const SECTIONS = [
  {
    to: '/rh/gestao/ponto-mapa',
    icon: MapaIcon,
    title: 'Mapa de Ponto',
    color: '#0891b2',
    descr: 'Vista consolidada dos registos de ponto de toda a equipa.',
  },
  {
    to: '/rh/gestao/central',
    icon: SupervisorIcon,
    title: 'Gestão Centralizada',
    color: '#7c3aed',
    descr: 'Validação de pedidos pendentes — férias, faltas e mapas mensais.',
  },
];

const NavCard = ({ to, icon: Icon, title, color, descr }) => {
  const theme = useTheme();
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

const RhChefiaPage = () => (
  <ModulePage
    title="Chefia / Supervisão"
    subtitle="Ferramentas de acompanhamento e validação de equipa"
    icon={SupervisorIcon}
    color={COLOR}
    breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Chefia / Supervisão' }]}
  >
    <Grid container spacing={2.5}>
      {SECTIONS.map((s) => (
        <Grid key={s.to} size={{ xs: 12, sm: 6, lg: 4 }}>
          <NavCard {...s} />
        </Grid>
      ))}
    </Grid>
  </ModulePage>
);

export default RhChefiaPage;
