import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Tooltip
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useMetaData } from '../../../contexts/MetaDataContext';
import { updateTask, addTaskNote, closeTask, reopenTask } from '../../../services/TaskService';
import { notifySuccess, notifyError } from '../../../components/common/Toaster/ThemedToaster';
import { useTaskPermissions } from '../../../hooks/useTaskPermissions';

/**
 * Menu de ações rápidas para TaskCard
 * Permite mudanças rápidas sem abrir o modal completo
 * Com sistema de permissões baseado no papel do utilizador
 */
const QuickActionsMenu = ({ task, onRefresh, isDarkMode, moveTask, clientName }) => {
  const permissions = useTaskPermissions(task);
  const [anchorEl, setAnchorEl] = useState(null);
  const [statusDialog, setStatusDialog] = useState(false);
  const [noteDialog, setNoteDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState(task?.ts_notestatus || 1);
  const [quickNote, setQuickNote] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState(task?.ts_client || '');

  const { metaData } = useMetaData();

  const handleClick = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    setAnchorEl(null);
  };

  const handleStatusChange = async () => {
    try {
      // Usar moveTask se disponível (UI otimista), senão updateTask
      if (moveTask) {
        moveTask(task.pk, selectedStatus, clientName);
      } else {
        await updateTask(task.pk, { ...task, ts_notestatus: selectedStatus });
        if (onRefresh) onRefresh();
      }
      notifySuccess('Status alterado com sucesso!');
      setStatusDialog(false);
      handleClose();
    } catch (error) {
      console.error('Erro ao mudar status:', error);
      notifyError('Erro ao mudar status');
    }
  };

  const handleAddNote = async () => {
    if (!quickNote.trim()) return;

    try {
      await addTaskNote(task.pk, quickNote);
      notifySuccess('Nota adicionada!');
      setQuickNote('');
      setNoteDialog(false);
      handleClose();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
      notifyError('Erro ao adicionar nota');
    }
  };

  const handleReassign = async () => {
    try {
      await updateTask(task.pk, { ...task, ts_client: selectedAssignee });
      notifySuccess('Tarefa reatribuída!');
      setAssignDialog(false);
      handleClose();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Erro ao reatribuir:', error);
      notifyError('Erro ao reatribuir tarefa');
    }
  };

  const handleComplete = async () => {
    try {
      await closeTask(task.pk);
      notifySuccess('Tarefa fechada com sucesso!');
      handleClose();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Erro ao fechar tarefa:', error);
      notifyError('Erro ao fechar tarefa');
    }
  };

  const handleReopen = async () => {
    try {
      await reopenTask(task.pk);
      notifySuccess('Tarefa reaberta com sucesso!');
      handleClose();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Erro ao reabrir tarefa:', error);
      notifyError('Erro ao reabrir tarefa');
    }
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 5,
          bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.8)',
          '&:hover': {
            bgcolor: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 1)',
          }
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mudar Status - Apenas para clientes */}
        {permissions.canChangeStatus && (
          <MenuItem
            onClick={(e) => {
              e.stopPropagation();
              setStatusDialog(true);
              handleClose();
            }}
          >
            <ListItemIcon>
              <ChangeCircleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mudar Status</ListItemText>
          </MenuItem>
        )}

        {/* Adicionar Nota - Disponível para todos com permissão */}
        {permissions.canAddNote && (
          <MenuItem
            onClick={(e) => {
              e.stopPropagation();
              setNoteDialog(true);
              handleClose();
            }}
          >
            <ListItemIcon>
              <NoteAddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Adicionar Nota Rápida</ListItemText>
          </MenuItem>
        )}

        {/* Reatribuir - Apenas para owner */}
        {permissions.canReassign && (
          <MenuItem
            onClick={(e) => {
              e.stopPropagation();
              setAssignDialog(true);
              handleClose();
            }}
          >
            <ListItemIcon>
              <PersonAddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Reatribuir</ListItemText>
          </MenuItem>
        )}

        {/* Fechar Tarefa - Apenas para owner (quando não está fechada) */}
        {permissions.canComplete && [
          <Divider key="divider-complete" />,
          <MenuItem
            key="complete"
            onClick={(e) => {
              e.stopPropagation();
              handleComplete();
            }}
          >
            <ListItemIcon>
              <CheckCircleIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Fechar Tarefa</ListItemText>
          </MenuItem>
        ]}

        {/* Reabrir Tarefa - Apenas para owner (quando está fechada) */}
        {permissions.canReopen && [
          <Divider key="divider-reopen" />,
          <MenuItem
            key="reopen"
            onClick={(e) => {
              e.stopPropagation();
              handleReopen();
            }}
          >
            <ListItemIcon>
              <LockOpenIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText>Reabrir Tarefa</ListItemText>
          </MenuItem>
        ]}
      </Menu>

      {/* Dialog: Mudar Status */}
      <Dialog
        open={statusDialog}
        onClose={() => setStatusDialog(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Mudar Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedStatus}
              label="Status"
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {metaData?.task_status?.map((status) => (
                <MenuItem key={status.pk} value={status.pk}>
                  {status.value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog(false)}>Cancelar</Button>
          <Button onClick={handleStatusChange} variant="contained">
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Adicionar Nota Rápida */}
      <Dialog
        open={noteDialog}
        onClose={() => setNoteDialog(false)}
        onClick={(e) => e.stopPropagation()}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Adicionar Nota Rápida</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nota"
            fullWidth
            multiline
            rows={4}
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog(false)}>Cancelar</Button>
          <Button onClick={handleAddNote} variant="contained" disabled={!quickNote.trim()}>
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Reatribuir */}
      <Dialog
        open={assignDialog}
        onClose={() => setAssignDialog(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Reatribuir Tarefa</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Cliente</InputLabel>
            <Select
              value={selectedAssignee}
              label="Cliente"
              onChange={(e) => setSelectedAssignee(e.target.value)}
            >
              {metaData?.who?.map((client) => (
                <MenuItem key={client.pk} value={client.pk}>
                  {client.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>Cancelar</Button>
          <Button onClick={handleReassign} variant="contained">
            Reatribuir
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QuickActionsMenu;
