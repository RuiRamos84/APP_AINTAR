import { useTheme } from '@mui/material/styles';
import { Build as MaintenanceIcon } from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import ExpensePage from '../components/ExpensePage';
import { useManutExpenses } from '../hooks/useExpenses';

const MaintenancePage = () => {
  const theme = useTheme();

  return (
    <ModulePage
      title="Manutenção"
      icon={MaintenanceIcon}
      color={theme.palette.success.main}
      breadcrumbs={[
        { label: 'Início', path: '/home' },
        { label: 'Área Interna', path: '/internal' },
        { label: 'Manutenção' },
      ]}
    >
      <ExpensePage
        useHook={useManutExpenses}
        color={theme.palette.success.main}
      />
    </ModulePage>
  );
};

export default MaintenancePage;
