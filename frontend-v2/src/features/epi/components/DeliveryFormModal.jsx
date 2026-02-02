/**
 * DeliveryFormModal - Formulário de registo de entregas
 *
 * Modal para registar uma ou múltiplas entregas de EPI/Fardamento
 * Sugere automaticamente os tamanhos baseados nas preferências do colaborador
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
  Box,
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { useEpi } from '../hooks/useEpi';
import { getCurrentDate, getPreferredSize } from '../services/epiService';

const DeliveryFormModal = ({ open, onClose, onSuccess, type = 'epi', equipmentTypes = [] }) => {
  const { selectedEmployee, createBulkDeliveries, loading } = useEpi();

  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    pntt_epiwhat: '',
    pnquantity: 1,
    pndim: '',
    pnmemo: '',
  });

  // Reset ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setItems([]);
      setCurrentItem({
        pntt_epiwhat: '',
        pnquantity: 1,
        pndim: '',
        pnmemo: '',
      });
    }
  }, [open]);

  // Handlers
  const handleTypeChange = (value) => {
    const itemType = equipmentTypes.find((t) => t.pk === value);
    const preferredSize = selectedEmployee ? getPreferredSize(selectedEmployee, itemType?.value) : '';

    setCurrentItem((prev) => ({
      ...prev,
      pntt_epiwhat: value,
      pndim: preferredSize || prev.pndim,
    }));
  };

  const handleAddItem = () => {
    if (!currentItem.pntt_epiwhat) return;

    const itemType = equipmentTypes.find((t) => t.pk === currentItem.pntt_epiwhat);

    setItems((prev) => [
      ...prev,
      {
        ...currentItem,
        typeName: itemType?.value || '',
      },
    ]);

    setCurrentItem({
      pntt_epiwhat: '',
      pnquantity: 1,
      pndim: '',
      pnmemo: '',
    });
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedEmployee || items.length === 0) return;

    const deliveries = items.map((item) => ({
      pntb_epi: selectedEmployee.pk,
      pntt_epiwhat: item.pntt_epiwhat,
      pndata: getCurrentDate(),
      pnquantity: parseInt(item.pnquantity) || 1,
      pndim: item.pndim || '',
      pnmemo: item.pnmemo || '',
    }));

    try {
      await createBulkDeliveries(deliveries);
      onSuccess?.();
      onClose();
    } catch {
      // Erro já tratado no hook
    }
  };

  const isEpi = type === 'epi';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEpi ? 'Entrega de EPIs' : 'Entrega de Fardamento'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {/* Info */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>Como usar</AlertTitle>
            Adicione itens um a um. Os tamanhos são sugeridos automaticamente baseados nas
            preferências do colaborador. Pode registar múltiplos itens de uma só vez.
          </Alert>

          {/* Colaborador */}
          {selectedEmployee && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Colaborador: <strong>{selectedEmployee.pk} - {selectedEmployee.name}</strong>
            </Typography>
          )}

          {/* Form para adicionar item */}
          <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>{isEpi ? 'Tipo de EPI' : 'Tipo de Fardamento'}</InputLabel>
                  <Select
                    value={currentItem.pntt_epiwhat}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    label={isEpi ? 'Tipo de EPI' : 'Tipo de Fardamento'}
                  >
                    {equipmentTypes.map((equipType) => (
                      <MenuItem key={equipType.pk} value={equipType.pk}>
                        {equipType.value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Tamanho"
                  value={currentItem.pndim}
                  onChange={(e) =>
                    setCurrentItem((prev) => ({
                      ...prev,
                      pndim: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Quantidade"
                  value={currentItem.pnquantity}
                  onChange={(e) =>
                    setCurrentItem((prev) => ({
                      ...prev,
                      pnquantity: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid size={{ xs: 10, sm: 9, md: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Observações"
                  value={currentItem.pnmemo}
                  onChange={(e) =>
                    setCurrentItem((prev) => ({
                      ...prev,
                      pnmemo: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 2, sm: 3, md: 1 }}>
                <IconButton
                  color="primary"
                  onClick={handleAddItem}
                  disabled={!currentItem.pntt_epiwhat}
                >
                  <Add />
                </IconButton>
              </Grid>
            </Grid>
          </Paper>

          {/* Lista de itens */}
          {items.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Tamanho</TableCell>
                  <TableCell align="center">Qtd.</TableCell>
                  <TableCell>Observações</TableCell>
                  <TableCell align="center" width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.typeName}</TableCell>
                    <TableCell>{item.pndim || '-'}</TableCell>
                    <TableCell align="center">{item.pnquantity}</TableCell>
                    <TableCell>{item.pnmemo || '-'}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {items.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ py: 4 }}
            >
              Adicione itens usando o formulário acima
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || items.length === 0}
        >
          {loading ? 'A processar...' : `Registar ${items.length} Entrega${items.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeliveryFormModal;
