/**
 * ExpensesHubPage
 * Hub central de despesas — acesso rápido a todas as categorias de despesa
 */

import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, CardActionArea, Typography,
  useTheme, alpha, Chip,
} from '@mui/material';
import {
  Hub as HubIcon,
  Cable as NetworkIcon,
  AccountTree as BranchesIcon,
  Build as MaintenanceIcon,
  Construction as ConstructionIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout/ModulePage';

const CATEGORIES = [
  {
    title: 'Rede',
    description: 'Despesas de infraestrutura de rede e pedidos de desobstrução/reparação',
    path: '/expenses/network',
    icon: NetworkIcon,
    color: '#2196f3',
    badge: null,
  },
  {
    title: 'Ramais',
    description: 'Despesas de ramais e pedidos de intervenção em ramais domésticos',
    path: '/expenses/branches',
    icon: BranchesIcon,
    color: '#4caf50',
    badge: null,
  },
  {
    title: 'Manutenção',
    description: 'Registo de custos de manutenção preventiva e corretiva',
    path: '/expenses/maintenance',
    icon: MaintenanceIcon,
    color: '#ff9800',
    badge: null,
  },
  {
    title: 'Equipamento',
    description: 'Despesas de aquisição e reparação de equipamentos',
    path: '/expenses/equipment',
    icon: ConstructionIcon,
    color: '#9c27b0',
    badge: null,
  },
];

const CategoryCard = ({ item }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const Icon = item.icon;

  return (
    <Card
      sx={{
        height: '100%',
        border: `1px solid ${alpha(item.color, 0.2)}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${alpha(item.color, 0.2)}`,
        },
      }}
    >
      <CardActionArea sx={{ height: '100%' }} onClick={() => navigate(item.path)}>
        <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box
              sx={{
                width: 52, height: 52, borderRadius: 2.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `linear-gradient(135deg, ${alpha(item.color, 0.2)}, ${alpha(item.color, 0.1)})`,
                border: `1px solid ${alpha(item.color, 0.3)}`,
              }}
            >
              <Icon sx={{ color: item.color, fontSize: 28 }} />
            </Box>
            {item.badge && <Chip label={item.badge} size="small" color="error" />}
          </Box>
          <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: item.color }}>
            {item.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, mb: 2 }}>
            {item.description}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', color: item.color }}>
            <Typography variant="caption" fontWeight={600}>Aceder</Typography>
            <ArrowIcon sx={{ fontSize: 16, ml: 0.5 }} />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

const ExpensesHubPage = () => (
  <ModulePage
    title="Despesas"
    subtitle="Gestão centralizada de todas as categorias de despesa"
    icon={HubIcon}
    color="#607d8b"
    breadcrumbs={[
      { label: 'Gestão', path: '/expenses' },
      { label: 'Despesas', path: '/expenses' },
    ]}
  >
    <Grid container spacing={3}>
      {CATEGORIES.map((cat) => (
        <Grid key={cat.path} size={{ xs: 12, sm: 6, md: 3 }}>
          <CategoryCard item={cat} />
        </Grid>
      ))}
    </Grid>
  </ModulePage>
);

export default ExpensesHubPage;
