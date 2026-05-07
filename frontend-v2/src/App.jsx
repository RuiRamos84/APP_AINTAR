/**
 * App Component
 * Ponto de entrada — delega para BackofficeRoutes ou PortalRoutes
 * consoante o hostname (detecção em appContext.js).
 *
 * ✨ Para testar o portal em dev:
 *   Adicionar VITE_APP_CONTEXT=portal no .env.development
 *
 * ✨ SISTEMA DINÂMICO DE PERMISSÕES (backoffice):
 * - Todas as permissões são definidas em routeConfig.js
 * - ProtectedRoute consulta automaticamente a permissão necessária
 */

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { pt } from 'date-fns/locale';

import { IS_PORTAL } from '@/core/config/appContext';
import BackofficeRoutes from '@/core/routing/BackofficeRoutes';
import PortalRoutes from '@/core/routing/PortalRoutes';

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={pt}>
      {IS_PORTAL ? <PortalRoutes /> : <BackofficeRoutes />}
    </LocalizationProvider>
  );
}

export default App;
