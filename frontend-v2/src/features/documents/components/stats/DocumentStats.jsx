import React, { useMemo } from 'react';
import { Grid, Box } from '@mui/material';
import {
  Description as DocumentIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import StatCard from './StatCard';
import { useDocuments } from '../../hooks/useDocuments';
import { useDocumentsStore } from '../../store/documentsStore';
import { useMetaData } from '@/core/hooks/useMetaData';
import { getStatusName } from '../../utils/statusUtils';

/**
 * Statistics Dashboard for Documents
 * Shows 4 stat cards: Total, Assigned, Completed, Created by user
 */
const DocumentStats = () => {
  const { setActiveTab } = useDocumentsStore();
  const { data: metaData } = useMetaData();

  const { data: allDocs, isLoading: loadingAll } = useDocuments('all');
  const { data: assignedDocs, isLoading: loadingAssigned } = useDocuments('assigned');
  const { data: createdDocs, isLoading: loadingCreated } = useDocuments('created');

  // Safely extract arrays (API may return object with results key)
  const allDocsArr = Array.isArray(allDocs) ? allDocs : (allDocs?.results ?? []);
  const assignedDocsArr = Array.isArray(assignedDocs) ? assignedDocs : (assignedDocs?.results ?? []);
  const createdDocsArr = Array.isArray(createdDocs) ? createdDocs : (createdDocs?.results ?? []);

  const notificationCount = useMemo(() => {
    return assignedDocsArr.filter((doc) => doc.notification === 1).length;
  }, [assignedDocsArr]);

  const completedCount = useMemo(() => {
    return allDocsArr.filter((doc) => doc.what === 0).length;
  }, [allDocsArr]);

  const completedLabel = useMemo(() => {
    return getStatusName(0, metaData?.what) || 'Concluídos';
  }, [metaData]);

  const stats = [
    {
      title: 'Total de Pedidos',
      value: allDocsArr.length,
      icon: <DocumentIcon />,
      color: 'primary.main',
      onClick: () => setActiveTab(0),
      loading: loadingAll,
    },
    {
      title: 'Para Tratamento',
      value: assignedDocsArr.length,
      icon: <AssignmentIcon />,
      color: 'secondary.main',
      notificationCount,
      onClick: () => setActiveTab(1),
      loading: loadingAssigned,
    },
    {
      title: completedLabel,
      value: completedCount,
      icon: <CheckCircleIcon />,
      color: 'success.main',
      loading: loadingAll,
    },
    {
      title: 'Criados por Mim',
      value: createdDocsArr.length,
      icon: <TimelineIcon />,
      color: 'info.main',
      onClick: () => setActiveTab(2),
      loading: loadingCreated,
    },
  ];

  return (
    <Box sx={{ mb: 2 }}>
      <Grid container spacing={2}>
        {stats.map((stat, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DocumentStats;
