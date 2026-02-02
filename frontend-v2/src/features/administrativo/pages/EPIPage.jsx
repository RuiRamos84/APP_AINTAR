/**
 * EPI Page - Módulo Administrativo
 * Gestão de Equipamentos de Proteção Individual
 */

import { ModulePage } from '@/shared/components/layout/ModulePage';
import { EpiArea } from '@/features/epi/components';

export const EPIPage = () => {
  return (
    <ModulePage
      breadcrumbs={[
        { label: 'Administrativo', path: '/administrativo' },
        { label: 'Gestão de EPI', path: '/epi' },
      ]}
    >
      <EpiArea />
    </ModulePage>
  );
};

export default EPIPage;
