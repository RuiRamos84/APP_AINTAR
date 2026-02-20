import React from 'react';
import {
  Grid,
  TextField,
  MenuItem,
  Box,
  Tooltip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Chip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckIcon,
  MyLocation as LocationIcon,
} from '@mui/icons-material';
import { usePostalCode } from '@/core/hooks/usePostalCode';

/**
 * AddressForm — Formulário de morada com lookup automático por código postal.
 *
 * Props:
 *  - values: { postal, address, door, floor, nut1, nut2, nut3, nut4 }
 *  - onChange(field, value)  — chamado para actualizar cada campo
 *  - errors: objeto com mensagens de erro por campo
 *  - disabled: desabilita todos os campos
 *  - showNuts: se mostra os chips de NUT (default true)
 */
const AddressForm = ({
  values = {},
  onChange,
  errors = {},
  disabled = false,
  showNuts = true,
}) => {
  const theme = useTheme();

  const {
    loading,
    success,
    streets,
    manualMode,
    administrativeData,
    handlePostalCodeChange,
    enableManualMode,
    disableManualMode,
  } = usePostalCode({
    showNotifications: true,
    onAddressFound: ({ administrativeData: nuts }) => {
      // Auto-fill NUT fields when postal code resolves
      onChange('nut1', nuts.nut1);
      onChange('nut2', nuts.nut2);
      onChange('nut3', nuts.nut3);
      onChange('nut4', nuts.nut4);
      // Clear address to allow user to pick from list
      onChange('address', '');
    },
  });

  const handlePostalChange = (e) => {
    const formatted = handlePostalCodeChange(e.target.value);
    onChange('postal', formatted);
  };

  const handleAddressSelect = (e) => {
    const { value } = e.target;
    if (value === '__manual__') {
      enableManualMode();
      onChange('address', '');
    } else {
      onChange('address', value);
    }
  };

  const handleReturnToList = () => {
    disableManualMode();
    onChange('address', '');
  };

  const nutLabels = [
    { key: 'nut4', label: 'Localidade' },
    { key: 'nut3', label: 'Freguesia' },
    { key: 'nut2', label: 'Concelho' },
    { key: 'nut1', label: 'Distrito' },
  ];

  // Use administrativeData from hook if available, otherwise fallback to values
  const nutValues = {
    nut1: administrativeData.nut1 || values.nut1 || '',
    nut2: administrativeData.nut2 || values.nut2 || '',
    nut3: administrativeData.nut3 || values.nut3 || '',
    nut4: administrativeData.nut4 || values.nut4 || '',
  };

  const hasNuts = nutValues.nut1 || nutValues.nut2 || nutValues.nut3 || nutValues.nut4;

  return (
    <Grid container spacing={2}>
      {/* Código Postal */}
      <Grid size={{ xs: 12, sm: 3 }}>
        <TextField
          required
          label="Código Postal"
          value={values.postal || ''}
          onChange={handlePostalChange}
          fullWidth
          disabled={disabled}
          error={!!errors.postal}
          helperText={errors.postal}
          placeholder="XXXX-XXX"
          slotProps={{
            input: {
              endAdornment: loading ? (
                <InputAdornment position="end">
                  <CircularProgress size={18} />
                </InputAdornment>
              ) : success ? (
                <InputAdornment position="end">
                  <CheckIcon color="success" fontSize="small" />
                </InputAdornment>
              ) : null,
            },
            htmlInput: { maxLength: 8 },
          }}
        />
      </Grid>

      {/* Morada */}
      <Grid size={{ xs: 12, sm: 5 }}>
        {manualMode || streets.length === 0 ? (
          <TextField
            required
            label="Morada"
            value={values.address || ''}
            onChange={(e) => onChange('address', e.target.value)}
            fullWidth
            disabled={disabled || (!values.postal && !manualMode)}
            error={!!errors.address}
            helperText={errors.address}
            slotProps={{
              input: {
                endAdornment: streets.length > 0 && manualMode ? (
                  <InputAdornment position="end">
                    <Tooltip title="Voltar à lista">
                      <IconButton size="small" onClick={handleReturnToList}>
                        <ArrowBackIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        ) : (
          <TextField
            required
            select
            label="Morada"
            value={values.address || ''}
            onChange={handleAddressSelect}
            fullWidth
            disabled={disabled}
            error={!!errors.address}
            helperText={errors.address}
          >
            {streets.map((street, idx) => (
              <MenuItem key={idx} value={street}>{street}</MenuItem>
            ))}
            <MenuItem value="__manual__">
              <em>Outra (inserir manualmente)</em>
            </MenuItem>
          </TextField>
        )}
      </Grid>

      {/* Porta */}
      <Grid size={{ xs: 6, sm: 2 }}>
        <TextField
          label="Porta"
          value={values.door || ''}
          onChange={(e) => onChange('door', e.target.value)}
          fullWidth
          disabled={disabled}
        />
      </Grid>

      {/* Andar */}
      <Grid size={{ xs: 6, sm: 2 }}>
        <TextField
          label="Andar"
          value={values.floor || ''}
          onChange={(e) => onChange('floor', e.target.value)}
          fullWidth
          disabled={disabled}
        />
      </Grid>

      {/* NUT Chips */}
      {showNuts && hasNuts && (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            <LocationIcon
              fontSize="small"
              sx={{ color: 'primary.main', opacity: 0.7, mt: 0.3 }}
            />
            {nutLabels.map(({ key, label }) =>
              nutValues[key] ? (
                <Chip
                  key={key}
                  size="small"
                  label={`${label}: ${nutValues[key]}`}
                  variant="outlined"
                  sx={{
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                />
              ) : null
            )}
          </Box>
        </Grid>
      )}

      {/* Hidden NUT fields — not visible but values tracked */}
      {!showNuts && hasNuts && (
        <Grid size={{ xs: 12 }}>
          <Typography variant="caption" color="text.secondary">
            {[nutValues.nut4, nutValues.nut3, nutValues.nut2, nutValues.nut1]
              .filter(Boolean)
              .join(' › ')}
          </Typography>
        </Grid>
      )}
    </Grid>
  );
};

export default AddressForm;
