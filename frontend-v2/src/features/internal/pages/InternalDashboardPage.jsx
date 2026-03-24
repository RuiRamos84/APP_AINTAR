import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardActionArea, CardContent,
  Typography, Box, Chip,
} from '@mui/material';
import {
  Work as EPIIcon,
  DirectionsCar as FleetIcon,
  Description as RequestIcon,
  GridView as InternalIcon,
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { ModulePage } from '@/shared/components/layout/ModulePage';

const AREAS = [
  {
    id: 'requisicao',
    label: 'Requisição Interna',
    description: 'Criação de requisições de material e serviços',
    icon: RequestIcon,
    color: '#c62828',
    path: '/internal/requisicao',
    ready: true,
  },
  {
    id: 'epi',
    label: 'Gestão de EPI',
    description: 'Equipamentos de proteção individual e entregas',
    icon: EPIIcon,
    color: '#2e7d32',
    path: '/epi',
    ready: true,
  },
  {
    id: 'frota',
    label: 'Gestão de Frota',
    description: 'Veículos, manutenção e gestão da frota',
    icon: FleetIcon,
    color: '#6a1b9a',
    path: '/fleet',
    ready: true,
  },
];

const AreaCard = ({ area }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const Icon = area.icon;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        height: '100%',
        borderColor: area.ready
          ? alpha(area.color, 0.3)
          : theme.palette.divider,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': area.ready ? {
          boxShadow: `0 4px 20px ${alpha(area.color, 0.2)}`,
          borderColor: area.color,
        } : {},
      }}
    >
      <CardActionArea
        onClick={() => area.ready && navigate(area.path)}
        disabled={!area.ready}
        sx={{ height: '100%', p: 0 }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: 2, flexShrink: 0,
              bgcolor: area.ready ? area.color : theme.palette.action.disabledBackground,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon sx={{ color: area.ready ? 'white' : theme.palette.action.disabled, fontSize: 26 }} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  color={area.ready ? 'text.primary' : 'text.disabled'}
                  lineHeight={1.2}
                >
                  {area.label}
                </Typography>
                {!area.ready && (
                  <Chip label="Em breve" size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" lineHeight={1.4}>
                {area.description}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

const InternalDashboardPage = () => {
  const theme = useTheme();

  return (
    <ModulePage
      title="Área Interna"
      icon={InternalIcon}
      color={theme.palette.primary.main}
      breadcrumbs={[{ label: 'Início', path: '/home' }, { label: 'Área Interna' }]}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Aceda aos recursos administrativos internos: EPI, frota e requisições.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {AREAS.map((area) => (
          <Grid key={area.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <AreaCard area={area} />
          </Grid>
        ))}
      </Grid>
    </ModulePage>
  );
};

export default InternalDashboardPage;
