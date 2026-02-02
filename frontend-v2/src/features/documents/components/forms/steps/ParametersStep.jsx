import React from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Alert,
  Box
} from '@mui/material';
import { useMetaData } from '@/core/hooks/useMetaData';

// Parameter Types
const PARAM_TYPES = {
    NUMBER: 1,
    TEXT: 2,
    REFERENCE: 3,
    BOOLEAN: 4
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
        const value = paramValues[`param_${param.param_pk}`] || '';
        const type = parseInt(param.type, 10);

        // DATE - The legacy code didn't explicitly show DATE type in PARAM_TYPES constant, 
        // but often 'type' 5 or others might exist. 
        // Based on legacy ParametersTab.js: 
        // PARAM_TYPES = { NUMBER: 1, TEXT: 2, REFERENCE: 3, BOOLEAN: 4 };
        // We stick to these for now.

        // PARAM_TYPES.BOOLEAN
        if (type === PARAM_TYPES.BOOLEAN) {
            const isChecked = value === '1' || value === 1;
            return (
                <FormControlLabel
                    control={
                        <Switch
                            checked={isChecked}
                            onChange={(e) => handleParamChange(param.param_pk, e.target.checked)}
                            color="primary"
                        />
                    }
                    label={isChecked ? "Sim" : "Não"}
                />
            );
        }

        // PARAM_TYPES.REFERENCE
        if (type === PARAM_TYPES.REFERENCE) {
            let options = [];
            let label = param.name;

            // Legacy fallback logic for references based on name
            if (param.name === "Local de descarga/ETAR" || param.name === "ETAR") {
                options = metaData?.etar || [];
                label = "ETAR";
            } else if (param.name === "EE") {
                options = metaData?.ee || [];
                label = "Estação Elevatória";
            } else if (param.name === "Método de pagamento") {
                options = metaData?.payment_method || [];
                label = "Método de Pagamento";
            }

            // If we found a matching list
            if (options.length > 0) {
                 return (
                    <FormControl fullWidth>
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
                                    {/* Usually 'nome' or 'value' or 'name' */}
                                    {opt.nome || opt.value || opt.name || `Opção ${opt.pk}`}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                );
            }
            
            // Fallback if no list found but type is Reference (render as text)
        }

        // PARAM_TYPES.NUMBER
        if (type === PARAM_TYPES.NUMBER) {
             return (
                <TextField
                    fullWidth
                    label={param.name}
                    value={value}
                    onChange={(e) => handleParamChange(param.param_pk, e.target.value)}
                    type="number"
                    InputProps={{
                        endAdornment: param.units ? <Typography variant="caption">{param.units}</Typography> : null
                    }}
                />
            );
        }

        // PARAM_TYPES.TEXT (Default)
        return (
            <TextField
                fullWidth
                label={param.name}
                value={value}
                onChange={(e) => handleParamChange(param.param_pk, e.target.value)}
                multiline={param.multiline === 1} // Assuming metadata might have this
                minRows={1}
            />
        );
    };

    return (
        <Grid container spacing={3}>
            {docTypeParams.map((param) => (
                <Grid item xs={12} md={6} key={param.link_pk}>
                    <Box sx={{ mb: 1 }}>
                        {renderInput(param)}
                    </Box>
                </Grid>
            ))}
        </Grid>
    );
};

export default ParametersStep;
