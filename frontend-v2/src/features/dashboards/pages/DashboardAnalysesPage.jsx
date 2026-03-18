/**
 * DashboardAnalysesPage
 * Dashboard de Análises (por ano, município, parâmetro)
 */

import ScienceIcon from '@mui/icons-material/Science';
import DashboardCategoryPage from '../components/DashboardCategoryPage';

const VIEWS = [
  { name: 'vds_analise_01$001', label: 'Por Ano', chartType: 'bar' },
  { name: 'vds_analise_01$002', label: 'Por Município', chartType: 'bar' },
  { name: 'vds_analise_01$003', label: 'Por Ano e Município', chartType: 'bar' },
  { name: 'vds_analise_01$004', label: 'Por Município e Parâmetro', chartType: 'bar' },
  { name: 'vds_analise_01$005', label: 'Por Ano e Parâmetro', chartType: 'bar' },
];

export const DashboardAnalysesPage = () => (
  <DashboardCategoryPage
    title="Dashboard — Análises"
    subtitle="Estatísticas de análises por ano, município e parâmetro"
    icon={ScienceIcon}
    color="#00bcd4"
    breadcrumbs={[
      { label: 'Dashboards', path: '/dashboards/overview' },
      { label: 'Análises', path: '/dashboards/analyses' },
    ]}
    category="analises"
    views={VIEWS}
  />
);

export default DashboardAnalysesPage;
