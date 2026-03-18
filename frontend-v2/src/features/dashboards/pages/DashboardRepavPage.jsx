/**
 * DashboardRepavPage — Repavimentações
 */
import RoadIcon from '@mui/icons-material/Traffic';
import DashboardCategoryPage from '../components/DashboardCategoryPage';

const VIEWS = [
  { name: 'vds_repav_01$001', label: 'Por Estado', chartType: 'pie' },
  { name: 'vds_repav_01$002', label: 'Área por Ano', chartType: 'bar' },  // multi-série com nulls → bar
  { name: 'vds_repav_01$003', label: 'Área por Mês', chartType: 'area' },
  { name: 'vds_repav_01$004', label: 'Área por Semana', chartType: 'bar' },
];

export const DashboardRepavPage = () => (
  <DashboardCategoryPage
    title="Dashboard — Repavimentações"
    subtitle="Pedidos e áreas de repavimentação por estado e período"
    icon={RoadIcon}
    color="#795548"
    breadcrumbs={[{ label: 'Repavimentações', path: '/dashboards/repav' }]}
    category="repavimentacoes"
    views={VIEWS}
  />
);

export default DashboardRepavPage;
