/**
 * BulkPriorityDialog - Dialog para alterar prioridade em massa
 *
 * @component
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Stack,
  Chip,
} from '@mui/material';
import { Flag as FlagIcon } from '@mui/icons-material';
import { useState } from 'react';
import PropTypes from 'prop-types';

const PRIORITY_OPTIONS = [
  { value: 1, label: 'Baixa', color: 'success' },
  { value: 2, label: 'Média', color: 'info' },
  { value: 3, label: 'Alta', color: 'warning' },
  { value: 4, label: 'Urgente', color: 'error' },
];

const BulkPriorityDialog = ({ open, onClose, onConfirm, selectedCount, loading = false }) => {
  const [priorityId, setPriorityId] = useState(2);

  const handleConfirm = () => {
    onConfirm({ priorityId });
  };

  const handleClose = () => {
    setPriorityId(2);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <FlagIcon color="action" />
          <span>Alterar Prioridade</span>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Aplicar nova prioridade a {selectedCount} tarefa{selectedCount !== 1 ? 's' : ''}:
        </Typography>

        <FormControl sx={{ mt: 1 }}>
          <RadioGroup
            value={priorityId}
            onChange={(e) => setPriorityId(Number(e.target.value))}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <FormControlLabel
                key={opt.value}
                value={opt.value}
                control={<Radio size="small" />}
                label={
                  <Chip
                    label={opt.label}
                    color={opt.color}
                    size="small"
                    icon={<FlagIcon />}
                    sx={{ cursor: 'pointer' }}
                  />
                }
                sx={{ mb: 0.5 }}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={loading}
        >
          Alterar ({selectedCount})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

BulkPriorityDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  selectedCount: PropTypes.number.isRequired,
  loading: PropTypes.bool,
};

export default BulkPriorityDialog;
