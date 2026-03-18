import { useTheme } from '@mui/material/styles';
import { Settings as EquipmentIcon } from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import ExpensePage from '../components/ExpensePage';
import { useEquipExpenses } from '../hooks/useExpenses';

const EquipmentPage = () => {
  const theme = useTheme();

  return (
    <ModulePage
      title="Equipamento Básico"
      icon={EquipmentIcon}
      color={theme.palette.warning.main}
      breadcrumbs={[
        { label: 'Início', path: '/home' },
        { label: 'Área Interna', path: '/internal' },
        { label: 'Equipamento Básico' },
      ]}
    >
      <ExpensePage
        useHook={useEquipExpenses}
        color={theme.palette.warning.main}
      />
    </ModulePage>
  );
};

export default EquipmentPage;
