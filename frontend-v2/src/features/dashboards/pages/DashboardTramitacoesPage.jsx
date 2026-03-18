/**
 * DashboardTramitacoesPage — Tramitações por utilizador
 */
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import DashboardCategoryPage from '../components/DashboardCategoryPage';

const VIEWS = [
  { name: 'vds_tramitacao_01$001', label: 'Por Utilizador', chartType: 'bar-h' },
  { name: 'vds_tramitacao_01$002', label: 'Por Utilizador e Ano', chartType: 'bar' },
  { name: 'vds_tramitacao_01$003', label: 'Por Utilizador e Mês', chartType: 'table' }, // 354 linhas multi-dim → tabela
];

export const DashboardTramitacoesPage = () => (
  <DashboardCategoryPage
    title="Dashboard — Tramitações"
    subtitle="Volume de tramitações por utilizador e período"
    icon={SwapHorizIcon}
    color="#607D8B"
    breadcrumbs={[{ label: 'Tramitações', path: '/dashboards/tramitacoes' }]}
    category="tramitacoes"
    views={VIEWS}
  />
);

export default DashboardTramitacoesPage;
