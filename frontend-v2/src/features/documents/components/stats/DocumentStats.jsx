import React, { useMemo } from 'react';
import { Grid, Box } from '@mui/material';
import {
  Description as DocumentIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import StatCard from './StatCard';
import { useDocuments } from '../../hooks/useDocuments';
import { useDocumentsStore } from '../../store/documentsStore';
import { useAuth } from '@/core/contexts/AuthContext';
import { usePermissionContext } from '@/core/contexts/PermissionContext';

/**
 * Statistics Dashboard for Documents
 * Each card acts as a tab selector (4 cards = 4 tabs)
 */
const DocumentStats = () => {
  const { activeTab, setActiveTab } = useDocumentsStore();
  const { user } = useAuth();
  const { hasPermission } = usePermissionContext();

  // Perfis restritos (município) usam endpoint filtrado por associado
  const isRestrictedProfile = user ? String(user.profil ?? '') !== '0' && String(user.profil ?? '') !== '1' : null;

  // Tab "Todos": restrito → 'associate', admin → 'all', null (a carregar) → null
  const allType = isRestrictedProfile === null ? null : (isRestrictedProfile ? 'associate' : 'all');
  // Tab "Em Atraso": só visível para quem tem docs.view.all
  const lateType = (!isRestrictedProfile && hasPermission('docs.view.all')) ? 'late' : null;

  const { data: allDocs, isLoading: loadingAll } = useDocuments(allType, { enabled: allType !== null });
  const canViewAssigned = hasPermission('docs.view.assigned');
  const canViewOwner = hasPermission('docs.view.owner');

  const { data: assignedDocs, isLoading: loadingAssigned } = useDocuments('assigned', { enabled: canViewAssigned });
  const { data: createdDocs, isLoading: loadingCreated } = useDocuments('created', { enabled: canViewOwner });
  const { data: lateDocs, isLoading: loadingLate } = useDocuments(lateType ?? 'late', { enabled: lateType !== null });

  const allDocsArr = Array.isArray(allDocs) ? allDocs : (allDocs?.results ?? []);
  const assignedDocsArr = Array.isArray(assignedDocs) ? assignedDocs : (assignedDocs?.results ?? []);
  const createdDocsArr = Array.isArray(createdDocs) ? createdDocs : (createdDocs?.results ?? []);
  const lateDocsArr = Array.isArray(lateDocs) ? lateDocs : (lateDocs?.results ?? []);

  const notificationCount = useMemo(
    () => assignedDocsArr.filter((doc) => doc.notification === 1).length,
    [assignedDocsArr]
  );

  const stats = [
    {
      tabIndex: 0,
      title: isRestrictedProfile ? 'Pedidos do Município' : 'Total de Pedidos',
      value: allDocsArr.length,
      icon: <DocumentIcon />,
      color: 'primary.main',
      loading: loadingAll,
      visible: true,
    },
    {
      tabIndex: 1,
      title: 'Para Tratamento',
      value: assignedDocsArr.length,
      icon: <AssignmentIcon />,
      color: 'secondary.main',
      notificationCount,
      loading: loadingAssigned,
      visible: canViewAssigned,
    },
    {
      tabIndex: 2,
      title: 'Criados por Mim',
      value: createdDocsArr.length,
      icon: <TimelineIcon />,
      color: 'info.main',
      loading: loadingCreated,
      visible: canViewOwner,
    },
    {
      tabIndex: 3,
      title: 'Em Atraso',
      value: lateDocsArr.length,
      icon: <WarningIcon />,
      color: 'error.main',
      loading: loadingLate,
      visible: !isRestrictedProfile, // Oculto para perfis restritos
    },
  ].filter((s) => s.visible);

  return (
    <Box>
      <Grid container spacing={2}>
        {stats.map(({ tabIndex, visible: _visible, ...stat }) => (
          <Grid key={tabIndex} size={{ xs: 6, sm: 6, md: Math.floor(12 / stats.length) }}>
            <StatCard
              {...stat}
              active={activeTab === tabIndex}
              onClick={() => setActiveTab(tabIndex)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DocumentStats;
