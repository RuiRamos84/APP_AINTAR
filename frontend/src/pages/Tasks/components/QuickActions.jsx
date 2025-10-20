import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import PersonIcon from '@mui/icons-material/Person';

/**
 * Componente de ações rápidas para cards de tarefa
 * Menu dropdown com ações comuns
 */
const QuickActions = ({ task, onEdit, onClose, onChangePriority, onChangeOwner, isDarkMode }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    event.stopPropagation(); // Evita abrir o modal quando clicar no menu
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (event) => {
    if (event) {
      event.stopPropagation();
    }
    setAnchorEl(null);
  };

  const handleAction = (event, action) => {
    event.stopPropagation();
    handleClose();
    action();
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{
          color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'action.active',
          '&:hover': {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'action.hover'
          }
        }}
      >
        <MoreVertIcon />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            bgcolor: isDarkMode ? 'background.paper' : undefined,
            boxShadow: isDarkMode ? '0 4px 12px rgba(0, 0, 0, 0.5)' : undefined
          }
        }}
      >
        <MenuItem onClick={(e) => handleAction(e, onEdit)}>
          <ListItemIcon>
            <EditIcon fontSize="small" sx={{ color: isDarkMode ? 'white' : undefined }} />
          </ListItemIcon>
          <ListItemText sx={{ color: isDarkMode ? 'white' : undefined }}>
            Editar
          </ListItemText>
        </MenuItem>

        {!task.when_stop && (
          <>
            <MenuItem onClick={(e) => handleAction(e, onChangePriority)}>
              <ListItemIcon>
                <PriorityHighIcon fontSize="small" sx={{ color: isDarkMode ? 'white' : undefined }} />
              </ListItemIcon>
              <ListItemText sx={{ color: isDarkMode ? 'white' : undefined }}>
                Alterar Prioridade
              </ListItemText>
            </MenuItem>

            <MenuItem onClick={(e) => handleAction(e, onChangeOwner)}>
              <ListItemIcon>
                <PersonIcon fontSize="small" sx={{ color: isDarkMode ? 'white' : undefined }} />
              </ListItemIcon>
              <ListItemText sx={{ color: isDarkMode ? 'white' : undefined }}>
                Alterar Responsável
              </ListItemText>
            </MenuItem>

            <MenuItem onClick={(e) => handleAction(e, onClose)}>
              <ListItemIcon>
                <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />
              </ListItemIcon>
              <ListItemText sx={{ color: isDarkMode ? 'white' : undefined }}>
                Encerrar Tarefa
              </ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default QuickActions;
