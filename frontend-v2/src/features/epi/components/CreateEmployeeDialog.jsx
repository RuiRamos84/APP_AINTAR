/**
 * CreateEmployeeDialog - Criar novo colaborador EPI
 *
 * Dialog para registo de novo colaborador com preferências de tamanhos
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Typography,
  Divider,
  Box,
} from '@mui/material';
import { useEpi } from '../hooks/useEpi';

const INITIAL_STATE = {
  pk: '',
  name: '',
  shoe: '',
  boot: '',
  tshirt: '',
  sweatshirt: '',
  reflectivejacket: '',
  polarjacket: '',
  monkeysuit: '',
  pants: '',
  apron: '',
  gown: '',
  welderboot: '',
  waterproof: '',
  reflectivevest: '',
  galoshes: '',
  gloves: '',
  mask: '',
  memo: '',
};

// Campos que devem ser convertidos para maiúsculas
const UPPERCASE_FIELDS = [
  'tshirt',
  'sweatshirt',
  'reflectivejacket',
  'polarjacket',
  'monkeysuit',
  'pants',
  'apron',
  'gown',
  'welderboot',
  'waterproof',
  'reflectivevest',
  'galoshes',
  'gloves',
  'mask',
];

// Campos numéricos
const NUMERIC_FIELDS = ['pk', 'shoe', 'boot'];

const CreateEmployeeDialog = ({ open, onClose, onSuccess }) => {
  const { createEmployee, loading } = useEpi();
  const [employee, setEmployee] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    let processedValue = value;

    // Maiúsculas para campos de tamanho
    if (UPPERCASE_FIELDS.includes(field)) {
      processedValue = value.toUpperCase();
    }

    // Apenas números para campos numéricos
    if (NUMERIC_FIELDS.includes(field) && value && !/^\d*$/.test(value)) {
      return;
    }

    setEmployee((prev) => ({ ...prev, [field]: processedValue }));

    // Limpar erro do campo
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!employee.pk) {
      newErrors.pk = 'Número é obrigatório';
    }

    if (!employee.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await createEmployee(employee);
      handleClose();
      if (onSuccess) onSuccess();
    } catch {
      // Erro já tratado no hook
    }
  };

  const handleClose = () => {
    setEmployee(INITIAL_STATE);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Criar Novo Colaborador</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Identificação */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Identificação
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 3, md: 2 }}>
              <TextField
                fullWidth
                label="Número"
                value={employee.pk}
                onChange={(e) => handleInputChange('pk', e.target.value)}
                error={!!errors.pk}
                helperText={errors.pk}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 9, md: 10 }}>
              <TextField
                fullWidth
                label="Nome"
                value={employee.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                required
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2 }} />

          {/* Calçado */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Calçado
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                fullWidth
                label="Nº Sapato"
                value={employee.shoe}
                onChange={(e) => handleInputChange('shoe', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                fullWidth
                label="Nº Bota"
                value={employee.boot}
                onChange={(e) => handleInputChange('boot', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                fullWidth
                label="Galochas"
                value={employee.galoshes}
                onChange={(e) => handleInputChange('galoshes', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                fullWidth
                label="Botas Soldador"
                value={employee.welderboot}
                onChange={(e) => handleInputChange('welderboot', e.target.value)}
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2 }} />

          {/* Fardamento */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Fardamento
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <TextField
                fullWidth
                label="T-Shirt"
                value={employee.tshirt}
                onChange={(e) => handleInputChange('tshirt', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <TextField
                fullWidth
                label="Sweatshirt"
                value={employee.sweatshirt}
                onChange={(e) => handleInputChange('sweatshirt', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <TextField
                fullWidth
                label="Casaco Refletor"
                value={employee.reflectivejacket}
                onChange={(e) => handleInputChange('reflectivejacket', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <TextField
                fullWidth
                label="Casaco Polar"
                value={employee.polarjacket}
                onChange={(e) => handleInputChange('polarjacket', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <TextField
                fullWidth
                label="Fato Macaco"
                value={employee.monkeysuit}
                onChange={(e) => handleInputChange('monkeysuit', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <TextField
                fullWidth
                label="Calças"
                value={employee.pants}
                onChange={(e) => handleInputChange('pants', e.target.value)}
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2 }} />

          {/* EPIs */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            EPIs
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <TextField
                fullWidth
                label="Avental"
                value={employee.apron}
                onChange={(e) => handleInputChange('apron', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <TextField
                fullWidth
                label="Bata"
                value={employee.gown}
                onChange={(e) => handleInputChange('gown', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <TextField
                fullWidth
                label="Impermeável"
                value={employee.waterproof}
                onChange={(e) => handleInputChange('waterproof', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <TextField
                fullWidth
                label="Colete Refletor"
                value={employee.reflectivevest}
                onChange={(e) => handleInputChange('reflectivevest', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <TextField
                fullWidth
                label="Luvas"
                value={employee.gloves}
                onChange={(e) => handleInputChange('gloves', e.target.value)}
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2 }} />

          {/* Observações */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Observações
          </Typography>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Observações"
                value={employee.memo}
                onChange={(e) => handleInputChange('memo', e.target.value)}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !employee.name.trim() || !employee.pk}
        >
          {loading ? 'A criar...' : 'Criar Colaborador'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateEmployeeDialog;
