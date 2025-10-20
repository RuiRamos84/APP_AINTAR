import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  getTextFieldStyles,
  getSelectStyles,
  getMenuItemStyles,
  getDividerStyles,
  getButtonOutlinedStyles,
  getButtonErrorOutlinedStyles,
  getTypographyStyles
} from '../styles/themeHelpers';

/**
 * Componente da aba de detalhes da tarefa
 * Permite visualizar e editar informações da tarefa
 */
const TaskDetailsTab = ({
  task,
  editedTask,
  setEditedTask,
  isEditing,
  setIsEditing,
  canEdit,
  canClose,
  isUpdating,
  isDarkMode,
  metaData,
  onUpdate,
  onCancel,
  onCloseTask
}) => {
  if (!task || !editedTask) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        color: isDarkMode ? 'text.primary' : undefined
      }}
    >
      {/* Cabeçalho das Ações */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={getTypographyStyles(isDarkMode)}>
          Detalhes da Tarefa
          {task.when_stop && (
            <Chip
              label="Fechada"
              color="success"
              size="small"
              sx={{
                ml: 1,
                color: isDarkMode ? 'white' : undefined,
                fontWeight: isDarkMode ? 'medium' : undefined
              }}
            />
          )}
        </Typography>
        {!isEditing && canEdit && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setIsEditing(true)}
            sx={getButtonOutlinedStyles(isDarkMode)}
          >
            Editar
          </Button>
        )}
      </Box>

      <Divider sx={getDividerStyles(isDarkMode)} />

      {/* Campos Editáveis */}
      <TextField
        label="Nome"
        fullWidth
        value={editedTask.name || ''}
        onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
        disabled={!isEditing}
        variant={isEditing ? 'outlined' : 'filled'}
        sx={{ mb: 2, ...getTextFieldStyles(isDarkMode) }}
      />

      {isEditing && (
        <FormControl fullWidth sx={{ mb: 2, ...getSelectStyles(isDarkMode) }}>
          <InputLabel>Cliente</InputLabel>
          <Select
            value={editedTask.ts_client || ''}
            label="Cliente"
            onChange={(e) => setEditedTask({ ...editedTask, ts_client: e.target.value })}
          >
            {metaData?.who?.map((client) => (
              <MenuItem key={client.pk} value={client.pk} sx={getMenuItemStyles(isDarkMode)}>
                {client.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {isEditing && canEdit && (
        <FormControl fullWidth sx={{ mb: 2, ...getSelectStyles(isDarkMode) }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={editedTask.ts_notestatus || ''}
            label="Status"
            onChange={(e) => setEditedTask({ ...editedTask, ts_notestatus: e.target.value })}
          >
            {metaData?.task_status?.map((status) => (
              <MenuItem key={status.pk} value={status.pk} sx={getMenuItemStyles(isDarkMode)}>
                {status.value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {isEditing && (
        <FormControl fullWidth sx={{ mb: 2, ...getSelectStyles(isDarkMode) }}>
          <InputLabel>Prioridade</InputLabel>
          <Select
            value={editedTask.ts_priority || 1}
            label="Prioridade"
            onChange={(e) => setEditedTask({ ...editedTask, ts_priority: e.target.value })}
          >
            {metaData?.task_priority?.map((priority) => (
              <MenuItem key={priority.pk} value={priority.pk} sx={getMenuItemStyles(isDarkMode)}>
                {priority.value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <TextField
        label="Descrição"
        fullWidth
        multiline
        rows={4}
        value={editedTask.memo || ''}
        onChange={(e) => setEditedTask({ ...editedTask, memo: e.target.value })}
        disabled={!isEditing}
        variant={isEditing ? 'outlined' : 'filled'}
        sx={{ mb: 2, ...getTextFieldStyles(isDarkMode) }}
      />

      {/* Botões de Ação para Modo de Edição */}
      {isEditing && (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={onCancel}
            sx={getButtonErrorOutlinedStyles(isDarkMode)}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={onUpdate}
            disabled={isUpdating}
            sx={{ color: isDarkMode ? 'white' : undefined }}
          >
            {isUpdating ? 'A guardar...' : 'Guardar'}
          </Button>
        </Box>
      )}

      {/* Opção de encerrar tarefa */}
      {!isEditing && canClose && (
        <Button
          variant="contained"
          color="error"
          startIcon={<CheckCircleIcon />}
          onClick={onCloseTask}
          fullWidth
          sx={{ color: isDarkMode ? 'white' : undefined }}
        >
          Encerrar Tarefa
        </Button>
      )}
    </Box>
  );
};

export default TaskDetailsTab;
