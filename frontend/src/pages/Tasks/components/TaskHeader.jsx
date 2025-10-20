import React from 'react';
import { Box, Typography, Chip, IconButton } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import { getPriorityIcons } from '../utils';
import { getChipStyles, getTypographyStyles } from '../styles/themeHelpers';

/**
 * Componente de cabeçalho do modal de tarefa
 * Exibe informações principais: nome, data, cliente, responsável, status, prioridade
 */
const TaskHeader = ({
  task,
  isDarkMode,
  theme,
  getStatusName,
  getStatusColor,
  onClose
}) => {
  if (!task) return null;

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: isDarkMode ? theme.palette.background.paper : 'background.paper',
        borderBottom: 1,
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative'
      }}
    >
      {/* Barra pulsante para notificações */}
      {task.notification_owner === 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: '0px',
            left: '0px',
            width: '100%',
            height: '4px',
            bgcolor: 'error.main',
            animation: 'pulse 1.5s infinite'
          }}
        />
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Typography
          variant="h5"
          component="h2"
          sx={getTypographyStyles(isDarkMode)}
        >
          {task.name || 'Sem nome'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={<CalendarMonthIcon />}
            label={task.when_start ? new Date(task.when_start).toLocaleDateString() : '-'}
            size="small"
            variant="outlined"
            sx={getChipStyles(isDarkMode)}
          />

          <Chip
            label={`Cliente: ${task.ts_client_name || 'Desconhecido'}`}
            size="small"
            variant="outlined"
            sx={getChipStyles(isDarkMode)}
          />

          <Chip
            icon={<PersonIcon />}
            label={`Responsável: ${task.owner_name || 'Não atribuído'}`}
            size="small"
            variant="outlined"
            sx={getChipStyles(isDarkMode)}
          />

          <Chip
            label={getStatusName(task.ts_notestatus)}
            color={getStatusColor(getStatusName(task.ts_notestatus))}
            size="small"
            sx={{
              color: isDarkMode ? 'white' : undefined,
              fontWeight: isDarkMode ? 'medium' : undefined
            }}
          />

          {task.when_stop && (
            <Chip
              label={'Fechada em: ' + new Date(task.when_stop).toLocaleDateString()}
              color="success"
              size="small"
              sx={{
                color: isDarkMode ? 'white' : undefined,
                fontWeight: isDarkMode ? 'medium' : undefined
              }}
            />
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box>{getPriorityIcons(task.ts_priority)}</Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: isDarkMode ? 'white' : undefined }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default TaskHeader;
