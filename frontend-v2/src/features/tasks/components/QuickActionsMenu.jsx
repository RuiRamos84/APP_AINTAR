/**
 * QuickActionsMenu - Menu de ações rápidas para tarefas
 *
 * Exibe menu popup com ações disponíveis para uma tarefa
 *
 * @example
 * <QuickActionsMenu
 *   anchorEl={anchorEl}
 *   task={task}
 *   onClose={handleClose}
 *   onAction={handleAction}
 * />
 */

import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Visibility as ViewIcon,
  CheckCircle as CompleteIcon,
  Replay as ReopenIcon,
  Delete as DeleteIcon,
  Flag as FlagIcon,
  ArrowForward as MoveIcon,
  NotificationsOff as MarkReadIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';

/**
 * Tipos de ações disponíveis
 */
export const TASK_ACTIONS = {
  VIEW: 'view',
  EDIT: 'edit',
  COMPLETE: 'complete',
  REOPEN: 'reopen',
  DELETE: 'delete',
  CHANGE_PRIORITY: 'change_priority',
  MOVE: 'move',
  MARK_READ: 'mark_read',
};

/**
 * QuickActionsMenu Component
 */
export const QuickActionsMenu = ({
  anchorEl,
  task,
  onClose,
  onAction,
  canEdit = false,
  canDelete = false,
  canComplete = false,
  canReopen = false,
}) => {
  const open = Boolean(anchorEl);

  if (!task) return null;

  const isCompleted = task.status === 'completed' || task.when_stop;
  const hasNotification = task.notification_owner === 1 || task.notification_client === 1;

  const handleAction = (action) => {
    onAction?.(action, task);
    onClose();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        elevation: 3,
        sx: { minWidth: 180 },
      }}
    >
      {/* Ver detalhes */}
      <MenuItem onClick={() => handleAction(TASK_ACTIONS.VIEW)}>
        <ListItemIcon>
          <ViewIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Ver detalhes</ListItemText>
      </MenuItem>

      {/* Editar */}
      {canEdit && !isCompleted && (
        <MenuItem onClick={() => handleAction(TASK_ACTIONS.EDIT)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
      )}

      {/* Marcar como lida */}
      {hasNotification && (
        <MenuItem onClick={() => handleAction(TASK_ACTIONS.MARK_READ)}>
          <ListItemIcon>
            <MarkReadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Marcar como lida</ListItemText>
        </MenuItem>
      )}

      <Divider />

      {/* Alterar prioridade */}
      {canEdit && !isCompleted && (
        <MenuItem onClick={() => handleAction(TASK_ACTIONS.CHANGE_PRIORITY)}>
          <ListItemIcon>
            <FlagIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Alterar prioridade</ListItemText>
        </MenuItem>
      )}

      {/* Mover para coluna */}
      {canEdit && !isCompleted && (
        <MenuItem onClick={() => handleAction(TASK_ACTIONS.MOVE)}>
          <ListItemIcon>
            <MoveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Mover para...</ListItemText>
        </MenuItem>
      )}

      <Divider />

      {/* Concluir tarefa */}
      {canComplete && !isCompleted && (
        <MenuItem onClick={() => handleAction(TASK_ACTIONS.COMPLETE)}>
          <ListItemIcon>
            <CompleteIcon fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'success.main' }}>Concluir tarefa</ListItemText>
        </MenuItem>
      )}

      {/* Reabrir tarefa */}
      {canReopen && isCompleted && (
        <MenuItem onClick={() => handleAction(TASK_ACTIONS.REOPEN)}>
          <ListItemIcon>
            <ReopenIcon fontSize="small" color="info" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'info.main' }}>Reabrir tarefa</ListItemText>
        </MenuItem>
      )}

      {/* Eliminar */}
      {canDelete && (
        <MenuItem onClick={() => handleAction(TASK_ACTIONS.DELETE)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Eliminar</ListItemText>
        </MenuItem>
      )}
    </Menu>
  );
};

QuickActionsMenu.propTypes = {
  anchorEl: PropTypes.any,
  task: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onAction: PropTypes.func,
  canEdit: PropTypes.bool,
  canDelete: PropTypes.bool,
  canComplete: PropTypes.bool,
  canReopen: PropTypes.bool,
};

export default QuickActionsMenu;
