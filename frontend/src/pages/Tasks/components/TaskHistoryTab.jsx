import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  Paper,
  Badge,
  Chip
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
import FiberNewIcon from '@mui/icons-material/FiberNew';
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
  onAddNote,
  user
}) => {
  // Ref para scroll automático para primeira nota não lida (ANTES do early return)
  const firstUnreadRef = useRef(null);

  // Estado para controlar quais notas devem ser destacadas (persiste até modal fechar)
  const [highlightedNotes, setHighlightedNotes] = useState(new Set());

  // Ordenar história da mais recente para a mais antiga
  const sortedHistory = [...(taskHistory || [])].sort(
    (a, b) => new Date(b.when_submit) - new Date(a.when_submit)
  );

  // Determinar se user é owner ou client (com proteção para task nulo)
  const isOwner = task ? task.owner === user?.user_id : false;
  const isClient = task ? task.ts_client === user?.user_id : false;

  // Contar notas não lidas
  const unreadCount = sortedHistory.filter(item => {
    if (isOwner && isClient) {
      return item?.notification_owner === 1 || item?.notification_client === 1;
    } else if (isOwner) {
      return item?.notification_owner === 1;
    } else if (isClient) {
      return item?.notification_client === 1;
    }
    return false;
  }).length;

  // Inicializar notas destacadas APENAS quando o modal abre (task.pk muda)
  // NÃO atualizar quando taskHistory muda para manter o destaque persistente
  useEffect(() => {
    const newHighlighted = new Set();
    sortedHistory.forEach((item, index) => {
      const isUnread = (isOwner && item?.notification_owner === 1) ||
                      (isClient && item?.notification_client === 1) ||
                      (isOwner && isClient && (item?.notification_owner === 1 || item?.notification_client === 1));

      if (isUnread) {
        // Usar pk da nota ou índice como identificador único
        newHighlighted.add(item?.pk || `note_${index}`);
      }
    });
    setHighlightedNotes(newHighlighted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.pk]); // APENAS quando task.pk muda (novo modal), NÃO quando taskHistory muda

  // Detectar notas NOVAS adicionadas durante a sessão atual
  // Quando utilizador adiciona uma nota, LIMPAR destaques anteriores e destacar APENAS a nova
  useEffect(() => {
    if (sortedHistory.length === 0) return;

    // Verificar se há notas novas que não estavam na última renderização
    const latestNote = sortedHistory[0]; // A mais recente (sorted desc)
    const latestNoteId = latestNote?.pk || `note_${0}`;

    // Se a nota mais recente não está no Set e tem timestamp muito recente (últimos 10 segundos)
    if (latestNote && !highlightedNotes.has(latestNoteId)) {
      const noteTime = new Date(latestNote.when_submit).getTime();
      const now = Date.now();
      const tenSecondsAgo = now - 10000;

      // Se foi adicionada nos últimos 10 segundos, SUBSTITUIR todos os destaques pela nova nota
      if (noteTime > tenSecondsAgo) {
        // IMPORTANTE: Limpa os destaques anteriores e deixa APENAS a nova nota destacada
        setHighlightedNotes(new Set([latestNoteId]));

        // Scroll automático para a nova nota adicionada
        setTimeout(() => {
          if (firstUnreadRef.current) {
            firstUnreadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    }
  }, [sortedHistory, highlightedNotes]);

  // Scroll automático para primeira nota não lida (ANTES do early return)
  useEffect(() => {
    if (firstUnreadRef.current && unreadCount > 0) {
      setTimeout(() => {
        firstUnreadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [unreadCount]);

  // Early return DEPOIS de todos os hooks
  if (!task) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Adicionar Nova Nota */}
      {!task.when_stop && canAddNote ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={getTypographyStyles(isDarkMode)}>
            Adicionar Nova Nota
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              label="Nova Nota"
              fullWidth
              multiline
              rows={1}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              sx={getTextFieldStyles(isDarkMode)}
            />
            <Button
              variant="contained"
              onClick={onAddNote}
              disabled={isAddingNote || !newNote.trim()}
              sx={{
                color: isDarkMode ? 'white' : undefined,
                minWidth: 'auto',
                height: '56px',
                whiteSpace: 'nowrap'
              }}
            >
              {isAddingNote ? 'A adicionar...' : 'Adicionar'}
            </Button>
          </Box>
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6" sx={getTypographyStyles(isDarkMode)}>
          Histórico de Atualizações
        </Typography>
        {unreadCount > 0 && (
          <Chip
            label={`${unreadCount} nova${unreadCount > 1 ? 's' : ''}`}
            color="error"
            size="small"
            icon={<FiberNewIcon />}
            sx={{
              fontWeight: 'bold',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.7 }
              }
            }}
          />
        )}
      </Box>

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
          {sortedHistory.map((item, index) => {
            // Usar o estado highlightedNotes para determinar se deve destacar
            // Isso mantém o destaque até o modal fechar, mesmo após API marcar como lida
            const noteId = item?.pk || `note_${index}`;
            const isUnread = highlightedNotes.has(noteId);

            // Encontrar a primeira nota não lida para scroll automático
            const isFirstUnread = isUnread && !sortedHistory.slice(0, index).some((prev, prevIndex) => {
              const prevNoteId = prev?.pk || `note_${prevIndex}`;
              return highlightedNotes.has(prevNoteId);
            });

            return (
              <TimelineItem
                key={index}
                ref={isFirstUnread ? firstUnreadRef : null}
              >
                <TimelineOppositeContent sx={{ maxWidth: 120 }}>
                  <Typography variant="caption" sx={getTypographySecondaryStyles(isDarkMode)}>
                    {item?.when_submit ? new Date(item.when_submit).toLocaleDateString() : '-'}
                    <br />
                    {item?.when_submit ? new Date(item.when_submit).toLocaleTimeString() : '-'}
                  </Typography>
                </TimelineOppositeContent>

                <TimelineSeparator>
                  <TimelineDot
                    color={isUnread ? 'error' : (item?.isadmin ? 'secondary' : 'primary')}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...(isUnread && {
                        animation: 'pulse 2s ease-in-out infinite',
                        boxShadow: '0 0 10px rgba(244, 67, 54, 0.5)',
                        '@keyframes pulse': {
                          '0%, 100%': {
                            transform: 'scale(1)',
                            boxShadow: '0 0 10px rgba(244, 67, 54, 0.5)'
                          },
                          '50%': {
                            transform: 'scale(1.1)',
                            boxShadow: '0 0 20px rgba(244, 67, 54, 0.8)'
                          }
                        }
                      })
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
                  <Paper
                    elevation={isUnread ? 4 : 1}
                    sx={{
                      p: 2,
                      bgcolor: isUnread
                        ? isDarkMode
                          ? 'rgba(244, 67, 54, 0.15)'
                          : 'rgba(244, 67, 54, 0.08)'
                        : isDarkMode
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'action.hover',
                      borderLeft: '4px solid',
                      borderColor: isUnread
                        ? 'error.main'
                        : (item?.isadmin ? 'secondary.main' : 'primary.main'),
                      boxShadow: isUnread
                        ? (isDarkMode
                            ? '0 4px 12px rgba(244, 67, 54, 0.3)'
                            : '0 4px 12px rgba(244, 67, 54, 0.2)')
                        : (isDarkMode ? '0 2px 4px rgba(0, 0, 0, 0.3)' : undefined),
                      position: 'relative',
                      ...(isUnread && {
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          borderRadius: 1,
                          border: '2px solid',
                          borderColor: 'error.main',
                          pointerEvents: 'none',
                          animation: 'glow 2s ease-in-out infinite',
                          '@keyframes glow': {
                            '0%, 100%': { opacity: 0.3 },
                            '50%': { opacity: 0.6 }
                          }
                        }
                      })
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined,
                          fontWeight: isUnread ? 'bold' : 'normal'
                        }}
                      >
                        {item?.isadmin === 0
                          ? task.ts_client_name || 'Cliente'
                          : task.owner_name || 'Responsável'}
                      </Typography>
                      {isUnread && (
                        <Chip
                          label="NOVO"
                          color="error"
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                          }}
                        />
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined,
                        whiteSpace: 'pre-wrap',
                        fontWeight: isUnread ? 'medium' : 'normal'
                      }}
                    >
                      {item?.memo || ''}
                    </Typography>
                  </Paper>
                </TimelineContent>
              </TimelineItem>
            );
          })}
        </Timeline>
      )}
    </Box>
  );
};

export default TaskHistoryTab;
