import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  MenuItem,
  CircularProgress,
  Typography,
  Alert,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAddStep, useDocumentDetails } from '../../hooks/useDocuments';
import { useMetaData } from '@/core/hooks/useMetaData';
import { getAvailableSteps, getAvailableUsersForStep } from '../../utils/workflowUtils';
import VacationWarningBadge from '../vacation/VacationWarningBadge';

/**
 * Modal to Add a Step/Action to a Document
 * Uses workflow validation to show only valid transitions
 */
const AddStepModal = ({ open, onClose, documentId, document: propDocument, initialStep }) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);

  // If document is passed as prop, use it. Otherwise try to fetch
  const { data: fetchedDocument } = useDocumentDetails(propDocument ? null : documentId);
  const document = propDocument || fetchedDocument;
  const { data: metaData } = useMetaData();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      step: initialStep || '',
      user: '',
      memo: '',
    },
  });

  // Pre-select step when initialStep changes (Kanban drag-drop)
  React.useEffect(() => {
    if (initialStep && open) {
      setValue('step', initialStep);
    }
  }, [initialStep, open, setValue]);

  const selectedStep = watch('step');

  const addStepMutation = useAddStep();

  // Available steps based on workflow transitions
  const availableSteps = useMemo(() => {
    if (!document || !metaData) return [];
    return getAvailableSteps(document, metaData);
  }, [document, metaData]);

  // Available users for selected step
  const availableUsers = useMemo(() => {
    if (!selectedStep || !document || !metaData) return [];
    return getAvailableUsersForStep(Number(selectedStep), document, metaData);
  }, [selectedStep, document, metaData]);

  const handleFileSelect = useCallback((event) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = () => {
    reset({ step: '', user: '', memo: '' });
    setFile(null);
    onClose();
  };

  const onSubmit = (data) => {
    const formData = new FormData();
    formData.append('what', data.step);
    if (data.user) formData.append('who', data.user);
    formData.append('memo', data.memo || '');

    if (file) {
      formData.append('files', file);
    }

    addStepMutation.mutate(
      { id: documentId, formData },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Nova Ação</DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Step Selection */}
            <Controller
              name="step"
              control={control}
              rules={{ required: 'Selecione um passo' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Passo / Ação"
                  fullWidth
                  error={!!errors.step}
                  helperText={errors.step?.message}
                >
                  {availableSteps.length > 0 ? (
                    availableSteps.map((s) => (
                      <MenuItem key={s.pk} value={s.pk}>
                        {s.step}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem value="" disabled>
                      {document ? 'Sem passos disponíveis' : 'A carregar...'}
                    </MenuItem>
                  )}
                </TextField>
              )}
            />

            {/* User Selection */}
            <Controller
              name="user"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Destinatário"
                  fullWidth
                  disabled={!selectedStep}
                  helperText={
                    !selectedStep
                      ? 'Selecione um passo primeiro'
                      : availableUsers.length === 0
                        ? 'Nenhum utilizador disponível para este passo'
                        : undefined
                  }
                >
                  {availableUsers.map((u) => (
                    <MenuItem key={u.pk} value={u.pk}>
                      {u.name || u.username || `User ${u.pk}`}
                    </MenuItem>
                  ))}
                  {availableUsers.length === 0 && (
                    <MenuItem value="" disabled>
                      Sem utilizadores disponíveis
                    </MenuItem>
                  )}
                </TextField>
              )}
            />
            {/* Vacation Warning for selected user */}
            {watch('user') && (
              <VacationWarningBadge
                userId={watch('user')}
                userName={
                  availableUsers.find((u) => u.pk === watch('user'))?.name || ''
                }
              />
            )}

            {/* Memo */}
            <Controller
              name="memo"
              control={control}
              rules={{ required: 'A observação é obrigatória' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Observações"
                  multiline
                  rows={4}
                  fullWidth
                  error={!!errors.memo}
                  helperText={errors.memo?.message}
                />
              )}
            />

            {/* File Upload */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Anexo (opcional)
              </Typography>
              {file ? (
                <Chip
                  icon={<FileIcon />}
                  label={file.name}
                  onDelete={() => setFile(null)}
                  deleteIcon={<DeleteIcon />}
                  variant="outlined"
                />
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  size="small"
                >
                  Selecionar ficheiro
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </Box>

            {addStepMutation.isError && (
              <Alert severity="error">
                Erro ao adicionar ação: {addStepMutation.error?.message}
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} color="inherit" disabled={addStepMutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={addStepMutation.isPending}>
            {addStepMutation.isPending ? <CircularProgress size={24} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddStepModal;
