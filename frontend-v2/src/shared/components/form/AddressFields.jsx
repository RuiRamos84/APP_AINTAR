/**
 * AddressFields Component
 *
 * Componente reutilizável para campos de morada com auto-preenchimento
 * através de código postal (API CTT)
 *
 * Features:
 * - Auto-preenchimento de código postal
 * - Seleção automática quando há apenas 1 rua
 * - Dropdown com múltiplas ruas quando disponível
 * - Modo manual para entrada personalizada
 * - Auto-preenchimento de campos administrativos (nut1-4)
 * - Feedback visual (loading, success)
 * - Validação integrada
 *
 * Usage:
 * <AddressFields
 *   formData={formData}
 *   onChange={handleChange}
 *   disabled={!isEditing}
 *   required={true}
 * />
 */

import { useState, useEffect } from 'react';
import {
  TextField,
  MenuItem,
  CircularProgress,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { usePostalCode } from '@/core/hooks/usePostalCode';

/**
 * @typedef {Object} AddressData
 * @property {string} postal - Código postal (XXXX-XXX)
 * @property {string} address - Morada/Rua
 * @property {string} door - Porta
 * @property {string} floor - Andar
 * @property {string} nut1 - Distrito
 * @property {string} nut2 - Concelho
 * @property {string} nut3 - Freguesia
 * @property {string} nut4 - Localidade
 */

/**
 * Componente de campos de morada com auto-preenchimento
 *
 * @param {Object} props
 * @param {AddressData} props.formData - Dados do formulário
 * @param {Function} props.onChange - Callback quando dados mudam: (field, value) => void
 * @param {boolean} props.disabled - Se campos estão desabilitados
 * @param {boolean} props.required - Se campos são obrigatórios
 * @param {boolean} props.showNotifications - Se deve mostrar notificações (padrão: true)
 * @param {Object} props.gridSizes - Tamanhos personalizados das colunas (opcional)
 * @returns {JSX.Element}
 */
export const AddressFields = ({
  formData,
  onChange,
  disabled = false,
  required = false,
  showNotifications = true,
  gridSizes = {
    postal: { xs: 12, sm: 3 },
    address: { xs: 12, sm: 5 },
    door: { xs: 12, sm: 2 },
    floor: { xs: 12, sm: 2 },
    nut4: { xs: 12, sm: 3 },
    nut3: { xs: 12, sm: 3 },
    nut2: { xs: 12, sm: 3 },
    nut1: { xs: 12, sm: 3 },
  },
}) => {
  // Hook para código postal com auto-preenchimento
  const postalCodeHook = usePostalCode({
    onAddressFound: ({ streets, administrativeData }) => {
      // Auto-preencher campos administrativos
      onChange('nut1', administrativeData.nut1);
      onChange('nut2', administrativeData.nut2);
      onChange('nut3', administrativeData.nut3);
      onChange('nut4', administrativeData.nut4);

      // Se só existe 1 rua, selecionar automaticamente
      // Se existem mais de 1, limpar para utilizador selecionar
      onChange('address', streets.length === 1 ? streets[0] : '');
    },
    showNotifications,
  });

  // Handler para código postal com auto-preenchimento
  const handlePostalCodeChange = (event) => {
    const formatted = postalCodeHook.handlePostalCodeChange(event.target.value);

    // Se o código postal não está completo, limpar todos os campos relacionados
    if (formatted.length < 8) {
      // 8 caracteres = XXXX-XXX
      onChange('postal', formatted);
      onChange('address', '');
      onChange('nut1', '');
      onChange('nut2', '');
      onChange('nut3', '');
      onChange('nut4', '');
    } else {
      // Código postal completo, apenas atualizar o campo
      onChange('postal', formatted);
    }
  };

  // Handler para seleção de rua
  const handleAddressChange = (event) => {
    const selectedAddress = event.target.value;

    // Se selecionar "Outra", ativar modo manual
    if (selectedAddress === 'Outra') {
      postalCodeHook.enableManualMode();
      onChange('address', '');
    } else {
      onChange('address', selectedAddress);
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Código Postal */}
      <Grid size={gridSizes.postal}>
        <TextField
          fullWidth
          label="Código Postal"
          value={formData.postal || ''}
          onChange={handlePostalCodeChange}
          disabled={disabled}
          placeholder="0000-000"
          required={required}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment:
              !disabled && postalCodeHook.loading ? (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ) : !disabled && postalCodeHook.success ? (
                <InputAdornment position="end">
                  <Tooltip title="Código postal encontrado!">
                    <CheckCircleIcon color="success" />
                  </Tooltip>
                </InputAdornment>
              ) : null,
          }}
          helperText={
            !disabled
              ? postalCodeHook.loading
                ? 'A procurar endereço...'
                : postalCodeHook.success
                ? 'Endereço encontrado!'
                : 'Formato: XXXX-XXX'
              : ''
          }
        />
      </Grid>

      {/* Morada */}
      <Grid size={gridSizes.address}>
        {postalCodeHook.streets.length > 0 && !postalCodeHook.manualMode ? (
          <TextField
            fullWidth
            select
            label="Morada"
            value={formData.address || ''}
            onChange={handleAddressChange}
            disabled={disabled}
            required={required}
            helperText={
              !disabled && !formData.address
                ? `${postalCodeHook.streets.length} ${
                    postalCodeHook.streets.length === 1
                      ? 'resultado encontrado'
                      : 'resultados encontrados'
                  }`
                : ''
            }
          >
            {postalCodeHook.streets.map((street, index) => (
              <MenuItem key={index} value={street}>
                {street}
              </MenuItem>
            ))}
            <MenuItem value="Outra">
              <em>Outra (entrada manual)</em>
            </MenuItem>
          </TextField>
        ) : (
          <TextField
            fullWidth
            label="Morada"
            value={formData.address || ''}
            onChange={(e) => onChange('address', e.target.value)}
            disabled={disabled}
            required={required}
            helperText={
              !disabled
                ? postalCodeHook.manualMode
                  ? 'Modo manual - insira a morada'
                  : 'Insira o código postal primeiro'
                : ''
            }
          />
        )}
      </Grid>

      {/* Porta */}
      <Grid size={gridSizes.door}>
        <TextField
          fullWidth
          label="Porta"
          value={formData.door || ''}
          onChange={(e) => onChange('door', e.target.value)}
          disabled={disabled}
          placeholder="Ex: 1A"
        />
      </Grid>

      {/* Andar */}
      <Grid size={gridSizes.floor}>
        <TextField
          fullWidth
          label="Andar"
          value={formData.floor || ''}
          onChange={(e) => onChange('floor', e.target.value)}
          disabled={disabled}
          placeholder="Ex: 2º"
        />
      </Grid>

      {/* Localidade (NUT4) */}
      <Grid size={gridSizes.nut4}>
        <TextField
          fullWidth
          label="Localidade"
          value={formData.nut4 || ''}
          onChange={(e) => onChange('nut4', e.target.value)}
          disabled={disabled || postalCodeHook.success}
          helperText={!disabled && postalCodeHook.success ? 'Auto-preenchido' : ''}
        />
      </Grid>

      {/* Freguesia (NUT3) */}
      <Grid size={gridSizes.nut3}>
        <TextField
          fullWidth
          label="Freguesia"
          value={formData.nut3 || ''}
          onChange={(e) => onChange('nut3', e.target.value)}
          disabled={disabled || postalCodeHook.success}
          helperText={!disabled && postalCodeHook.success ? 'Auto-preenchido' : ''}
        />
      </Grid>

      {/* Concelho (NUT2) */}
      <Grid size={gridSizes.nut2}>
        <TextField
          fullWidth
          label="Concelho"
          value={formData.nut2 || ''}
          onChange={(e) => onChange('nut2', e.target.value)}
          disabled={disabled || postalCodeHook.success}
          helperText={!disabled && postalCodeHook.success ? 'Auto-preenchido' : ''}
        />
      </Grid>

      {/* Distrito (NUT1) */}
      <Grid size={gridSizes.nut1}>
        <TextField
          fullWidth
          label="Distrito"
          value={formData.nut1 || ''}
          onChange={(e) => onChange('nut1', e.target.value)}
          disabled={disabled || postalCodeHook.success}
          helperText={!disabled && postalCodeHook.success ? 'Auto-preenchido' : ''}
        />
      </Grid>
    </Grid>
  );
};

export default AddressFields;
