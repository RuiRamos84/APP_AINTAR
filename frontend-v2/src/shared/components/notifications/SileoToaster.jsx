/**
 * SileoToaster Component
 * Componente Toaster do Sileo — montado apenas enquanto o módulo Sistema
 * está ativo (ver features/admin/components/AdminNotificationLab.jsx).
 * Import isolado aqui para que o CSS/JS do Sileo só entre no bundle
 * quando este componente é carregado (lazy) pela rota /admin/*.
 */

import { Toaster } from 'sileo';
import 'sileo/styles.css';
import { useUIStore } from '@/core/store/uiStore';

export const SileoToaster = () => {
  const theme = useUIStore((state) => state.theme);

  return <Toaster position="top-right" theme={theme === 'dark' ? 'dark' : 'light'} />;
};

export default SileoToaster;
