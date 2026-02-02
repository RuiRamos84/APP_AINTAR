import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Chip,
  FormControlLabel,
  Checkbox,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  FileCopy as FileCopyIcon,
  Description as DescriptionIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useReplicateDocument } from '../../hooks/useDocuments';
import { useMetaData } from '@/core/hooks/useMetaData';

/**
 * Modal to replicate/duplicate a document with a new type
 */
const ReplicateDocumentModal = ({ open, onClose, document }) => {
  const theme = useTheme();
  const [selectedType, setSelectedType] = useState('');
  const [showInternalOnly, setShowInternalOnly] = useState(false);

  const { data: metaData } = useMetaData();
  const replicateMutation = useReplicateDocument();

  // Filter document types based on internal/external toggle
  const filteredTypes = useMemo(() => {
    if (!metaData?.types) return [];
    return metaData.types.filter((type) =>
      showInternalOnly ? type.intern === 1 : type.intern === 0
    );
  }, [metaData?.types, showInternalOnly]);

  const handleClose = () => {
    if (replicateMutation.isPending) return;
    setSelectedType('');
    setShowInternalOnly(false);
    onClose();
  };

  const handleInternalToggle = (event) => {
    setShowInternalOnly(event.target.checked);
    setSelectedType('');
  };

  const handleSubmit = () => {
    if (!selectedType) return;

    replicateMutation.mutate(
      { id: document.pk, newType: selectedType },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  const isLoading = replicateMutation.isPending;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileCopyIcon />
            <Typography variant="h6">Replicar Pedido: {document?.regnumber}</Typography>
          </Box>
          <IconButton onClick={handleClose} disabled={isLoading} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Alert severity="info">
              A replicação criará um novo pedido com os mesmos dados da entidade, mas com um novo
              tipo de documento.
            </Alert>
          </Grid>

          {/* Original Document Info */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                Documento Original
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                <DescriptionIcon color="primary" fontSize="small" />
                <Typography variant="body1" fontWeight={500}>
                  {document?.regnumber}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <strong>Tipo:</strong> {document?.tt_type}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Entidade:</strong> {document?.ts_entity}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>NIPC:</strong> {document?.nipc || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Associado:</strong> {document?.ts_associate || 'N/A'}
              </Typography>
            </Paper>
          </Grid>

          {/* New Type Selection */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                Selecione o novo Tipo de Pedido
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={showInternalOnly}
                    onChange={handleInternalToggle}
                    disabled={isLoading}
                  />
                }
                label="Pedidos internos"
                sx={{ mb: 1 }}
              />

              <TextField
                select
                fullWidth
                label="Tipo de Documento"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                disabled={isLoading}
              >
                {filteredTypes.length > 0 ? (
                  filteredTypes.map((type) => (
                    <MenuItem
                      key={type.pk}
                      value={type.tt_doctype_code}
                      disabled={type.tt_doctype_code === document?.tt_type_code}
                    >
                      {type.tt_doctype_value}
                      {type.intern === 1 && (
                        <Chip
                          label="Interno"
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ ml: 1, height: 20 }}
                        />
                      )}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    {showInternalOnly
                      ? 'Sem tipos de pedidos internos disponíveis'
                      : 'Sem tipos de pedidos standard disponíveis'}
                  </MenuItem>
                )}
              </TextField>

              <Alert severity="warning" sx={{ mt: 2 }}>
                Revise os dados cuidadosamente antes de criar o novo pedido.
              </Alert>
            </Paper>
          </Grid>
        </Grid>

        {replicateMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Erro ao replicar: {replicateMutation.error?.message}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isLoading} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isLoading || !selectedType}
          startIcon={isLoading ? <CircularProgress size={20} /> : <FileCopyIcon />}
        >
          {isLoading ? 'Replicando...' : 'Replicar Documento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReplicateDocumentModal;
