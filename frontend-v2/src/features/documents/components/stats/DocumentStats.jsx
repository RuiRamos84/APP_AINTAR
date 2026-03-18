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

/**
 * Statistics Dashboard for Documents
 * Each card acts as a tab selector (4 cards = 4 tabs)
 */
const DocumentStats = () => {
  const { activeTab, setActiveTab } = useDocumentsStore();

  const { data: allDocs, isLoading: loadingAll } = useDocuments('all');
  const { data: assignedDocs, isLoading: loadingAssigned } = useDocuments('assigned');
  const { data: createdDocs, isLoading: loadingCreated } = useDocuments('created');
  const { data: lateDocs, isLoading: loadingLate } = useDocuments('late');

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
      title: 'Total de Pedidos',
      value: allDocsArr.length,
      icon: <DocumentIcon />,
      color: 'primary.main',
      loading: loadingAll,
    },
    {
      tabIndex: 1,
      title: 'Para Tratamento',
      value: assignedDocsArr.length,
      icon: <AssignmentIcon />,
      color: 'secondary.main',
      notificationCount,
      loading: loadingAssigned,
    },
    {
      tabIndex: 2,
      title: 'Criados por Mim',
      value: createdDocsArr.length,
      icon: <TimelineIcon />,
      color: 'info.main',
      loading: loadingCreated,
    },
    {
      tabIndex: 3,
      title: 'Em Atraso',
      value: lateDocsArr.length,
      icon: <WarningIcon />,
      color: 'error.main',
      loading: loadingLate,
    },
  ];

  return (
    <Box>
      <Grid container spacing={2}>
        {stats.map(({ tabIndex, ...stat }) => (
          <Grid key={tabIndex} size={{ xs: 6, sm: 6, md: 3 }}>
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
