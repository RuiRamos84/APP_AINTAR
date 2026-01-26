/**
 * Clients Page - Módulo Pagamentos
 * Página de gestão de clientes
 */

import { Box, Typography, Paper, Alert } from '@mui/material';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

export const ClientsPage = () => {
  return (
    <ModulePage
      title="Clientes"
      subtitle="Gestão de clientes e contratos"
      icon={PersonAddIcon}
      color="#ff9800"
      breadcrumbs={[
        { label: 'Pagamentos', path: '/clients' },
        { label: 'Clientes', path: '/clients' },
      ]}
    >
      <Paper sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Página de demonstração - Módulo Pagamentos
        </Alert>

        <Typography variant="body1" paragraph>
          Funcionalidades a implementar:
        </Typography>

        <Box component="ul" sx={{ pl: 3 }}>
          <li>
            <Typography variant="body2" gutterBottom>
              Cadastro de clientes (particulares e empresas)
            </Typography>
          </li>
          <li>
            <Typography variant="body2" gutterBottom>
              Gestão de contratos de fornecimento
            </Typography>
          </li>
          <li>
            <Typography variant="body2" gutterBottom>
              Histórico de faturas e pagamentos
            </Typography>
          </li>
          <li>
            <Typography variant="body2" gutterBottom>
              Consulta de consumos
            </Typography>
          </li>
        </Box>
      </Paper>
    </ModulePage>
  );
};

export default ClientsPage;
