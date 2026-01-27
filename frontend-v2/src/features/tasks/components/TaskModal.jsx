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
  Replay as ReopenIcon,
  Flag as FlagIcon,
  Description as DescriptionIcon,
  History as HistoryIcon,
  CalendarMonth as CalendarIcon,
  Archive as ArchiveIcon,
  Lock as LockIcon,
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
import ConfirmDialog from '@/shared/components/feedback/ConfirmDialog';

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
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null });

  // Verificar permissões
  // IMPORTANTE: Distinguir entre:
  // - isCompleted: executor marcou como concluída (status = 'completed')
  // - isClosed: owner encerrou a tarefa (when_stop preenchido)
  const permissions = useMemo(() => {
    if (!task || !user)
      return { canEdit: false, canClose: false, canReopen: false, canAddNote: false };

    const isOwner = task.owner === user.user_id;
    const isClient = task.ts_client === user.user_id;
    const isAdmin = user.profile === 0;
    const isClosed = !!task.when_stop; // Encerrada pelo owner

    return {
      canEdit: (isOwner || isAdmin) && !isClosed,
      // Só o owner/admin pode ENCERRAR, e apenas se não estiver já encerrada
      canClose: (isOwner || isAdmin) && !isClosed,
      // Só o owner/admin pode REABRIR uma tarefa encerrada
      canReopen: (isOwner || isAdmin) && isClosed,
      // Pode adicionar notas se não estiver encerrada
      canAddNote: (isOwner || isClient) && !isClosed,
    };
  }, [task, user]);

  // Verificar notificações
  const hasNotification = useMemo(() => {
    if (!task || !user) return false;
    const isOwner = task.owner === user.user_id;
    const isClient = task.ts_client === user.user_id;

    return (
      (isOwner && task.notification_owner === 1) || (isClient && task.notification_client === 1)
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

  // Estados da tarefa
  const isCompleted = task.status === 'completed'; // Executor marcou como concluída
  const isClosed = !!task.when_stop; // Owner encerrou a tarefa

  // Abrir dialog de confirmação
  const openConfirmDialog = (type) => {
    setConfirmDialog({ open: true, type });
  };

  // Fechar dialog de confirmação
  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, type: null });
  };

  // Handle ENCERRAR tarefa (owner fecha definitivamente)
  const handleCloseTask = async () => {
    try {
      await closeTask(task.pk || task.id);
      closeConfirmDialog();
      onSuccess?.();
    } catch (err) {
      // Error handled in hook
    }
  };

  // Handle REABRIR tarefa encerrada
  const handleReopen = async () => {
    try {
      await reopenTask(task.pk || task.id);
      closeConfirmDialog();
      onSuccess?.();
    } catch (err) {
      // Error handled in hook
    }
  };

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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
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

            {/* Status de execução */}
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

            {/* Indicador de Encerrada (se aplicável) */}
            {isClosed && (
              <Chip
                label="Encerrada"
                color="default"
                size="small"
                icon={<LockIcon />}
                sx={{ bgcolor: 'grey.300' }}
              />
            )}

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

          {/* Data de encerramento (se encerrada) */}
          {isClosed && task.when_stop && (
            <Chip
              label={`Encerrada em ${format(new Date(task.when_stop), 'dd/MM/yyyy', { locale: pt })}`}
              color="default"
              size="small"
              variant="outlined"
              icon={<ArchiveIcon />}
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
          <Tab label="Detalhes" icon={<DescriptionIcon />} iconPosition="start" />
          <Tab
            label={
              <Badge color="error" variant="dot" invisible={!hasNotification}>
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
          <TaskDetailsTab task={task} canEdit={permissions.canEdit} onUpdate={onSuccess} />
        </TabPanel>

        {/* Tab: Histórico */}
        <TabPanel value={currentTab} index={1}>
          <TaskHistoryTab task={task} canAddNote={permissions.canAddNote} onNoteAdded={onSuccess} />
        </TabPanel>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Box sx={{ flex: 1 }} />

        {/* Botão Reabrir - só aparece se tarefa está ENCERRADA */}
        {permissions.canReopen && isClosed && (
          <Button
            variant="outlined"
            startIcon={<ReopenIcon />}
            onClick={() => openConfirmDialog('reopen')}
            disabled={loading}
          >
            Reabrir
          </Button>
        )}

        {/* Botão Encerrar - só aparece se tarefa NÃO está encerrada */}
        {/* Owner pode encerrar a qualquer momento (tarefa concluída ou não) */}
        {permissions.canClose && !isClosed && (
          <Button
            variant="contained"
            color="warning"
            startIcon={<ArchiveIcon />}
            onClick={() => openConfirmDialog('close')}
            disabled={loading}
          >
            Encerrar
          </Button>
        )}
      </DialogActions>

      {/* Dialog de Confirmação - Encerrar */}
      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'close'}
        title="Encerrar tarefa?"
        message="Esta ação irá arquivar a tarefa. Poderá reabri-la mais tarde se necessário."
        confirmText="Encerrar"
        confirmColor="warning"
        type="warning"
        loading={loading}
        onConfirm={handleCloseTask}
        onCancel={closeConfirmDialog}
      />

      {/* Dialog de Confirmação - Reabrir */}
      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'reopen'}
        title="Reabrir tarefa?"
        message="A tarefa voltará a ficar ativa e poderá ser editada."
        confirmText="Reabrir"
        confirmColor="info"
        type="info"
        loading={loading}
        onConfirm={handleReopen}
        onCancel={closeConfirmDialog}
      />
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
