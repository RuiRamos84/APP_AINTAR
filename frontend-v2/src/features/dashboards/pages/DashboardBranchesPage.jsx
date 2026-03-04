/**
 * DashboardBranchesPage
 * Dashboard de Ramais (metros construídos, estado, municípios)
 */

import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DashboardCategoryPage from '../components/DashboardCategoryPage';

const VIEWS = [
  { name: 'vds_ramal_01$001', label: 'Por Estado', chartType: 'pie' },
  { name: 'vds_ramal_01$002', label: 'Metros Construídos por Ano', chartType: 'bar' },
  { name: 'vds_ramal_01$003', label: 'Metros por Mês (Ano Corrente)', chartType: 'line' },
  { name: 'vds_ramal_01$004', label: 'Pedidos por Município', chartType: 'bar' },
  { name: 'vds_ramal_01$005', label: 'Extensão de Rede por Ano', chartType: 'bar' },
  { name: 'vds_ramal_01$006', label: 'Extensão de Rede por Mês (Ano Corrente)', chartType: 'line' },
];

export const DashboardBranchesPage = () => (
  <DashboardCategoryPage
    title="Dashboard — Ramais"
    subtitle="Estatísticas de construção e estado dos ramais"
    icon={AccountTreeIcon}
    color="#4caf50"
    breadcrumbs={[
      { label: 'Dashboards', path: '/dashboards/overview' },
      { label: 'Ramais', path: '/dashboards/branches' },
    ]}
    category="ramais"
    views={VIEWS}
  />
);

export default DashboardBranchesPage;
