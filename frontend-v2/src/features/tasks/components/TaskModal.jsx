/**
 * TaskModal - Modal para visualizar/editar tarefa
 *
 * Exibe detalhes completos da tarefa com tabs:
 * - Detalhes (visualização/edição)
 * - Histórico (timeline de notas)
 * - Comentários (futuro)
 *
 * @example
 * <TaskModal
 *   open={open}
 *   task={task}
 *   onClose={handleClose}
 *   onSuccess={handleSuccess}
 * />
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Chip,
  Stack,
  Tab,
  Tabs,
  Badge,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CompleteIcon,
  Replay as ReopenIcon,
  Flag as FlagIcon,
  Description as DescriptionIcon,
  History as HistoryIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import PropTypes from 'prop-types';

// Hooks
import { useAuth } from '@/core/contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';

// Components
import TaskDetailsTab from './TaskDetailsTab';
import TaskHistoryTab from './TaskHistoryTab';

// Services
import taskService from '../services/taskService';

/**
 * Tab Panel
 */
const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`task-tabpanel-${index}`}
    aria-labelledby={`task-tab-${index}`}
    style={{ height: '100%' }}
    {...other}
  >
    {value === index && <Box sx={{ py: 2, height: '100%' }}>{children}</Box>}
  </div>
);

/**
 * TaskModal Component
 */
export const TaskModal = ({ open, task, onClose, onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { closeTask, reopenTask, loading } = useTasks({ autoFetch: false });

  const [currentTab, setCurrentTab] = useState(0);

  // Verificar permissões
  const permissions = useMemo(() => {
    if (!task || !user) return { canEdit: false, canClose: false, canReopen: false, canAddNote: false };

    const isOwner = task.owner === user.user_id;
    const isClient = task.ts_client === user.user_id;
    const isAdmin = user.profile === 0;
    const isCompleted = task.status === 'completed' || task.when_stop;

    return {
      canEdit: isOwner || isAdmin,
      canClose: (isOwner || isAdmin) && !isCompleted,
      canReopen: (isOwner || isAdmin) && isCompleted,
      canAddNote: (isOwner || isClient) && !isCompleted,
    };
  }, [task, user]);

  // Verificar notificações
  const hasNotification = useMemo(() => {
    if (!task || !user) return false;
    const isOwner = task.owner === user.user_id;
    const isClient = task.ts_client === user.user_id;

    return (
      (isOwner && task.notification_owner === 1) ||
      (isClient && task.notification_client === 1)
    );
  }, [task, user]);

  // Marcar notificação como lida quando modal abre
  useEffect(() => {
    const markAsRead = async () => {
      if (open && task && hasNotification) {
        try {
          await taskService.markTaskAsRead(task.pk || task.id);
          // Disparar evento para atualizar UI
          window.dispatchEvent(new CustomEvent('task-refresh'));
        } catch (error) {
          console.error('Erro ao marcar notificação como lida:', error);
        }
      }
    };

    markAsRead();
  }, [open, task, hasNotification]);

  if (!task) return null;

  // Handle fechar tarefa
  const handleComplete = async () => {
    if (window.confirm('Concluir esta tarefa?')) {
      try {
        await closeTask(task.pk || task.id);
        // Toast já é mostrado no hook useTasks
        onSuccess?.();
      } catch (err) {
        // Error handled in hook
      }
    }
  };

  // Handle reabrir tarefa
  const handleReopen = async () => {
    if (window.confirm('Reabrir esta tarefa?')) {
      try {
        await reopenTask(task.pk || task.id);
        // Toast já é mostrado no hook useTasks
        onSuccess?.();
      } catch (err) {
        // Error handled in hook
      }
    }
  };

  const isCompleted = task.status === 'completed' || task.when_stop;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          height: isMobile ? '100%' : '80vh',
          maxHeight: isMobile ? '100%' : '80vh',
        },
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ pb: 1 }}>
        {/* Linha 1: Título + Chips + Botão Fechar */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          {/* Título à esquerda */}
          <Typography variant="h6" fontWeight={700} sx={{ flex: 1, lineHeight: 1.3 }}>
            {task.title || task.name}
          </Typography>

          {/* Chips à direita */}
          <Stack direction="row" spacing={0.75} alignItems="center" flexShrink={0}>
            {/* Prioridade */}
            <Chip
              label={task.priority || 'Média'}
              color={
                task.priority === 'urgente' || task.priority === 'alta'
                  ? 'error'
                  : task.priority === 'media'
                    ? 'warning'
                    : 'success'
              }
              size="small"
              icon={<FlagIcon />}
            />

            {/* Status */}
            <Chip
              label={
                isCompleted
                  ? 'Concluída'
                  : task.status === 'in_progress'
                    ? 'Em Progresso'
                    : 'Por Fazer'
              }
              color={isCompleted ? 'success' : task.status === 'in_progress' ? 'info' : 'warning'}
              size="small"
            />

            {/* Notificação */}
            {hasNotification && (
              <Chip
                label="Nova"
                color="error"
                size="small"
                sx={{ animation: 'pulse 2s infinite' }}
              />
            )}

            {/* Botão Fechar */}
            <IconButton onClick={onClose} size="small" sx={{ ml: 0.5 }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* Linha 2: Data de criação (e data de fecho se aplicável) */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
          {/* Data de criação */}
          {task.when_start && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Criada em {format(new Date(task.when_start), 'dd/MM/yyyy', { locale: pt })}
              </Typography>
            </Box>
          )}

          {/* Data de fecho (se concluída) */}
          {isCompleted && task.when_stop && (
            <Chip
              label={`Fechada em ${format(new Date(task.when_stop), 'dd/MM/yyyy', { locale: pt })}`}
              color="success"
              size="small"
              variant="outlined"
              icon={<CompleteIcon />}
            />
          )}
        </Box>
      </DialogTitle>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(e, v) => setCurrentTab(v)}
          variant={isMobile ? 'fullWidth' : 'standard'}
        >
          <Tab
            label="Detalhes"
            icon={<DescriptionIcon />}
            iconPosition="start"
          />
          <Tab
            label={
              <Badge
                color="error"
                variant="dot"
                invisible={!hasNotification}
              >
                Histórico
              </Badge>
            }
            icon={<HistoryIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <DialogContent
        dividers
        sx={{
          p: 3,
          flex: 1,
          overflow: 'auto',
        }}
      >
        {/* Tab: Detalhes */}
        <TabPanel value={currentTab} index={0}>
          <TaskDetailsTab
            task={task}
            canEdit={permissions.canEdit}
            canClose={permissions.canClose}
            onUpdate={onSuccess}
            onClose={onSuccess}
          />
        </TabPanel>

        {/* Tab: Histórico */}
        <TabPanel value={currentTab} index={1}>
          <TaskHistoryTab
            task={task}
            canAddNote={permissions.canAddNote}
            onNoteAdded={onSuccess}
          />
        </TabPanel>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Box sx={{ flex: 1 }} />

        {permissions.canReopen && isCompleted && (
          <Button
            variant="outlined"
            startIcon={<ReopenIcon />}
            onClick={handleReopen}
            disabled={loading}
          >
            Reabrir
          </Button>
        )}

        {permissions.canClose && !isCompleted && (
          <Button
            variant="contained"
            color="success"
            startIcon={<CompleteIcon />}
            onClick={handleComplete}
            disabled={loading}
          >
            Concluir
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

TaskModal.propTypes = {
  open: PropTypes.bool.isRequired,
  task: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export default TaskModal;
