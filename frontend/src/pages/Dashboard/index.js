import DashboardModern from './DashboardModern';

// Exportar o dashboard moderno como padrão
export default DashboardModern;

// Manter a versão antiga disponível para fallback se necessário
export { default as DashboardLegacy } from './Dashboard';
