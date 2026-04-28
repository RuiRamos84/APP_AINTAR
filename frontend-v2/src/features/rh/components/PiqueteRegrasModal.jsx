import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton, Stack, TextField, Switch,
  FormControlLabel, Typography, Box, Divider,
  Tooltip, List, ListItem, ListItemText, ListItemSecondaryAction
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Settings as RulesIcon
} from '@mui/icons-material';

const PiqueteRegrasModal = ({ open, onClose, regras: initialRegras, onSave, isSaving }) => {
  const [regras, setRegras] = useState([]);

  useEffect(() => {
    if (open) {
      setRegras(JSON.parse(JSON.stringify(initialRegras || [])));
    }
  }, [open, initialRegras]);

  const handleToggle = (index) => {
    const next = [...regras];
    next[index].ativo = !next[index].ativo;
    setRegras(next);
  };

  const handleChange = (index, field, value) => {
    const next = [...regras];
    next[index][field] = value;
    setRegras(next);
  };

  const handleAdd = () => {
    setRegras([...regras, { codigo: '', descr: '', valor: '', ativo: true }]);
  };

  const handleRemove = (index) => {
    setRegras(regras.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Validação básica: códigos não vazios
    if (regras.some(r => !r.codigo.trim())) {
      return;
    }
    onSave(regras);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <RulesIcon color="primary" />
          <Typography variant="h6">Regras de Geração de Piquete</Typography>
        </Stack>
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Estas regras definem os critérios utilizados pelo algoritmo de geração automática de escalas.
        </Typography>

        <List disablePadding>
          {regras.map((regra, index) => (
            <React.Fragment key={index}>
              <ListItem alignItems="flex-start" sx={{ px: 0, py: 2 }}>
                <Stack spacing={2} sx={{ width: '100%' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <TextField
                      label="Código"
                      size="small"
                      value={regra.codigo}
                      onChange={(e) => handleChange(index, 'codigo', e.target.value)}
                      sx={{ width: '40%' }}
                      disabled={!!regra.pk} // Protege códigos existentes se necessário
                    />
                    <Stack direction="row" spacing={1} alignItems="center">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={regra.ativo}
                            onChange={() => handleToggle(index)}
                            color="primary"
                            size="small"
                          />
                        }
                        label={<Typography variant="caption">Activa</Typography>}
                      />
                      <IconButton size="small" color="error" onClick={() => handleRemove(index)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <TextField
                    label="Descrição"
                    size="small"
                    fullWidth
                    value={regra.descr}
                    onChange={(e) => handleChange(index, 'descr', e.target.value)}
                    multiline
                    rows={1}
                  />

                  <TextField
                    label="Valor (opcional)"
                    size="small"
                    value={regra.valor || ''}
                    onChange={(e) => handleChange(index, 'valor', e.target.value)}
                    placeholder="Ex: 2, 0.5, etc."
                    sx={{ width: '50%' }}
                  />
                </Stack>
              </ListItem>
              {index < regras.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>

        <Button
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ mt: 2 }}
          size="small"
        >
          Adicionar Nova Regra
        </Button>
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Button onClick={onClose} disabled={isSaving}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'A guardar...' : 'Guardar Alterações'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PiqueteRegrasModal;
