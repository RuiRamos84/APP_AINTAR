/**
 * ETAR Page - Módulo Gestão
 * Página de gestão de Estações de Tratamento de Águas Residuais
 */

import { Box, Grid, Card, CardContent, Typography, Chip } from '@mui/material';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import FactoryIcon from '@mui/icons-material/Factory';

const mockETARs = [
  {
    id: 1,
    name: 'ETAR Rio de Mouro',
    capacity: 15000,
    currentFlow: 12000,
    status: 'Operacional',
    lastMaintenance: '2025-01-15',
  },
  {
    id: 2,
    name: 'ETAR Cascais',
    capacity: 25000,
    currentFlow: 20000,
    status: 'Operacional',
    lastMaintenance: '2025-01-10',
  },
  {
    id: 3,
    name: 'ETAR Sintra',
    capacity: 18000,
    currentFlow: 8000,
    status: 'Manutenção',
    lastMaintenance: '2025-01-20',
  },
];

export const ETARPage = () => {
  return (
    <ModulePage
      title="ETAR"
      subtitle="Estações de Tratamento de Águas Residuais"
      icon={FactoryIcon}
      color="#4caf50"
      breadcrumbs={[
        { label: 'Gestão', path: '/etar' },
        { label: 'ETAR', path: '/etar' },
      ]}
    >
      <Grid container spacing={3}>
        {mockETARs.map((etar) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={etar.id}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight={600}>
                    {etar.name}
                  </Typography>
                  <Chip
                    label={etar.status}
                    color={etar.status === 'Operacional' ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Capacidade:</strong> {etar.capacity.toLocaleString()} m³/dia
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Caudal Atual:</strong> {etar.currentFlow.toLocaleString()} m³/dia
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Utilização:</strong>{' '}
                  {((etar.currentFlow / etar.capacity) * 100).toFixed(1)}%
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  <strong>Última Manutenção:</strong> {etar.lastMaintenance}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </ModulePage>
  );
};

export default ETARPage;
