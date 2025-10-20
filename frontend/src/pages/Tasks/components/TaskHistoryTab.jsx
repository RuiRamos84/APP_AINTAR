import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  Paper,
  Badge
} from '@mui/material';
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator
} from '@mui/lab';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import {
  getTextFieldStyles,
  getDividerStyles,
  getTimelineConnectorStyles,
  getTypographyStyles,
  getTypographySecondaryStyles
} from '../styles/themeHelpers';

/**
 * Componente da aba de histórico da tarefa
 * Exibe timeline de atualizações e permite adicionar notas
 */
const TaskHistoryTab = ({
  task,
  taskHistory,
  newNote,
  setNewNote,
  canAddNote,
  isAddingNote,
  isDarkMode,
  theme,
  onAddNote
}) => {
  if (!task) return null;

  // Ordenar história da mais recente para a mais antiga
  const sortedHistory = [...(taskHistory || [])].sort(
    (a, b) => new Date(b.when_submit) - new Date(a.when_submit)
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Adicionar Nova Nota */}
      {!task.when_stop && canAddNote ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={getTypographyStyles(isDarkMode)}>
            Adicionar Nova Nota
          </Typography>
          <TextField
            label="Nova Nota"
            fullWidth
            multiline
            rows={3}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            sx={{ mb: 1, ...getTextFieldStyles(isDarkMode) }}
          />
          <Button
            variant="contained"
            onClick={onAddNote}
            disabled={isAddingNote || !newNote.trim()}
            sx={{ color: isDarkMode ? 'white' : undefined }}
          >
            {isAddingNote ? 'A adicionar...' : 'Adicionar Nota'}
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'action.hover',
            borderRadius: 1
          }}
        >
          <Typography variant="subtitle1" sx={getTypographySecondaryStyles(isDarkMode)}>
            {task.when_stop
              ? 'Esta tarefa está fechada.'
              : 'Você não tem permissão para adicionar notas.'}
          </Typography>
        </Box>
      )}

      <Divider sx={{ my: 2, ...getDividerStyles(isDarkMode) }} />

      {/* Histórico de Notas */}
      <Typography variant="h6" gutterBottom sx={getTypographyStyles(isDarkMode)}>
        Histórico de Atualizações
      </Typography>

      {sortedHistory.length === 0 ? (
        <Typography
          variant="body2"
          sx={{
            fontStyle: 'italic',
            textAlign: 'center',
            py: 3,
            ...getTypographySecondaryStyles(isDarkMode)
          }}
        >
          Sem histórico disponível.
        </Typography>
      ) : (
        <Timeline
          position="right"
          sx={{
            p: 0,
            m: 0,
            '& .MuiTimelineItem-root:before': {
              flex: 0,
              padding: 0
            }
          }}
        >
          {sortedHistory.map((item, index) => (
            <TimelineItem key={index}>
              <TimelineOppositeContent sx={{ maxWidth: 120 }}>
                <Typography variant="caption" sx={getTypographySecondaryStyles(isDarkMode)}>
                  {item?.when_submit ? new Date(item.when_submit).toLocaleDateString() : '-'}
                  <br />
                  {item?.when_submit ? new Date(item.when_submit).toLocaleTimeString() : '-'}
                </Typography>
              </TimelineOppositeContent>

              <TimelineSeparator>
                <TimelineDot
                  color={item?.isadmin ? 'secondary' : 'primary'}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {item?.isadmin ? (
                    <PersonIcon fontSize="small" />
                  ) : (
                    <BusinessIcon fontSize="small" />
                  )}
                </TimelineDot>
                {index < sortedHistory.length - 1 && (
                  <TimelineConnector sx={getTimelineConnectorStyles(isDarkMode)} />
                )}
              </TimelineSeparator>

              <TimelineContent sx={{ py: '12px', px: 2 }}>
                <Badge
                  color="error"
                  variant="dot"
                  invisible={item?.notification_owner !== 1}
                  sx={{ width: '100%' }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      bgcolor:
                        item?.notification_owner === 0
                          ? isDarkMode
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'action.hover'
                          : isDarkMode
                          ? 'rgba(0, 0, 0, 0.2)'
                          : 'background.paper',
                      borderLeft: '4px solid',
                      borderColor: item?.isadmin ? 'secondary.main' : 'primary.main',
                      boxShadow: isDarkMode ? '0 2px 4px rgba(0, 0, 0, 0.3)' : undefined
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                    >
                      {item?.isadmin === 0
                        ? task.ts_client_name || 'Cliente'
                        : task.owner_name || 'Responsável'}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined,
                        whiteSpace: 'pre-wrap' // Preserva quebras de linha
                      }}
                    >
                      {item?.memo || ''}
                    </Typography>
                  </Paper>
                </Badge>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      )}
    </Box>
  );
};

export default TaskHistoryTab;
