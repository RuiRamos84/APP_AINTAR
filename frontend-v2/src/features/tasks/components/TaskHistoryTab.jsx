/**
 * TaskHistoryTab - Tab de histórico/notas da tarefa
 *
 * Exibe timeline de atualizações e permite adicionar notas
 *
 * @example
 * <TaskHistoryTab
 *   task={task}
 *   canAddNote={true}
 *   onNoteAdded={handleRefresh}
 * />
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  Paper,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator,
} from '@mui/lab';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  FiberNew as FiberNewIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import PropTypes from 'prop-types';

import { useAuth } from '@/core/contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import taskService from '../services/taskService';

/**
 * TaskHistoryTab Component
 */
export const TaskHistoryTab = ({ task, canAddNote = false, onNoteAdded }) => {
  const { user } = useAuth();
  const { addNote, loading: taskLoading } = useTasks({ autoFetch: false });

  // State
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [taskHistory, setTaskHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [highlightedNotes, setHighlightedNotes] = useState(new Set());

  // Ref para scroll automático
  const firstUnreadRef = useRef(null);

  // Determinar se user é owner ou client
  const isOwner = task ? task.owner === user?.user_id : false;
  const isClient = task ? task.ts_client === user?.user_id : false;
  // IMPORTANTE: isClosed = encerrada pelo owner (when_stop preenchido)
  const isClosed = !!task?.when_stop;

  // Verificar se a tarefa tem notificação não lida para o utilizador atual
  const hasTaskNotification = useMemo(() => {
    if (!task) return false;
    if (isOwner && isClient) {
      return task.notification_owner === 1 || task.notification_client === 1;
    } else if (isOwner) {
      return task.notification_owner === 1;
    } else if (isClient) {
      return task.notification_client === 1;
    }
    return false;
  }, [task, isOwner, isClient]);

  // Ordenar história da mais recente para a mais antiga
  const sortedHistory = useMemo(() => {
    return [...(taskHistory || [])].sort(
      (a, b) => new Date(b.when_submit) - new Date(a.when_submit)
    );
  }, [taskHistory]);

  // Contar notas não lidas - se a tarefa tem notificação, a nota mais recente é não lida
  const unreadCount = useMemo(() => {
    if (!hasTaskNotification || sortedHistory.length === 0) return 0;
    // Se há notificação na tarefa, considerar a nota mais recente como não lida
    return 1;
  }, [hasTaskNotification, sortedHistory.length]);

  // Carregar histórico quando task muda
  useEffect(() => {
    const loadHistory = async () => {
      if (!task?.pk && !task?.id) return;

      setIsLoadingHistory(true);
      try {
        const history = await taskService.getTaskHistory(task.pk || task.id);
        setTaskHistory(history || []);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        setTaskHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [task?.pk, task?.id]);

  // Inicializar notas destacadas quando o modal abre
  // Se a tarefa tem notificação não lida, destacar a nota mais recente
  useEffect(() => {
    const newHighlighted = new Set();

    if (hasTaskNotification && sortedHistory.length > 0) {
      // Destacar a nota mais recente (primeira no array ordenado)
      const mostRecentNote = sortedHistory[0];
      newHighlighted.add(mostRecentNote?.pk || 'note_0');
    }

    setHighlightedNotes(newHighlighted);
  }, [task?.pk, sortedHistory, hasTaskNotification]);

  // Scroll automático para primeira nota não lida
  useEffect(() => {
    if (firstUnreadRef.current && unreadCount > 0) {
      setTimeout(() => {
        firstUnreadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [unreadCount]);

  // Adicionar nota
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsAddingNote(true);
    try {
      await addNote(task.pk || task.id, newNote);
      toast.success('Nota adicionada com sucesso!');
      setNewNote('');

      // Recarregar histórico
      const history = await taskService.getTaskHistory(task.pk || task.id);
      setTaskHistory(history || []);

      // Destacar nova nota
      if (history && history.length > 0) {
        const latestNote = history[0];
        setHighlightedNotes(new Set([latestNote?.pk || 'note_0']));
      }

      // Nota: Não chamamos onNoteAdded() aqui para NÃO fechar o modal
      // O evento 'task-refresh' já é disparado no hook addNote
      // para atualizar a lista de tarefas em background
    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
      toast.error('Erro ao adicionar nota');
    } finally {
      setIsAddingNote(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  if (!task) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Adicionar Nova Nota - só se tarefa não estiver encerrada */}
      {!isClosed && canAddNote ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Adicionar Nova Nota
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              placeholder="Escreva uma nota..."
              fullWidth
              multiline
              rows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyPress={handleKeyPress}
              variant="outlined"
              size="small"
            />
            <Button
              variant="contained"
              onClick={handleAddNote}
              disabled={isAddingNote || !newNote.trim()}
              sx={{ height: 56, minWidth: 100 }}
              startIcon={isAddingNote ? <CircularProgress size={16} /> : <SendIcon />}
            >
              {isAddingNote ? '' : 'Enviar'}
            </Button>
          </Box>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          {isClosed
            ? 'Esta tarefa está encerrada. Não é possível adicionar notas.'
            : 'Não tem permissão para adicionar notas a esta tarefa.'}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Header do Histórico */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
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
                '50%': { opacity: 0.7 },
              },
            }}
          />
        )}
      </Box>

      {/* Loading */}
      {isLoadingHistory && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {/* Empty State */}
      {!isLoadingHistory && sortedHistory.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontStyle: 'italic', textAlign: 'center', py: 4 }}
        >
          Sem histórico disponível.
        </Typography>
      )}

      {/* Timeline */}
      {!isLoadingHistory && sortedHistory.length > 0 && (
        <Timeline
          position="right"
          sx={{
            p: 0,
            m: 0,
            '& .MuiTimelineItem-root:before': {
              flex: 0,
              padding: 0,
            },
          }}
        >
          {sortedHistory.map((item, index) => {
            const noteId = item?.pk || `note_${index}`;
            const isUnread = highlightedNotes.has(noteId);

            // A primeira nota destacada (mais recente) recebe o ref para scroll
            const isFirstUnread = isUnread && index === 0;

            return (
              <TimelineItem key={noteId} ref={isFirstUnread ? firstUnreadRef : null}>
                <TimelineOppositeContent sx={{ maxWidth: 100, flex: 'none' }}>
                  <Typography variant="caption" color="text.secondary">
                    {item?.when_submit
                      ? new Date(item.when_submit).toLocaleDateString('pt-PT')
                      : '-'}
                    <br />
                    {item?.when_submit
                      ? new Date(item.when_submit).toLocaleTimeString('pt-PT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </Typography>
                </TimelineOppositeContent>

                <TimelineSeparator>
                  <TimelineDot
                    color={isUnread ? 'error' : item?.isadmin ? 'secondary' : 'primary'}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...(isUnread && {
                        animation: 'pulse 2s ease-in-out infinite',
                        boxShadow: '0 0 10px rgba(244, 67, 54, 0.5)',
                      }),
                    }}
                  >
                    {item?.isadmin ? (
                      <PersonIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <BusinessIcon sx={{ fontSize: 16 }} />
                    )}
                  </TimelineDot>
                  {index < sortedHistory.length - 1 && <TimelineConnector />}
                </TimelineSeparator>

                <TimelineContent sx={{ py: '12px', px: 2 }}>
                  <Paper
                    elevation={isUnread ? 4 : 1}
                    sx={{
                      p: 2,
                      bgcolor: isUnread ? 'rgba(244, 67, 54, 0.08)' : 'action.hover',
                      borderLeft: '4px solid',
                      borderColor: isUnread
                        ? 'error.main'
                        : item?.isadmin
                          ? 'secondary.main'
                          : 'primary.main',
                      boxShadow: isUnread ? '0 4px 12px rgba(244, 67, 54, 0.2)' : undefined,
                      position: 'relative',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={isUnread ? 700 : 500}>
                        {item?.isadmin === 0
                          ? task.ts_client_name || task.client_name || 'Cliente'
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
                            fontWeight: 'bold',
                          }}
                        />
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        fontWeight: isUnread ? 500 : 'normal',
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

TaskHistoryTab.propTypes = {
  task: PropTypes.object,
  canAddNote: PropTypes.bool,
  onNoteAdded: PropTypes.func,
};

export default TaskHistoryTab;
