import React, { useEffect, useMemo } from 'react';
import {
    Grid,
    Paper,
    Typography,
    Box,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    InputAdornment,
    useTheme,
    Alert,
    Chip,
    Tooltip,
    IconButton,
    Radio,
    RadioGroup
} from '@mui/material';
import {
    ListAlt as ListAltIcon,
    History as HistoryIcon,
    Restore as RestoreIcon
} from '@mui/icons-material';

// Função auxiliar para normalizar nomes de zona
const normalizeZoneName = (zoneName) => {
    if (!zoneName) return "";
    return zoneName.replace(/^Município de /, "").trim();
};

// Função para filtrar ETARs por zona do associado
const getFilteredEtars = (etars, zoneName) => {
    if (!etars || !zoneName) return [];
    const normalizedZone = normalizeZoneName(zoneName);
    return etars.filter((etar) => normalizeZoneName(etar.ts_entity) === normalizedZone);
};

const ParametersStep = ({
    docTypeParams,
    paramValues,
    handleParamChange,
    errors,
    metaData,
    lastDocument,
    entityData, // Adicionar entityData para filtrar ETARs
    formData    // Adicionar formData para obter ts_associate
}) => {
    const theme = useTheme();

    // Obter nome da zona do associado selecionado
    const getAssociateName = () => {
        if (!formData?.ts_associate || !metaData?.associates) return "";
        const associate = metaData.associates.find(a => a.pk === parseInt(formData.ts_associate));
        return associate ? associate.name : "";
    };

    const associateName = getAssociateName();

    // Log dos metadados disponíveis para debug
    useEffect(() => {
        console.log("MetaData para parâmetros:", {
            etar: metaData?.etar?.length || 0,
            payment_method: metaData?.payment_method?.length || 0,
            associates: metaData?.associates?.length || 0
        });
    }, [metaData]);

    // Função para verificar se é parâmetro booleano
    const isBooleanParam = (paramName) => {
        const booleanParams = [
            'Existe pavimento',
            'Existe rede de águas',
            'Existe rede de esgotos',
            'Existe rede de telecomunicações',
            'Existe rede de gás',
            'Existe rede elétrica',
            'Necessita licenciamento',
            'Obra em zona protegida'
        ];
        return booleanParams.some(bp => paramName.toLowerCase().includes(bp.toLowerCase()));
    };

    const handleBooleanChange = (paramId, value) => {
        handleParamChange({
            target: {
                name: `param_${paramId}`,
                value: value
            }
        });
    };

    const getBooleanDisplayValue = (value) => {
        if (value === undefined || value === null || value === '') {
            return '';
        }
        if (value === '1' || value === 1 || value === 'true' || value === true) {
            return '1';
        }
        return '0';
    };

    const renderParameterField = (param) => {
        const paramId = param.tb_param;
        const paramKey = `param_${paramId}`;
        const currentValue = paramValues[paramKey] || '';
        const isRequired = param.mandatory === 1;
        const hasError = !!errors[paramKey];
        const paramType = String(param.type);

        // Parâmetro de seleção (tipo 3)
        if (paramType === '3') {
            // Caso especial: Local de descarga/ETAR
            if (param.name === "Local de descarga/ETAR") {
                const filteredEtars = getFilteredEtars(metaData?.etar, associateName);

                return (
                    <FormControl fullWidth required={isRequired} error={hasError}>
                        <InputLabel>Local de descarga/ETAR</InputLabel>
                        <Select
                            value={currentValue}
                            onChange={(e) => handleParamChange({
                                target: {
                                    name: paramKey,
                                    value: parseInt(e.target.value, 10)
                                }
                            })}
                            label="Local de descarga/ETAR"
                            displayEmpty
                        >
                            <MenuItem value="" disabled>
                                Selecione uma ETAR
                            </MenuItem>
                            {filteredEtars.map((etar) => (
                                <MenuItem key={etar.pk} value={etar.pk}>
                                    {etar.nome}
                                </MenuItem>
                            ))}
                        </Select>
                        {hasError && (
                            <Typography variant="caption" color="error">
                                {errors[paramKey]}
                            </Typography>
                        )}
                        {filteredEtars.length === 0 && (
                            <Typography variant="caption" color="warning.main">
                                Nenhuma ETAR disponível para {associateName}
                            </Typography>
                        )}
                    </FormControl>
                );
            }

            // Outros parâmetros de seleção
            if (!param.refobj || !param.refpk || !param.refvalue) {
                return (
                    <TextField
                        fullWidth
                        label={`${param.name} (Lista indisponível)`}
                        value={currentValue}
                        disabled
                        error={hasError}
                        helperText={hasError ? errors[paramKey] : "Configuração de parâmetro incompleta"}
                    />
                );
            }

            // Mapear refobj para metaData
            const refDataKey = param.refobj.replace('vbl_', '');
            const options = metaData?.[refDataKey] || metaData?.[param.refobj] || [];

            if (!options || options.length === 0) {
                return (
                    <TextField
                        fullWidth
                        label={param.name}
                        name={paramKey}
                        value={currentValue}
                        onChange={handleParamChange}
                        required={isRequired}
                        error={hasError}
                        helperText={hasError ? errors[paramKey] : "Lista de opções não disponível"}
                    />
                );
            }

            return (
                <FormControl fullWidth required={isRequired} error={hasError}>
                    <InputLabel>{param.name}</InputLabel>
                    <Select
                        name={paramKey}
                        value={currentValue}
                        onChange={handleParamChange}
                        label={param.name}
                    >
                        {options.map((option) => (
                            <MenuItem
                                key={option[param.refpk] || option.pk}
                                value={String(option[param.refpk] || option.pk)}
                            >
                                {option[param.refvalue] || option.value}
                            </MenuItem>
                        ))}
                    </Select>
                    {hasError && (
                        <Typography variant="caption" color="error">
                            {errors[paramKey]}
                        </Typography>
                    )}
                </FormControl>
            );
        }

        // Parâmetro booleano (tipo 4 ou nome específico)
        else if (paramType === '4' || isBooleanParam(param.name)) {
            return (
                <FormControl component="fieldset" required={isRequired} error={hasError}>
                    <Typography variant="subtitle2" gutterBottom>
                        {param.name} {isRequired && <span style={{ color: 'red' }}>*</span>}
                    </Typography>
                    <RadioGroup
                        row
                        name={paramKey}
                        value={getBooleanDisplayValue(currentValue)}
                        onChange={(e) => handleBooleanChange(paramId, e.target.value)}
                    >
                        <FormControlLabel value="1" control={<Radio />} label="Sim" />
                        <FormControlLabel value="0" control={<Radio />} label="Não" />
                    </RadioGroup>
                    {hasError && (
                        <Typography variant="caption" color="error">
                            {errors[paramKey]}
                        </Typography>
                    )}
                </FormControl>
            );
        }

        // Parâmetro de texto/número (padrão)
        else {
            return (
                <TextField
                    fullWidth
                    label={param.name}
                    name={paramKey}
                    value={currentValue}
                    onChange={handleParamChange}
                    required={isRequired}
                    type={paramType === '1' ? 'number' : 'text'}
                    error={hasError}
                    helperText={hasError ? errors[paramKey] : null}
                    InputProps={{
                        endAdornment: param.units ? (
                            <InputAdornment position="end">
                                {param.units}
                            </InputAdornment>
                        ) : null
                    }}
                />
            );
        }
    };

    const applyHistoricalValues = () => {
        if (lastDocument && docTypeParams.length > 0) {
            const newValues = { ...paramValues };

            docTypeParams.forEach(param => {
                const paramKey = `param_${param.tb_param}`;
                const paramMemoKey = `param_memo_${param.tb_param}`;

                if (lastDocument[paramKey]) {
                    newValues[paramKey] = lastDocument[paramKey];
                }

                if (lastDocument[paramMemoKey]) {
                    newValues[paramMemoKey] = lastDocument[paramMemoKey];
                }
            });

            handleParamChange({ target: { name: 'bulk_update', value: newValues } });
        }
    };

    return (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
                <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                    }}
                >
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Box display="flex" alignItems="center">
                            <ListAltIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h6">
                                Parâmetros do Pedido
                            </Typography>
                        </Box>

                        {lastDocument && (
                            <Tooltip title="Usar valores do último pedido">
                                <IconButton
                                    color="primary"
                                    onClick={applyHistoricalValues}
                                    size="small"
                                >
                                    <RestoreIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>

                    {lastDocument && (
                        <Box mb={2}>
                            <Chip
                                icon={<HistoryIcon />}
                                label="Valores sugeridos com base no histórico"
                                color="info"
                                variant="outlined"
                                size="small"
                            />
                        </Box>
                    )}

                    {docTypeParams.length === 0 ? (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Este tipo de pedido não possui parâmetros adicionais.
                        </Alert>
                    ) : (
                        <Grid container spacing={2}>
                            {docTypeParams.map((param) => (
                                <React.Fragment key={param.tb_param}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        {renderParameterField(param)}
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            fullWidth
                                            label={`Observações para ${param.name}`}
                                            name={`param_memo_${param.tb_param}`}
                                            value={paramValues[`param_memo_${param.tb_param}`] || ''}
                                            onChange={handleParamChange}
                                            multiline
                                            rows={2}
                                        />
                                    </Grid>
                                </React.Fragment>
                            ))}
                        </Grid>
                    )}
                </Paper>
            </Grid>
        </Grid>
    );
};

export default ParametersStep;