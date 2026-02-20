import React from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Alert,
  Box,
} from '@mui/material';
import { useMetaData } from '@/core/hooks/useMetaData';

// Parameter Types
const PARAM_TYPES = {
  NUMBER: 1,
  TEXT: 2,
  REFERENCE: 3,
  BOOLEAN: 4,
};

// Boolean param names fallback (legacy parity)
const BOOLEAN_PARAM_NAMES = [
  'Gratuito',
  'Urgência',
  'Existência de saneamento até 20 m',
  'Existência de sanemanto até 20 m',
  'Existência de rede de água',
  'Existe pavimento',
  'Existe rede de águas',
  'Existe rede de esgotos',
  'Existe rede de telecomunicações',
  'Existe rede de gás',
  'Existe rede elétrica',
  'Necessita licenciamento',
  'Obra em zona protegida',
];

const isBooleanByName = (name) => {
  if (!name) return false;
  return BOOLEAN_PARAM_NAMES.some((bp) => name.toLowerCase().includes(bp.toLowerCase()));
};

const isBooleanParam = (param) => {
  const type = parseInt(param.type, 10);
  if (type === PARAM_TYPES.BOOLEAN) return true;
  if (!param.type && isBooleanByName(param.name)) return true;
  return false;
};

// Contextual notes shown only when user selects "Sim" on specific boolean params
const BOOLEAN_NOTES = {
  gratuito:
    'A condição de gratuidade será verificada pelos técnicos da AINTAR mediante apresentação de fatura de água.',
  urgência:
    'O pedido terá prioridade sobre os restantes, contudo poderá demorar até 48h a ser realizado.',
};

const getBooleanNote = (name) => {
  if (!name) return null;
  const key = Object.keys(BOOLEAN_NOTES).find((k) => name.toLowerCase().includes(k));
  return key ? BOOLEAN_NOTES[key] : null;
};

const ParametersStep = ({ docTypeParams, paramValues, handleParamChange }) => {
  const { data: metaData } = useMetaData();

  if (!docTypeParams || docTypeParams.length === 0) {
    return (
      <Box>
        <Alert severity="info">
          Não existem parâmetros específicos configurados para este tipo de documento.
        </Alert>
      </Box>
    );
  }

  const renderInput = (param) => {
    const value = paramValues[`param_${param.param_pk}`] ?? '';
    const type = parseInt(param.type, 10);

    // BOOLEAN (by type or by name)
    if (isBooleanParam(param)) {
      const boolValue =
        value === '1' || value === 1 ? '1' : value === '0' || value === 0 ? '0' : '';
      const note = getBooleanNote(param.name);
      return (
        <FormControl component="fieldset" error={boolValue === ''}>
          <Typography variant="subtitle2" gutterBottom>
            {param.name || 'Parâmetro'}{' '}
            <Typography component="span" color="error.main">
              *
            </Typography>
          </Typography>
          <RadioGroup
            row
            value={boolValue}
            onChange={(e) => handleParamChange(param.param_pk, e.target.value)}
          >
            <FormControlLabel value="1" control={<Radio size="small" />} label="Sim" />
            <FormControlLabel value="0" control={<Radio size="small" />} label="Não" />
          </RadioGroup>
          {boolValue === '1' && note && (
            <Alert severity="info" variant="outlined" sx={{ mt: 0.5, py: 0 }}>
              <Typography variant="caption">{note}</Typography>
            </Alert>
          )}
        </FormControl>
      );
    }

    // REFERENCE
    if (type === PARAM_TYPES.REFERENCE) {
      let options = [];

      if (param.name === 'Local de descarga/ETAR' || param.name === 'ETAR') {
        options = metaData?.etar || [];
      } else if (param.name === 'EE') {
        options = metaData?.ee || [];
      } else if (param.name === 'Método de pagamento') {
        options = metaData?.payment_method || [];
        if (options.length > 0) {
          const selectedMethod = options.find((m) => String(m.pk) === String(value));
          return (
            <FormControl fullWidth disabled>
              <InputLabel>{param.name}</InputLabel>
              <Select value={String(value)} label={param.name} displayEmpty disabled>
                <MenuItem value="">
                  <em>Não definido</em>
                </MenuItem>
                {options.map((opt) => (
                  <MenuItem key={opt.pk} value={String(opt.pk)}>
                    {opt.nome || opt.value || opt.name || `Opção ${opt.pk}`}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="info.main" sx={{ mt: 1 }}>
                {value
                  ? `Definido pelo módulo de pagamentos: ${selectedMethod?.value || selectedMethod?.nome || value}`
                  : 'Gerido pelo módulo de pagamentos'}
              </Typography>
            </FormControl>
          );
        }
      }

      if (options.length > 0) {
        return (
          <FormControl fullWidth required>
            <InputLabel>{param.name}</InputLabel>
            <Select
              value={String(value)}
              onChange={(e) => handleParamChange(param.param_pk, e.target.value)}
              label={param.name}
              displayEmpty
            >
              <MenuItem value="">
                <em>Selecione...</em>
              </MenuItem>
              {options.map((opt) => (
                <MenuItem key={opt.pk} value={String(opt.pk)}>
                  {opt.nome || opt.value || opt.name || `Opção ${opt.pk}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      }

      // Fallback: render as text
    }

    // NUMBER
    if (type === PARAM_TYPES.NUMBER) {
      return (
        <TextField
          fullWidth
          required
          label={param.name}
          value={value}
          onChange={(e) => handleParamChange(param.param_pk, e.target.value)}
          type="number"
          size="small"
          InputProps={{
            endAdornment: param.units ? (
              <Typography variant="caption">{param.units}</Typography>
            ) : null,
          }}
        />
      );
    }

    // TEXT (Default)
    return (
      <TextField
        fullWidth
        required
        label={param.name}
        value={value}
        onChange={(e) => handleParamChange(param.param_pk, e.target.value)}
        multiline={param.multiline === 1}
        minRows={1}
      />
    );
  };

  const getGridSize = (param) => {
    if (isBooleanParam(param)) return { xs: 6, sm: 4, md: 3 };
    const type = parseInt(param.type, 10);
    if (type === PARAM_TYPES.NUMBER) return { xs: 12, sm: 6, md: 4 };
    if (type === PARAM_TYPES.REFERENCE) return { xs: 12, sm: 6 };
    return { xs: 12, sm: 6 };
  };

  return (
    <Box>
      <Alert severity="warning" sx={{ mb: 2 }}>
        Todos os parâmetros são de preenchimento obrigatório.
      </Alert>
      <Grid container spacing={2} alignItems="flex-start">
        {docTypeParams.map((param, index) => (
          <Grid
            size={getGridSize(param)}
            key={param.link_pk || param.param_pk || `param-${index}`}
          >
            {renderInput(param)}
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ParametersStep;
