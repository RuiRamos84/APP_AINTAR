import React, { useMemo } from 'react';
import { Box, Chip } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import TodayIcon from '@mui/icons-material/Today';
import FlagIcon from '@mui/icons-material/Flag';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';

/**
 * Quick Filters - Filtros rápidos por chips
 * Permite filtrar tarefas por: Todas, Com Notificações, Esta Semana, Atrasadas, Prioridade Alta
 */
const QuickFilters = ({ tasks, activeFilter, onFilterChange, isDarkMode, user }) => {
  // Calcular contadores
  const counts = useMemo(() => {
    const allTasks = Object.values(tasks).flatMap(client =>
      Object.values(client.tasks).flat()
    );

    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    return {
      all: allTasks.length,
      notifications: allTasks.filter(t =>
        (t.notification_owner === 1 && t.owner === user?.user_id) ||
        (t.notification_client === 1 && t.ts_client === user?.user_id)
      ).length,
      thisWeek: allTasks.filter(t => {
        if (!t.when_start) return false;
        const taskDate = new Date(t.when_start);
        return taskDate >= weekStart && taskDate <= weekEnd;
      }).length,
      overdue: allTasks.filter(t => {
        if (t.when_stop) return false; // Já concluída
        if (!t.when_start) return false;
        const dueDate = new Date(t.when_start);
        return dueDate < new Date() && t.ts_notestatus !== 3; // Não concluída e atrasada
      }).length,
      highPriority: allTasks.filter(t => t.ts_priority === 3).length
    };
  }, [tasks, user?.user_id]);

  const filters = [
    {
      id: 'all',
      label: 'Todas',
      icon: <AllInclusiveIcon />,
      count: counts.all
    },
    {
      id: 'notifications',
      label: 'Com Notificações',
      icon: <NotificationsActiveIcon />,
      count: counts.notifications,
      color: 'error'
    },
    {
      id: 'thisWeek',
      label: 'Esta Semana',
      icon: <TodayIcon />,
      count: counts.thisWeek,
      color: 'info'
    },
    {
      id: 'overdue',
      label: 'Atrasadas',
      icon: <EventBusyIcon />,
      count: counts.overdue,
      color: 'warning'
    },
    {
      id: 'highPriority',
      label: 'Prioridade Alta',
      icon: <FlagIcon />,
      count: counts.highPriority,
      color: 'secondary'
    }
  ];

  return (
    <Box sx={{
      display: 'flex',
      gap: 1,
      mb: 3,
      flexWrap: 'wrap',
      px: 1,
      justifyContent: { xs: 'center', sm: 'flex-start' }
    }}>
      {filters.map(filter => (
        <Chip
          key={filter.id}
          label={`${filter.label} (${filter.count})`}
          icon={filter.icon}
          onClick={() => onFilterChange(filter.id)}
          color={activeFilter === filter.id ? (filter.color || 'primary') : 'default'}
          variant={activeFilter === filter.id ? 'filled' : 'outlined'}
          size="medium"
          sx={{
            fontWeight: activeFilter === filter.id ? 'bold' : 'normal',
            bgcolor: activeFilter === filter.id
              ? undefined
              : (isDarkMode ? 'rgba(255, 255, 255, 0.05)' : undefined),
            borderColor: isDarkMode && activeFilter !== filter.id
              ? 'rgba(255, 255, 255, 0.2)'
              : undefined,
            color: isDarkMode && activeFilter !== filter.id
              ? 'rgba(255, 255, 255, 0.8)'
              : undefined,
            '&:hover': {
              transform: 'scale(1.05)',
              transition: 'transform 0.2s',
              bgcolor: activeFilter === filter.id
                ? undefined
                : (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'action.hover')
            }
          }}
        />
      ))}
    </Box>
  );
};

export default QuickFilters;
