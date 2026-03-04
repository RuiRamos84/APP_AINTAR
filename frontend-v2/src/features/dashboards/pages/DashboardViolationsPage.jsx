/**
 * DashboardViolationsPage
 * Dashboard de Incumprimentos (gravidade, parâmetros, concelhos)
 */

import WarningIcon from '@mui/icons-material/Warning';
import DashboardCategoryPage from '../components/DashboardCategoryPage';

const VIEWS = [
  { name: 'vds_incumprimento_01$001', label: 'Por Ano', chartType: 'bar' },
  { name: 'vds_incumprimento_01$002', label: 'Por Município', chartType: 'bar' },
  { name: 'vds_incumprimento_01$003', label: 'Por Parâmetro e Município', chartType: 'bar' },
  { name: 'vds_incumprimento_01$004', label: 'Por Ano e Município', chartType: 'bar' },
  { name: 'vds_incumprimento_01$005', label: 'Por Ano e Parâmetro', chartType: 'bar' },
  { name: 'vds_incumprimento_01$006', label: 'Por Gravidade', chartType: 'pie' },
  { name: 'vds_incumprimento_01$007', label: 'Por Ano e Gravidade', chartType: 'bar' },
  { name: 'vds_incumprimento_01$008', label: 'Por Parâmetro e Gravidade', chartType: 'bar' },
  { name: 'vds_incumprimento_01$009', label: 'Por Município e Gravidade', chartType: 'bar' },
];

export const DashboardViolationsPage = () => (
  <DashboardCategoryPage
    title="Dashboard — Incumprimentos"
    subtitle="Análise de incumprimentos por gravidade, parâmetro e concelho"
    icon={WarningIcon}
    color="#f44336"
    breadcrumbs={[
      { label: 'Dashboards', path: '/dashboards/overview' },
      { label: 'Incumprimentos', path: '/dashboards/violations' },
    ]}
    category="incumprimentos"
    views={VIEWS}
  />
);

export default DashboardViolationsPage;
