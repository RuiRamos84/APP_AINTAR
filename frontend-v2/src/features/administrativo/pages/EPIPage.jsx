/**
 * EPI Page - Módulo Administrativo
 * Gestão de Equipamentos de Proteção Individual
 */

import { Box, Typography, Paper, Alert } from '@mui/material';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import WorkIcon from '@mui/icons-material/Work';

export const EPIPage = () => {
  return (
    <ModulePage
      title="Gestão de EPI"
      subtitle="Equipamentos de Proteção Individual"
      icon={WorkIcon}
      color="#607d8b"
      breadcrumbs={[
        { label: 'Administrativo', path: '/epi' },
        { label: 'Gestão de EPI', path: '/epi' },
      ]}
    >
      <Paper sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Página de demonstração - Módulo Administrativo
        </Alert>

        <Typography variant="body1" paragraph>
          Sistema de gestão de EPIs incluirá:
        </Typography>

        <Box component="ul" sx={{ pl: 3 }}>
          <li>
            <Typography variant="body2" gutterBottom>
              Controlo de stock de equipamentos
            </Typography>
          </li>
          <li>
            <Typography variant="body2" gutterBottom>
              Atribuição de EPIs aos colaboradores
            </Typography>
          </li>
          <li>
            <Typography variant="body2" gutterBottom>
              Rastreamento de validades e substituições
            </Typography>
          </li>
          <li>
            <Typography variant="body2" gutterBottom>
              Relatórios de conformidade
            </Typography>
          </li>
        </Box>
      </Paper>
    </ModulePage>
  );
};

export default EPIPage;
