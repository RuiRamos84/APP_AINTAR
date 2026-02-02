/**
 * PreferencesForm - Formulário de preferências de tamanhos
 *
 * Permite editar os tamanhos preferidos de EPI e Fardamento
 * para o colaborador selecionado
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  Button,
  Divider,
  Alert,
  Fade,
} from '@mui/material';
import { Save, Undo } from '@mui/icons-material';
import { useEpi } from '../hooks/useEpi';

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

const INITIAL_PREFERENCES = {
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

const PreferencesForm = () => {
  const { selectedEmployee, updatePreferences, loading, fetchEpiData } = useEpi();
  const [preferences, setPreferences] = useState(INITIAL_PREFERENCES);
  const [originalPreferences, setOriginalPreferences] = useState(INITIAL_PREFERENCES);

  // Carregar preferências do colaborador selecionado
  useEffect(() => {
    if (selectedEmployee) {
      const currentPrefs = {
        shoe: selectedEmployee.shoe || '',
        boot: selectedEmployee.boot || '',
        tshirt: selectedEmployee.tshirt || '',
        sweatshirt: selectedEmployee.sweatshirt || '',
        reflectivejacket: selectedEmployee.reflectivejacket || '',
        polarjacket: selectedEmployee.polarjacket || '',
        monkeysuit: selectedEmployee.monkeysuit || '',
        pants: selectedEmployee.pants || '',
        apron: selectedEmployee.apron || '',
        gown: selectedEmployee.gown || '',
        welderboot: selectedEmployee.welderboot || '',
        waterproof: selectedEmployee.waterproof || '',
        reflectivevest: selectedEmployee.reflectivevest || '',
        galoshes: selectedEmployee.galoshes || '',
        gloves: selectedEmployee.gloves || '',
        mask: selectedEmployee.mask || '',
        memo: selectedEmployee.memo || '',
      };

      setPreferences(currentPrefs);
      setOriginalPreferences(currentPrefs);
    } else {
      setPreferences(INITIAL_PREFERENCES);
      setOriginalPreferences(INITIAL_PREFERENCES);
    }
  }, [selectedEmployee]);

  // Verificar se há alterações
  const hasChanges = useMemo(() => {
    return JSON.stringify(preferences) !== JSON.stringify(originalPreferences);
  }, [preferences, originalPreferences]);

  // Handlers
  const handleInputChange = (field, value) => {
    let processedValue = value;

    // Maiúsculas para campos de tamanho
    if (UPPERCASE_FIELDS.includes(field)) {
      processedValue = value.toUpperCase();
    }

    setPreferences((prev) => ({
      ...prev,
      [field]: processedValue,
    }));
  };

  const handleCancel = () => {
    setPreferences(originalPreferences);
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;

    try {
      await updatePreferences(selectedEmployee.pk, preferences);
      setOriginalPreferences(preferences);
      // Atualizar dados
      fetchEpiData(true);
    } catch {
      // Erro já tratado no hook
    }
  };

  if (!selectedEmployee) {
    return null;
  }

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Registo de Tamanhos EPI's e Fardamento
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Colaborador: <strong>{selectedEmployee.pk} - {selectedEmployee.name}</strong>
        </Typography>

        <Grid container spacing={2}>
          {/* Calçado */}
          <Grid size={12}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Calçado
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <TextField
              fullWidth
              label="Nº Sapato"
              value={preferences.shoe}
              onChange={(e) => handleInputChange('shoe', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <TextField
              fullWidth
              label="Nº Bota"
              value={preferences.boot}
              onChange={(e) => handleInputChange('boot', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <TextField
              fullWidth
              label="Galochas"
              value={preferences.galoshes}
              onChange={(e) => handleInputChange('galoshes', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <TextField
              fullWidth
              label="Botas de Soldador"
              value={preferences.welderboot}
              onChange={(e) => handleInputChange('welderboot', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <TextField
              fullWidth
              label="Luvas"
              value={preferences.gloves}
              onChange={(e) => handleInputChange('gloves', e.target.value)}
              size="small"
            />
          </Grid>

          {/* Fardamento */}
          <Grid size={12} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Fardamento
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField
              fullWidth
              label="T-Shirt"
              value={preferences.tshirt}
              onChange={(e) => handleInputChange('tshirt', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField
              fullWidth
              label="Sweatshirt"
              value={preferences.sweatshirt}
              onChange={(e) => handleInputChange('sweatshirt', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField
              fullWidth
              label="Casaco Refletor"
              value={preferences.reflectivejacket}
              onChange={(e) => handleInputChange('reflectivejacket', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField
              fullWidth
              label="Casaco Polar"
              value={preferences.polarjacket}
              onChange={(e) => handleInputChange('polarjacket', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField
              fullWidth
              label="Fato Macaco"
              value={preferences.monkeysuit}
              onChange={(e) => handleInputChange('monkeysuit', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField
              fullWidth
              label="Calças"
              value={preferences.pants}
              onChange={(e) => handleInputChange('pants', e.target.value)}
              size="small"
            />
          </Grid>

          {/* EPIs */}
          <Grid size={12} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              EPI's
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <TextField
              fullWidth
              label="Avental"
              value={preferences.apron}
              onChange={(e) => handleInputChange('apron', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <TextField
              fullWidth
              label="Bata"
              value={preferences.gown}
              onChange={(e) => handleInputChange('gown', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <TextField
              fullWidth
              label="Capa Impermeável"
              value={preferences.waterproof}
              onChange={(e) => handleInputChange('waterproof', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <TextField
              fullWidth
              label="Colete Refletor"
              value={preferences.reflectivevest}
              onChange={(e) => handleInputChange('reflectivevest', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <TextField
              fullWidth
              label="Máscara"
              value={preferences.mask}
              onChange={(e) => handleInputChange('mask', e.target.value)}
              size="small"
            />
          </Grid>

          {/* Observações */}
          <Grid size={12} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Observações
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Observações"
              value={preferences.memo}
              onChange={(e) => handleInputChange('memo', e.target.value)}
            />
          </Grid>

          {/* Botões de ação */}
          <Grid size={12}>
            <Fade in={hasChanges}>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
                <Alert severity="info" sx={{ flex: 1, maxWidth: 400 }}>
                  Existem alterações não guardadas
                </Alert>
              </Box>
            </Fade>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                disabled={!hasChanges || loading}
                startIcon={<Undo />}
              >
                Cancelar Alterações
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={!hasChanges || loading}
                startIcon={<Save />}
              >
                {loading ? 'A guardar...' : 'Guardar Tamanhos'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default PreferencesForm;
