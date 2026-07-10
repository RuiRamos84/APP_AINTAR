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
import { filterInstallationsByAssociate } from '@/features/documents/utils/documentUtils';
import { useTheme, alpha } from '@mui/material/styles';

const PARAM_TYPES = { NUMBER: 1, TEXT: 2, REFERENCE: 3, BOOLEAN: 4 };

const BOOLEAN_PARAM_NAMES = [
  'Gratuito', 'Urgência',
  'Existência de saneamento até 20 m', 'Existência de sanemanto até 20 m',
  'Existência de rede de água', 'Existe pavimento', 'Existe rede de águas',
  'Existe rede de esgotos', 'Existe rede de telecomunicações',
  'Existe rede de gás', 'Existe rede elétrica',
  'Necessita licenciamento', 'Obra em zona protegida',
];

const HIDDEN_PARAMS = ['Método de pagamento'];

const isBooleanByName = (name) =>
  BOOLEAN_PARAM_NAMES.some((bp) => (name || '').toLowerCase().includes(bp.toLowerCase()));

const isBooleanParam = (param) => {
  const type = parseInt(param.type, 10);
  return type === PARAM_TYPES.BOOLEAN || (!param.type && isBooleanByName(param.name));
};

const BOOLEAN_NOTES = {
  gratuito: 'A condição de gratuidade será verificada pelos técnicos da AINTAR mediante apresentação de fatura de água.',
  urgência: 'O pedido terá prioridade sobre os restantes, contudo poderá demorar até 48h a ser realizado.',
};

const getBooleanNote = (name) => {
  const key = Object.keys(BOOLEAN_NOTES).find((k) => (name || '').toLowerCase().includes(k));
  return key ? BOOLEAN_NOTES[key] : null;
};

/**
 * Computes the grid size for each param:
 *  - Numbers / Text / Reference → xs:12 (full width, more room for input)
 *  - Booleans → xs:12 sm:6 if they have at least one boolean neighbour,
 *               xs:12 if alone (no boolean immediately before or after)
 */
const computeGridSizes = (params) =>
  params.map((p, i, arr) => {
    if (!isBooleanParam(p)) return { xs: 12 };
    const prevIsBoolean = i > 0 && isBooleanParam(arr[i - 1]);
    const nextIsBoolean = i < arr.length - 1 && isBooleanParam(arr[i + 1]);
    return prevIsBoolean || nextIsBoolean ? { xs: 12, sm: 6 } : { xs: 12 };
  });

const ParametersStep = ({ docTypeParams, paramValues, handleParamChange, associateName }) => {
  const { data: metaData } = useMetaData();
  const theme = useTheme();

  if (!docTypeParams || docTypeParams.length === 0) {
    return <Alert severity="info">Não existem parâmetros configurados para este tipo de documento.</Alert>;
  }

  // Filter hidden params (managed elsewhere)
  const visibleParams = docTypeParams.filter(
    (p) => !HIDDEN_PARAMS.some((h) => (p.name || '').toLowerCase() === h.toLowerCase())
  );

  const gridSizes = computeGridSizes(visibleParams);

  const renderInput = (param) => {
    const value = paramValues[`param_${param.param_pk}`] ?? '';
    const type = parseInt(param.type, 10);

    // ── BOOLEAN ──────────────────────────────────────────────────────────
    if (isBooleanParam(param)) {
      const boolValue = value === '1' || value === 1 ? '1' : value === '0' || value === 0 ? '0' : '';
      const note = getBooleanNote(param.name);

      return (
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              px: 2,
              height: 56,
              border: '1px solid',
              borderColor: alpha(theme.palette.divider, 1),
              borderRadius: `${theme.shape.borderRadius}px`,
              bgcolor: theme.palette.background.paper,
            }}
          >
            <Typography variant="body2" fontWeight="500" sx={{ flexShrink: 1, minWidth: 0 }}>
              {param.name}
              <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>
            </Typography>
            <RadioGroup
              row
              value={boolValue}
              onChange={(e) => handleParamChange(param.param_pk, e.target.value)}
              sx={{ flexShrink: 0 }}
            >
              <FormControlLabel value="1" control={<Radio size="small" />} label="Sim" sx={{ mr: 0.5 }} />
              <FormControlLabel value="0" control={<Radio size="small" />} label="Não" sx={{ mr: 0 }} />
            </RadioGroup>
          </Box>
          {boolValue === '1' && note && (
            <Alert severity="info" variant="outlined" sx={{ mt: 0.75, py: 0.5 }}>
              <Typography variant="caption">{note}</Typography>
            </Alert>
          )}
        </Box>
      );
    }

    // ── REFERENCE ─────────────────────────────────────────────────────────
    if (type === PARAM_TYPES.REFERENCE) {
      let options = [];
      if (param.name === 'Local de descarga/ETAR' || param.name === 'ETAR') {
        options = filterInstallationsByAssociate(metaData?.etar || [], associateName);
      } else if (param.name === 'EE') {
        options = metaData?.ee || [];
      }

      return (
        <FormControl fullWidth required>
          <InputLabel>{param.name}</InputLabel>
          <Select
            value={String(value)}
            onChange={(e) => handleParamChange(param.param_pk, e.target.value)}
            label={param.name}
          >
            <MenuItem value=""><em>Selecione...</em></MenuItem>
            {options.map((opt) => (
              <MenuItem key={opt.pk} value={String(opt.pk)}>
                {opt.nome || opt.value || opt.name || `Opção ${opt.pk}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    // ── NUMBER ────────────────────────────────────────────────────────────
    if (type === PARAM_TYPES.NUMBER) {
      return (
        <TextField
          fullWidth
          required
          label={param.name}
          value={value}
          onChange={(e) => handleParamChange(param.param_pk, e.target.value)}
          type="number"
          slotProps={{
            input: {
              endAdornment: param.units
                ? <Typography variant="caption" color="text.secondary">{param.units}</Typography>
                : null,
            },
          }}
        />
      );
    }

    // ── TEXT ──────────────────────────────────────────────────────────────
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

  return (
    <Grid container spacing={2} alignItems="flex-start">
      {visibleParams.map((param, index) => (
        <Grid
          size={gridSizes[index]}
          key={param.link_pk || param.param_pk || `param-${index}`}
        >
          {renderInput(param)}
        </Grid>
      ))}
    </Grid>
  );
};

export default ParametersStep;
