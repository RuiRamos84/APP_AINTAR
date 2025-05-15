import React, { useState, useEffect } from 'react';
import {
    Box, Typography, TextField, FormControl,
    InputLabel, Select, MenuItem, Grid,
    RadioGroup, FormControlLabel, Radio, Button, CircularProgress
} from '@mui/material';
import { updateDocumentParams, getDocumentTypeParams } from '../../../../services/documentService';
import { useMetaData } from '../../../../contexts/MetaDataContext';

const SimpleParametersEditor = ({ document, metaData, onSave }) => {
    const [params, setParams] = useState([]);
    const [loading, setLoading] = useState(false);
    const { metaData: globalMetaData } = useMetaData();

    useEffect(() => {
        if (document && metaData?.params) {
            fetchExistingValues();
        }
    }, [document, metaData]);

    const fetchExistingValues = async () => {
        try {
            const response = await getDocumentTypeParams(document.pk);
            if (response && response.length > 0) {
                const updatedParams = metaData.params.map(param => {
                    const existingParam = response.find(p => p.param === param.pk);
                    return {
                        ...param,
                        value: existingParam ? existingParam.value : "",
                        memo: existingParam ? existingParam.memo : ""
                    };
                });
                setParams(updatedParams);
            } else {
                setParams(metaData.params);
            }
        } catch (error) {
            console.error("Erro ao buscar valores existentes:", error);
            setParams(metaData.params);
        }
    };

    const handleParamChange = (paramPk, field, value) => {
        setParams(prevParams =>
            prevParams.map(param =>
                param.pk === paramPk ? { ...param, [field]: value } : param
            )
        );
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const formattedParams = params.map(param => ({
                pk: Number(param.pk),
                value: param.value !== null && param.value !== undefined ? String(param.value) : "",
                memo: param.memo ? String(param.memo) : ""
            }));

            await updateDocumentParams(document.pk, formattedParams);
            if (onSave) onSave();
        } catch (error) {
            console.error("Erro ao atualizar parâmetros:", error);
        } finally {
            setLoading(false);
        }
    };

    const isBooleanParam = (name) => {
        return [
            "Gratuito", "Gratuita", "Existência de sanemanto até 20 m",
            "Existência de rede de água", "Urgência",
            "Existência de saneamento até 20 m"
        ].includes(name);
    };

    const getAssociateName = (associate) => {
        if (!associate) return "";
        return associate
            .replace(/^Município de\s+/i, "")
            .replace(/^Câmara Municipal de\s+/i, "")
            .trim();
    };

    const getFilteredEtars = () => {
        if (!globalMetaData?.etar?.length) return [];

        if (document?.ts_associate) {
            const associateName = getAssociateName(document.ts_associate);
            return globalMetaData.etar.filter(etar =>
                etar.ts_entity === associateName
            );
        }

        return globalMetaData.etar;
    };

    if (loading || !params.length) {
        return <CircularProgress />;
    }

    const filteredEtars = getFilteredEtars();

    return (
        <Box>
            <Grid container spacing={3}>
                {params.map(param => (
                    <Grid item xs={12} key={param.pk}>
                        {isBooleanParam(param.name) && (
                            <Typography variant="subtitle1" gutterBottom>{param.name}</Typography>
                        )}

                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                {param.name === "Local de descarga/ETAR" && globalMetaData?.etar?.length > 0 ? (
                                    <FormControl fullWidth>
                                        <InputLabel>Local de Descarga</InputLabel>
                                        <Select
                                            value={param.value || ""}
                                            onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
                                            label="Local de Descarga"
                                        >
                                            {(filteredEtars.length > 0 ? filteredEtars : globalMetaData.etar).map(etar => (
                                                <MenuItem key={etar.pk} value={etar.pk.toString()}>
                                                    {etar.nome} ({etar.ts_entity})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                ) : param.name === "Método de pagamento" && globalMetaData?.payment_method?.length > 0 ? (
                                    <FormControl fullWidth>
                                        <InputLabel>Método de Pagamento</InputLabel>
                                        <Select
                                            value={param.value || ""}
                                            onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
                                            label="Método de Pagamento"
                                        >
                                            {globalMetaData.payment_method.map(method => (
                                                <MenuItem key={method.pk} value={method.pk.toString()}>
                                                    {method.value}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                ) : param.name === "Número de cisternas" ? (
                                    <TextField
                                        fullWidth
                                        variant="outlined"
                                        label="Número de cisternas"
                                        type="number"
                                        value={param.value || ""}
                                        onChange={(e) => {
                                            const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                                            handleParamChange(param.pk, "value", onlyNums);
                                        }}
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                    />
                                ) : isBooleanParam(param.name) ? (
                                    <RadioGroup
                                        row
                                        value={param.value || ""}
                                        onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
                                    >
                                        <FormControlLabel value="1" control={<Radio />} label="Sim" />
                                        <FormControlLabel value="0" control={<Radio />} label="Não" />
                                    </RadioGroup>
                                ) : (
                                    <TextField
                                        fullWidth
                                        variant="outlined"
                                        label="Valor"
                                        value={param.value || ""}
                                        onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
                                    />
                                )}
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    label="Observações"
                                    value={param.memo || ""}
                                    onChange={(e) => handleParamChange(param.pk, "memo", e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </Grid>
                ))}
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} /> : "Guardar"}
                </Button>
            </Box>
        </Box>
    );
};

export default SimpleParametersEditor;