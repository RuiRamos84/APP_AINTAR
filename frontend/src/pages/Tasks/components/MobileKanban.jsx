import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, Typography, useMediaQuery, useTheme } from '@mui/material';
import TaskColumn from '../TaskColumn';

/**
 * Componente Kanban otimizado para mobile
 * Em mobile: exibe tabs para alternar entre colunas
 * Em desktop: exibe 3 colunas lado a lado
 */
const MobileKanban = ({ statuses, tasks, onTaskClick, moveTask, isMovingTask, isDarkMode, clientName }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);

  // Função para obter tarefas por status
  const getTasksByStatus = (statusId) => {
    return tasks.filter((task) => task.ts_notestatus === statusId);
  };

  // Função para obter cores de status
  const getStatusColor = (status) => {
    if (!status) return 'default';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('concluído') || statusLower.includes('concluido')) {
      return 'success';
    } else if (statusLower.includes('progresso')) {
      return 'info';
    } else if (statusLower.includes('fazer')) {
      return 'warning';
    }
    return 'default';
  };

  // Mobile: Exibir tabs
  if (isMobile) {
    return (
      <Box>
        {/* Tabs para alternar entre status */}
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            mb: 2,
            borderBottom: 1,
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'divider',
            '& .MuiTab-root': {
              color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined,
              minHeight: 48
            },
            '& .Mui-selected': {
              color: isDarkMode ? 'white !important' : undefined
            },
            '& .MuiTabs-indicator': {
              backgroundColor: isDarkMode ? 'white' : undefined
            }
          }}
        >
          {statuses.map((status, index) => (
            <Tab
              key={status.pk}
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {status.value}
                  </Typography>
                  <Typography variant="caption" sx={{ mt: 0.5 }}>
                    {getTasksByStatus(status.pk).length}
                  </Typography>
                </Box>
              }
            />
          ))}
        </Tabs>

        {/* Conteúdo da tab ativa */}
        {statuses.map((status, index) => (
          <Box key={status.pk} hidden={activeTab !== index}>
            {activeTab === index && (
              <Paper
                sx={{
                  p: 2,
                  minHeight: '60vh',
                  bgcolor: isDarkMode ? theme.palette.background.paper : '#f5f5f5',
                  borderRadius: 2,
                  boxShadow: isDarkMode ? '0 4px 8px rgba(0, 0, 0, 0.5)' : 3,
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                }}
              >
                <TaskColumn
                  columnId={status.pk}
                  columnName={status.value}
                  tasks={getTasksByStatus(status.pk)}
                  onTaskClick={onTaskClick}
                  moveTask={(taskId, newStatusId, taskClientName) => {
                    const task = tasks.find(t => t.pk === taskId);
                    moveTask({ taskId, newStatusId, clientName: taskClientName || task?.ts_client_name || clientName });
                  }}
                  isMovingTask={isMovingTask}
                  isDarkMode={isDarkMode}
                />
              </Paper>
            )}
          </Box>
        ))}
      </Box>
    );
  }

  // Desktop: Exibir 3 colunas lado a lado (layout original)
  return (
    <Box sx={{ display: 'flex', gap: 2, minHeight: '400px' }}>
      {statuses.map((status) => (
        <Box key={status.pk} sx={{ flex: 1 }}>
          <Paper
            sx={{
              p: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: isDarkMode ? theme.palette.background.paper : '#f5f5f5',
              borderRadius: 2,
              boxShadow: isDarkMode ? '0 4px 8px rgba(0, 0, 0, 0.5)' : 3,
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
            }}
          >
            <Typography
              variant="h6"
              sx={{
                pb: 1,
                mb: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: isDarkMode ? 'white' : undefined
              }}
            >
              <span>{status.value}</span>
              <Typography
                component="span"
                variant="body2"
                sx={{
                  bgcolor: getStatusColor(status.value) + '.main',
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontWeight: 'bold'
                }}
              >
                {getTasksByStatus(status.pk).length}
              </Typography>
            </Typography>

            <Box
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                pr: 1,
                '&::-webkit-scrollbar': {
                  width: '8px'
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                  borderRadius: '4px'
                }
              }}
            >
              <TaskColumn
                columnId={status.pk}
                columnName={status.value}
                tasks={getTasksByStatus(status.pk)}
                onTaskClick={onTaskClick}
                moveTask={(taskId, newStatusId, taskClientName) => {
                  const task = tasks.find(t => t.pk === taskId);
                  moveTask({ taskId, newStatusId, clientName: taskClientName || task?.ts_client_name || clientName });
                }}
                isMovingTask={isMovingTask}
                isDarkMode={isDarkMode}
              />
            </Box>
          </Paper>
        </Box>
      ))}
    </Box>
  );
};

export default MobileKanban;
