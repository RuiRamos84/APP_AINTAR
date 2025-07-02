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

// Mapeamento de nomes de objetos de referência para chaves nos metadados
const REF_OBJ_MAPPING = {
    'vbl_metodopagamento': 'payment_method',
    // Adicionar outros mapeamentos conforme necessário
};

const ParametersStep = ({
    docTypeParams,
    paramValues,
    handleParamChange,
    errors,
    metaData,
    lastDocument
}) => {
    const theme = useTheme();

    // Log dos metadados disponíveis para ajudar no desenvolvimento
    useEffect(() => {
        console.log("MetaData completo:", metaData);
        // Listar todas as chaves de metadados disponíveis
        if (metaData) {
            console.log("Chaves de metadados disponíveis:", Object.keys(metaData));
        }
    }, [metaData]);

    // Construir mapeamento dinâmico baseado nos metadados disponíveis
    const dynamicRefMapping = useMemo(() => {
        const mapping = { ...REF_OBJ_MAPPING };

        // Se os metadados estiverem disponíveis, verificar se podemos encontrar
        // correspondências automáticas para referências que não estão no mapeamento estático
        if (metaData) {
            docTypeParams.forEach(param => {
                if (param.type === '3' && param.refobj && !mapping[param.refobj]) {
                    // Verificar se existe uma chave semelhante no metaData
                    const possibleKey = Object.keys(metaData).find(key =>
                        key.toLowerCase() === param.refobj.toLowerCase() ||
                        key.toLowerCase().includes(param.refobj.toLowerCase().replace('vbl_', ''))
                    );

                    if (possibleKey) {
                        mapping[param.refobj] = possibleKey;
                        console.log(`Mapeamento automático: ${param.refobj} -> ${possibleKey}`);
                    }
                }
            });
        }

        return mapping;
    }, [metaData, docTypeParams]);

    // Função para obter a lista de opções baseada no refobj
    const getOptionsFromRefObj = (refobj, refpk, refvalue) => {
        // Mapear o nome do objeto de referência para a chave real nos metadados
        const metaDataKey = dynamicRefMapping[refobj] || refobj;

        console.log(`Tentando mapear ${refobj} para ${metaDataKey} nos metadados`);

        // Verificar se temos a lista nos metadados com a chave mapeada
        if (!metaData || !metaData[metaDataKey] || !Array.isArray(metaData[metaDataKey])) {
            // Tentativa de busca direta se o mapeamento falhar
            const allKeys = metaData ? Object.keys(metaData) : [];
            console.log(`Lista de opções não encontrada para ${refobj} (${metaDataKey}). Chaves disponíveis:`, allKeys);

            // Verificar se temos a lista em alguma outra chave que poderia ser compatível
            for (const key of allKeys) {
                if (Array.isArray(metaData[key]) && metaData[key].length > 0) {
                    const firstItem = metaData[key][0];
                    if (firstItem &&
                        (firstItem[refpk] !== undefined || firstItem.pk !== undefined) &&
                        (firstItem[refvalue] !== undefined || firstItem.value !== undefined)) {
                        console.log(`Encontrada possível lista compatível em ${key}:`, metaData[key]);
                        return metaData[key];
                    }
                }
            }

            return [];
        }

        console.log(`Opções encontradas para ${refobj} (${metaDataKey}):`, metaData[metaDataKey]);
        return metaData[metaDataKey];
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
        // Se o valor for undefined, null ou string vazia, não seleciona nenhuma opção
        if (value === undefined || value === null || value === '') {
            return '';
        }

        // Caso contrário, retorna '1' para verdadeiro ou '0' para falso
        if (value === '1' || value === 1 || value === 'true' || value === true) {
            return '1';
        }
        return '0';
    };

    const renderParameterField = (param) => {
        console.log("Renderizando parâmetro:", param);

        const paramId = param.tb_param;
        const paramKey = `param_${paramId}`;
        const currentValue = paramValues[paramKey] || '';
        const isRequired = param.mandatory === 1;
        const hasError = !!errors[paramKey];

        const paramType = String(param.type);

        if (paramType === '3') {
            // Verificar se temos as informações necessárias de referência
            if (!param.refobj || !param.refpk || !param.refvalue) {
                console.warn("Parâmetro de tipo 3 sem informações de referência completas:", param);
                return (
                    <TextField
                        fullWidth
                        label={`${param.name} (Lista indisponível)`}
                        value={currentValue}
                        disabled
                        error={hasError}
                    />
                );
            }

            // Obter a lista de opções
            const options = getOptionsFromRefObj(param.refobj, param.refpk, param.refvalue);
            console.log(`Opções para ${param.name}:`, options);

            // Se não encontrarmos opções, tente exibir o valor atual como texto
            if (!options || options.length === 0) {
                return (
                    <TextField
                        fullWidth
                        label={`${param.name}`}
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
                <FormControl
                    fullWidth
                    required={isRequired}
                    error={hasError}
                >
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
        } else if (paramType === '4') {
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
                        <FormControlLabel
                            value="1"
                            control={<Radio />}
                            label="Sim"
                        />
                        <FormControlLabel
                            value="0"
                            control={<Radio />}
                            label="Não"
                        />
                    </RadioGroup>
                    {hasError && (
                        <Typography variant="caption" color="error">
                            {errors[paramKey]}
                        </Typography>
                    )}
                </FormControl>
            );
        } else {
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