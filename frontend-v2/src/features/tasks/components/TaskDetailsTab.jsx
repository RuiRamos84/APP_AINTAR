/**
 * TaskDetailsTab - Tab de detalhes/edição da tarefa
 *
 * Permite visualizar e editar informações da tarefa
 *
 * @example
 * <TaskDetailsTab
 *   task={task}
 *   canEdit={true}
 *   onUpdate={handleUpdate}
 * />
 */

import { useState, useEffect } from 'react';
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
  MenuItem,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Cancel as CancelIcon,
  Save as SaveIcon,
  CheckCircle as CompleteIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';

import { useMetadata } from '@/core/contexts/MetadataContext';
import { useTasks } from '../hooks/useTasks';

/**
 * TaskDetailsTab Component
 */
export const TaskDetailsTab = ({
  task,
  canEdit = false,
  canClose = false,
  onUpdate,
  onClose,
}) => {
  const { metadata } = useMetadata();
  const { updateTask, closeTask, loading } = useTasks({ autoFetch: false });

  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(null);

  // Inicializar editedTask quando task muda
  useEffect(() => {
    if (task) {
      setEditedTask({
        pk: task.pk || task.id,
        name: task.title || task.name || '',
        memo: task.description || task.memo || '',
        ts_priority: task.ts_priority || getPriorityValue(task.priority),
        ts_notestatus: task.ts_notestatus || getStatusValue(task.status),
        ts_client: task.ts_client || task.client,
      });
    }
  }, [task]);

  // Converter prioridade string para valor numérico
  const getPriorityValue = (priority) => {
    const map = { baixa: 1, media: 2, alta: 3, urgente: 4 };
    return map[priority] || 2;
  };

  // Converter status string para valor numérico
  const getStatusValue = (status) => {
    const map = { pending: 1, in_progress: 2, completed: 3, cancelled: 4 };
    return map[status] || 1;
  };

  if (!task || !editedTask) return null;

  const isCompleted = task.status === 'completed' || task.when_stop;

  // Handlers
  const handleFieldChange = (field, value) => {
    setEditedTask((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateTask(editedTask.pk, editedTask);
      // Toast já é mostrado no hook useTasks
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      // Toast de erro já é mostrado no hook useTasks
    }
  };

  const handleCancel = () => {
    // Reverter alterações
    setEditedTask({
      pk: task.pk || task.id,
      name: task.title || task.name || '',
      memo: task.description || task.memo || '',
      ts_priority: task.ts_priority || getPriorityValue(task.priority),
      ts_notestatus: task.ts_notestatus || getStatusValue(task.status),
      ts_client: task.ts_client || task.client,
    });
    setIsEditing(false);
  };

  const handleCloseTask = async () => {
    if (window.confirm('Tem a certeza que deseja encerrar esta tarefa?')) {
      try {
        await closeTask(task.pk || task.id);
        // Toast já é mostrado no hook useTasks
        onClose?.();
      } catch (error) {
        console.error('Erro ao encerrar tarefa:', error);
        // Toast de erro já é mostrado no hook useTasks
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header: Título à esquerda + Chips e Botão à direita */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {/* Título */}
        <Typography variant="subtitle1" fontWeight={600}>
          Detalhes da Tarefa
        </Typography>

        {/* Chips + Botão Editar à direita */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {/* Responsável */}
          {task.owner_name && (
            <Tooltip title="Responsável">
              <Chip
                icon={<PersonIcon />}
                label={task.owner_name}
                size="small"
                variant="outlined"
                color="primary"
              />
            </Tooltip>
          )}

          {/* Cliente */}
          {task.client_name && (
            <Tooltip title="Cliente">
              <Chip
                icon={<PersonIcon />}
                label={task.client_name}
                size="small"
                variant="outlined"
                color="secondary"
              />
            </Tooltip>
          )}

          {/* Botão Editar */}
          {!isEditing && canEdit && !isCompleted && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setIsEditing(true)}
              size="small"
            >
              Editar
            </Button>
          )}
        </Box>
      </Box>

      <Divider />

      {/* Modo Visualização */}
      {!isEditing ? (
        <Stack spacing={2}>
          {/* Descrição */}
          {(task.description || task.memo) ? (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Descrição
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {task.description || task.memo}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              Sem descrição disponível.
            </Typography>
          )}

          {/* Botão de encerrar */}
          {canClose && !isCompleted && (
            <>
              <Divider />
              <Button
                variant="contained"
                color="success"
                startIcon={<CompleteIcon />}
                onClick={handleCloseTask}
                disabled={loading}
                fullWidth
              >
                Encerrar Tarefa
              </Button>
            </>
          )}
        </Stack>
      ) : (
        /* Modo Edição */
        <Stack spacing={2.5}>
          {/* Título */}
          <TextField
            label="Título"
            fullWidth
            value={editedTask.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            variant="outlined"
          />

          {/* Prioridade */}
          <FormControl fullWidth>
            <InputLabel>Prioridade</InputLabel>
            <Select
              value={editedTask.ts_priority}
              label="Prioridade"
              onChange={(e) => handleFieldChange('ts_priority', e.target.value)}
            >
              {metadata.taskPriority?.length > 0 ? (
                metadata.taskPriority.map((priority) => (
                  <MenuItem key={priority.pk} value={priority.pk}>
                    {priority.value}
                  </MenuItem>
                ))
              ) : (
                <>
                  <MenuItem value={1}>Baixa</MenuItem>
                  <MenuItem value={2}>Média</MenuItem>
                  <MenuItem value={3}>Alta</MenuItem>
                  <MenuItem value={4}>Urgente</MenuItem>
                </>
              )}
            </Select>
          </FormControl>

          {/* Status */}
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={editedTask.ts_notestatus}
              label="Status"
              onChange={(e) => handleFieldChange('ts_notestatus', e.target.value)}
            >
              {metadata.taskStatus?.length > 0 ? (
                metadata.taskStatus.map((status) => (
                  <MenuItem key={status.pk} value={status.pk}>
                    {status.value}
                  </MenuItem>
                ))
              ) : (
                <>
                  <MenuItem value={1}>Por Fazer</MenuItem>
                  <MenuItem value={2}>Em Progresso</MenuItem>
                  <MenuItem value={3}>Concluída</MenuItem>
                </>
              )}
            </Select>
          </FormControl>

          {/* Descrição */}
          <TextField
            label="Descrição"
            fullWidth
            multiline
            rows={4}
            value={editedTask.memo}
            onChange={(e) => handleFieldChange('memo', e.target.value)}
            variant="outlined"
          />

          {/* Botões de ação */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'A guardar...' : 'Guardar'}
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  );
};

TaskDetailsTab.propTypes = {
  task: PropTypes.object,
  canEdit: PropTypes.bool,
  canClose: PropTypes.bool,
  onUpdate: PropTypes.func,
  onClose: PropTypes.func,
};

export default TaskDetailsTab;
