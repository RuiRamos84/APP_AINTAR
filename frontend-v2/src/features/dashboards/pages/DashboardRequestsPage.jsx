/**
 * DashboardRequestsPage
 * Dashboard de Pedidos (tramitações, estados, técnicos)
 */

import AssignmentIcon from '@mui/icons-material/Assignment';
import DashboardCategoryPage from '../components/DashboardCategoryPage';

const VIEWS = [
  { name: 'vds_pedido_01$001', label: 'Por Tipo', chartType: 'pie' },
  { name: 'vds_pedido_01$002', label: 'Por Tipo e Ano', chartType: 'bar' },
  { name: 'vds_pedido_01$003', label: 'Total vs Concluídos por Tipo', chartType: 'bar' },
  { name: 'vds_pedido_01$005', label: 'Total vs Concluídos por Ano', chartType: 'line' },
  { name: 'vds_pedido_01$006', label: 'Por Município', chartType: 'bar' },
  { name: 'vds_pedido_01$010', label: 'Por Estado Corrente', chartType: 'bar-h' },  // 23 linhas → horizontal
  { name: 'vds_pedido_01$012', label: 'Por Utilizador', chartType: 'bar-h' },        // 26 linhas → horizontal
  { name: 'vds_pedido_01$014', label: 'Tramitações por Utilizador', chartType: 'bar-h' }, // 30 linhas → horizontal
  { name: 'vds_pedido_01$016', label: 'Duração Média por Passo (Ano)', chartType: 'bar' }, // pivot anos → bar não line
  { name: 'vds_pedido_01$017', label: 'Duração Média por Técnico', chartType: 'bar' },
];

export const DashboardRequestsPage = () => (
  <DashboardCategoryPage
    title="Dashboard — Pedidos"
    subtitle="Análise de pedidos, tramitações e desempenho por técnico"
    icon={AssignmentIcon}
    color="#2196f3"
    breadcrumbs={[
      { label: 'Dashboards', path: '/dashboards/overview' },
      { label: 'Pedidos', path: '/dashboards/requests' },
    ]}
    category="pedidos"
    views={VIEWS}
  />
);

export default DashboardRequestsPage;
