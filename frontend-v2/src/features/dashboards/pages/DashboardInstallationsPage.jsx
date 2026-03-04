/**
 * DashboardInstallationsPage
 * Dashboard de Instalações (tipos, operadores, duração, municípios)
 */

import ConstructionIcon from '@mui/icons-material/Construction';
import DashboardCategoryPage from '../components/DashboardCategoryPage';

const VIEWS = [
  { name: 'vds_instalacao_01$001', label: 'Por Tipo de Instalação', chartType: 'bar' },
  { name: 'vds_instalacao_01$002', label: 'Por Tipo (Ano Corrente)', chartType: 'bar' },
  { name: 'vds_instalacao_01$003', label: 'Por Tipo de Operação', chartType: 'bar' },
  { name: 'vds_instalacao_01$005', label: 'Por Operador', chartType: 'bar' },
  { name: 'vds_instalacao_01$006', label: 'Por Operador (Ano Corrente)', chartType: 'bar' },
  { name: 'vds_instalacao_01$007', label: 'Duração por Tipo', chartType: 'bar' },
  { name: 'vds_instalacao_01$009', label: 'Duração por Operação', chartType: 'bar' },
  { name: 'vds_instalacao_01$011', label: 'Duração por Operador', chartType: 'bar' },
  { name: 'vds_instalacao_01$013', label: 'Por Município', chartType: 'bar' },
  { name: 'vds_instalacao_01$015', label: 'Por Município e Tipo', chartType: 'bar' },
];

export const DashboardInstallationsPage = () => (
  <DashboardCategoryPage
    title="Dashboard — Instalações"
    subtitle="Controlo de instalações por tipo, operador e município"
    icon={ConstructionIcon}
    color="#9c27b0"
    breadcrumbs={[
      { label: 'Dashboards', path: '/dashboards/overview' },
      { label: 'Instalações', path: '/dashboards/installations' },
    ]}
    category="instalacoes"
    views={VIEWS}
  />
);

export default DashboardInstallationsPage;
