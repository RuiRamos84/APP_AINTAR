/**
 * Branches Page - Módulo Operação
 * Página de gestão de ramais
 */

import { Box, Typography, Paper, Alert } from '@mui/material';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import CableIcon from '@mui/icons-material/Cable';

export const BranchesPage = () => {
  return (
    <ModulePage
      title="Ramais"
      subtitle="Gestão e acompanhamento de ramais de ligação"
      icon={CableIcon}
      color="#2196f3"
      breadcrumbs={[
        { label: 'Operação', path: '/tasks' },
        { label: 'Ramais', path: '/branches' },
      ]}
    >
      <Paper sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Esta é uma página de demonstração do sistema de navegação híbrida.
        </Alert>

        <Typography variant="body1" paragraph>
          Aqui será implementada a gestão completa de ramais, incluindo:
        </Typography>

        <Box component="ul" sx={{ pl: 3 }}>
          <li>
            <Typography variant="body2" gutterBottom>
              Cadastro e edição de ramais
            </Typography>
          </li>
          <li>
            <Typography variant="body2" gutterBottom>
              Acompanhamento de estados (projeto, construção, concluído)
            </Typography>
          </li>
          <li>
            <Typography variant="body2" gutterBottom>
              Visualização por município
            </Typography>
          </li>
          <li>
            <Typography variant="body2" gutterBottom>
              Histórico de intervenções
            </Typography>
          </li>
        </Box>
      </Paper>
    </ModulePage>
  );
};

export default BranchesPage;
