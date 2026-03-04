/**
 * DashboardSepticTanksPage
 * Dashboard de Fossas Sépticas (esvaziamentos, municípios, duração)
 */

import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import DashboardCategoryPage from '../components/DashboardCategoryPage';

const VIEWS = [
  { name: 'vds_fossa_01$001', label: 'Por Estado', chartType: 'pie' },
  { name: 'vds_fossa_01$002', label: 'Por Município e Ano', chartType: 'bar' },
  { name: 'vds_fossa_01$003', label: 'Por Mês (Ano Corrente)', chartType: 'line' },
  { name: 'vds_fossa_01$004', label: 'Duração (dias) por Ano e Município', chartType: 'bar' },
];

export const DashboardSepticTanksPage = () => (
  <DashboardCategoryPage
    title="Dashboard — Fossas Sépticas"
    subtitle="Controlo de esvaziamentos e gestão de fossas sépticas"
    icon={CleaningServicesIcon}
    color="#ff9800"
    breadcrumbs={[
      { label: 'Dashboards', path: '/dashboards/overview' },
      { label: 'Fossas Sépticas', path: '/dashboards/septic-tanks' },
    ]}
    category="fossas"
    views={VIEWS}
  />
);

export default DashboardSepticTanksPage;
