/**
 * BulkStatusDialog - Dialog para alterar estado em massa
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
import { SwapHoriz as SwapHorizIcon } from '@mui/icons-material';
import { useState } from 'react';
import PropTypes from 'prop-types';

const STATUS_OPTIONS = [
  { value: 1, label: 'Pendente', color: 'warning' },
  { value: 2, label: 'Em Progresso', color: 'info' },
  { value: 3, label: 'Concluída', color: 'success' },
  { value: 4, label: 'Cancelada', color: 'default' },
];

const BulkStatusDialog = ({ open, onClose, onConfirm, selectedCount, loading = false }) => {
  const [statusId, setStatusId] = useState(1);

  const handleConfirm = () => {
    onConfirm({ statusId });
  };

  const handleClose = () => {
    setStatusId(1);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <SwapHorizIcon color="action" />
          <span>Alterar Estado</span>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Aplicar novo estado a {selectedCount} tarefa{selectedCount !== 1 ? 's' : ''}:
        </Typography>

        <FormControl sx={{ mt: 1 }}>
          <RadioGroup
            value={statusId}
            onChange={(e) => setStatusId(Number(e.target.value))}
          >
            {STATUS_OPTIONS.map((opt) => (
              <FormControlLabel
                key={opt.value}
                value={opt.value}
                control={<Radio size="small" />}
                label={
                  <Chip
                    label={opt.label}
                    color={opt.color}
                    size="small"
                    variant="outlined"
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

BulkStatusDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  selectedCount: PropTypes.number.isRequired,
  loading: PropTypes.bool,
};

export default BulkStatusDialog;
