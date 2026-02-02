/**
 * CreateTaskModal - Modal para criar nova tarefa
 * Integrado com backend real e userService
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Box,
  Typography,
  IconButton,
  Autocomplete,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import PropTypes from 'prop-types';

// Hooks
import { useTasks } from '../hooks/useTasks';
import { useWhoList } from '@/core/hooks/useMetaData';

/**
 * CreateTaskModal Component
 */
export const CreateTaskModal = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { createTask, loading } = useTasks({ autoFetch: false });
  const { data: clients } = useWhoList();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'media',
    client: null, // ID do cliente (ts_client)
  });

  const [errors, setErrors] = useState({});

  // Handle mudança de campo
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpar erro do campo
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      // Validação básica
      if (!formData.title) {
        throw new Error('O título é obrigatório');
      }

      if (!formData.client) {
        throw new Error('Selecione um cliente');
      }

      // Criar tarefa
      await createTask({
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        client: formData.client,
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'media',
        client: null,
      });
      setErrors({});

      // Callback de sucesso
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err.errors) {
        // Erros de validação Zod
        const validationErrors = {};
        err.errors.forEach((e) => {
          validationErrors[e.path[0]] = e.message;
        });
        setErrors(validationErrors);
      } else {
        toast.error(err.message || 'Erro ao criar tarefa');
      }
    }
  };

  // Handle fechar
  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'media',
      client: null,
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: { borderRadius: isMobile ? 0 : 2 },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Nova Tarefa
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ py: { xs: 2, sm: 3 } }}>
        <Stack spacing={{ xs: 2, sm: 2.5 }}>
          {/* Título */}
          <TextField
            label="Título"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
            required
            fullWidth
            autoFocus
          />

          {/* Cliente (ts_client) */}
          <Autocomplete
            options={clients}
            getOptionLabel={(option) => option.name || ''}
            value={clients.find((c) => c.pk === formData.client) || null}
            onChange={(_, newValue) => handleChange('client', newValue?.pk || null)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Cliente"
                required
                error={!!errors.client}
                helperText={errors.client || 'Atribuir tarefa a'}
              />
            )}
            isOptionEqualToValue={(option, value) => option.pk === value?.pk}
            noOptionsText="Sem clientes disponíveis"
          />

          {/* Descrição */}
          <TextField
            label="Descrição"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            error={!!errors.description}
            helperText={errors.description}
            multiline
            rows={3}
            fullWidth
          />

          {/* Prioridade */}
          <FormControl fullWidth error={!!errors.priority}>
            <InputLabel>Prioridade</InputLabel>
            <Select
              value={formData.priority}
              label="Prioridade"
              onChange={(e) => handleChange('priority', e.target.value)}
            >
              <MenuItem value="baixa">🟢 Baixa</MenuItem>
              <MenuItem value="media">🟡 Média</MenuItem>
              <MenuItem value="alta">🟠 Alta</MenuItem>
              <MenuItem value="urgente">🔴 Urgente</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          gap: { xs: 1, sm: 0 },
        }}
      >
        <Button
          onClick={handleClose}
          disabled={loading}
          fullWidth={isMobile}
          sx={{ mr: { xs: 0, sm: 1 } }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.title || !formData.client}
          startIcon={<AddIcon />}
          fullWidth={isMobile}
        >
          {loading ? 'A criar...' : 'Criar Tarefa'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

CreateTaskModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export default CreateTaskModal;
