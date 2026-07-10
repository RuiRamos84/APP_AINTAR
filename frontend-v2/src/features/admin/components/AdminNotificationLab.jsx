/**
 * AdminNotificationLab
 * Teste A/B do motor de notificações: ativa 'sileo' apenas dentro do módulo
 * Sistema (rotas /admin/*, uso exclusivo do admin). Fora deste scope o resto
 * da app mantém-se sempre em 'sonner' (produção) — ver core/services/notification/engine.js.
 *
 * Ao sair do módulo (unmount), repõe 'sonner' para não afetar o resto da app
 * numa mesma sessão de navegação.
 */

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { setActiveEngine } from '@/core/services/notification/engine';
import { SileoToaster } from '@/shared/components/notifications/SileoToaster';

export default function AdminNotificationLab() {
  useEffect(() => {
    setActiveEngine('sileo');
    return () => setActiveEngine('sonner');
  }, []);

  return (
    <>
      <SileoToaster />
      <Outlet />
    </>
  );
}
