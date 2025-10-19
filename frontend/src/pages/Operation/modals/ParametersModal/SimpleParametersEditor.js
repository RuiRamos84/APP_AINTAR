import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
    Box, Typography, TextField, FormControl,
    InputLabel, Select, MenuItem, Grid,
    RadioGroup, FormControlLabel, Radio, CircularProgress
} from '@mui/material';
import { updateDocumentParams, getDocumentTypeParams } from '../../../../services/documentService';
import { useMetaData } from '../../../../contexts/MetaDataContext';
import { notification } from '../../../../components/common/Toaster/ThemedToaster';

const SimpleParametersEditor = forwardRef(({ document, metaData }, ref) => {
    const [params, setParams] = useState([]);
    const [loading, setLoading] = useState(false);
    const { metaData: globalMetaData } = useMetaData();

    // Expor função de guardar para o componente pai via ref
    useImperativeHandle(ref, () => ({
        saveParams: handleSave
    }));

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

            // Notificar utilizador apenas em erros críticos
            if (error.response?.status === 403) {
                notification.warning('⚠️ Sem permissão para visualizar parâmetros.');
            } else if (error.response?.status !== 404) {
                // 404 é normal quando não há params ainda
                notification.warning('⚠️ Erro ao carregar parâmetros existentes.');
            }

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
        try {
            const formattedParams = params.map(param => ({
                pk: Number(param.pk),
                value: param.value !== null && param.value !== undefined ? String(param.value) : "",
                memo: param.memo ? String(param.memo) : ""
            }));

            await updateDocumentParams(document.pk, formattedParams);
            console.log('✅ Parâmetros guardados com sucesso');
            return true; // Retornar sucesso
        } catch (error) {
            console.error("Erro ao atualizar parâmetros:", error);

            // Tratamento específico de erros
            if (error.response?.data?.erro) {
                notification.error(`❌ ${error.response.data.erro}`);
            } else if (!error.response) {
                // Erro de rede
                notification.error('❌ Erro de conexão. Verifique a sua internet.');
            }
            throw error; // Propagar erro para o pai
        }
    };

    const isBooleanParam = (name) => {
        return [
            "Gratuito", "Gratuita", "Existência de sanemanto até 20 m",
            "Existência de rede de água", "Urgência",
            "Existência de saneamento até 20 m"
        ].includes(name);
    };

    const isReadOnlyParam = (name) => {
        // Só readonly para parâmetros de origem (não de destino/descarga)
        return ["ETAR", "EE"].includes(name);
    };

    const isSelectableParam = (name) => {
        // Lista para escolher destino
        return [
            "Local de descarga/ETAR",
            "ETAR de destino",
            "Local de destino",
            "ETAR destino"
        ].includes(name);
    };

    const isEtarParam = (name) => {
        return [
            "Local de descarga/ETAR",
            "ETAR de destino",
            "Local de destino",
            "ETAR destino",
            "ETAR"
        ].includes(name);
    };

    const isEeParam = (name) => {
        return ["EE"].includes(name);
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

    // Detectar e converter valor PK <-> Nome
    const getDisplayValue = (param) => {
        if (!param.value) return "";
        if (!globalMetaData) return param.value;

        const value = param.value.toString().trim();

        // Se é número, é PK - buscar nome
        if (/^\d+$/.test(value)) {
            const pk = parseInt(value);

            // Tentar em ETAR
            const etar = globalMetaData.etar?.find(e => e.pk === pk);
            if (etar) return etar.nome;

            // Tentar em EE
            const ee = globalMetaData.ee?.find(e => e.pk === pk);
            if (ee) return ee.name || ee.nome;

            return value;
        }

        return value;
    };

    // Converter nome para PK ao guardar
    const convertToId = (paramName, inputValue) => {
        if (!inputValue || !globalMetaData) return "";

        const value = inputValue.toString().trim();

        // Se já é número, manter
        if (/^\d+$/.test(value)) return value;

        // Se é parâmetro ETAR, procurar em ETAR
        if (isEtarParam(paramName)) {
            const etar = globalMetaData.etar?.find(e =>
                e.nome?.toLowerCase() === value.toLowerCase()
            );
            if (etar) return etar.pk.toString();
        }

        // Se é parâmetro EE, procurar em EE
        if (isEeParam(paramName)) {
            const ee = globalMetaData.ee?.find(e =>
                (e.name?.toLowerCase() === value.toLowerCase()) ||
                (e.nome?.toLowerCase() === value.toLowerCase())
            );
            if (ee) return ee.pk.toString();
        }

        return value;
    };

    // Obter nome ETAR por PK
    const getEtarNameByPk = (etarPk) => {
        if (!etarPk || !globalMetaData?.etar?.length) return etarPk;

        const pkToFind = parseInt(etarPk);
        const etar = globalMetaData.etar.find(e => parseInt(e.pk) === pkToFind);

        return etar ? `${etar.nome} (${etar.ts_entity})` : `ETAR ID: ${etarPk}`;
    };

    // Obter nome EE por PK
    const getEeNameByPk = (eePk) => {
        if (!eePk || !globalMetaData?.ee?.length) return eePk;

        const pkToFind = parseInt(eePk);
        const ee = globalMetaData.ee.find(e => parseInt(e.pk) === pkToFind);

        return ee ? `${ee.name || ee.nome}` : `EE ID: ${eePk}`;
    };

    // Obter nome método pagamento por PK
    const getPaymentMethodNameByPk = (methodPk) => {
        if (!methodPk || !globalMetaData?.payment_method?.length) return methodPk;

        const pkToFind = parseInt(methodPk);
        const method = globalMetaData.payment_method.find(m => parseInt(m.pk) === pkToFind);

        return method ? method.value : `Método ID: ${methodPk}`;
    };

    // Formatar valor boolean
    const formatBooleanValue = (value) => {
        if (value === "1" || value === 1) return "Sim";
        if (value === "0" || value === 0) return "Não";
        return value;
    };

    // Detectar tipo de parâmetro e buscar valor formatado
    const getFormattedValue = (param) => {
        if (!param.value) return "";

        // Se é parâmetro ETAR
        if (isEtarParam(param.name)) {
            return getEtarNameByPk(param.value);
        }

        // Se é parâmetro EE
        if (isEeParam(param.name)) {
            return getEeNameByPk(param.value);
        }

        // Se é método de pagamento
        if (param.name === "Método de pagamento") {
            return getPaymentMethodNameByPk(param.value);
        }

        // Se é boolean
        if (isBooleanParam(param.name)) {
            return formatBooleanValue(param.value);
        }

        return param.value;
    };

    if (loading || !params.length) {
        return <CircularProgress />;
    }

    const filteredEtars = getFilteredEtars();

    return (
        <Box>
            <Grid container spacing={3}>
                {params.map(param => (
                    <Grid size={{ xs: 12 }} key={param.pk}>
                        {isBooleanParam(param.name) && (
                            <Typography variant="subtitle1" gutterBottom>{param.name}</Typography>
                        )}

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }} md={6}>
                                {isSelectableParam(param.name) && globalMetaData?.etar?.length > 0 ? (
                                    <FormControl fullWidth>
                                        <InputLabel id={`etar-select-${param.pk}`}>{param.name}</InputLabel>
                                        <Select
                                            labelId={`etar-select-${param.pk}`}
                                            value={param.value || ""}
                                            onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
                                            label={param.name}
                                        >
                                            <MenuItem value="">
                                                <em>Selecionar ETAR</em>
                                            </MenuItem>
                                            {(filteredEtars.length > 0 ? filteredEtars : globalMetaData.etar).map(etar => (
                                                <MenuItem key={etar.pk} value={etar.pk.toString()}>
                                                    {etar.nome} ({etar.ts_entity})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                ) : isEtarParam(param.name) && isReadOnlyParam(param.name) ? (
                                    <TextField
                                        fullWidth
                                        variant="outlined"
                                        label={param.name}
                                        value={getEtarNameByPk(param.value)}
                                        disabled
                                        sx={{
                                            backgroundColor: 'grey.100',
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'grey.300'
                                            }
                                        }}
                                    />
                                ) : isEeParam(param.name) && isReadOnlyParam(param.name) ? (
                                    <TextField
                                        fullWidth
                                        variant="outlined"
                                        label={param.name}
                                        value={getEeNameByPk(param.value)}
                                        disabled
                                        sx={{
                                            backgroundColor: 'grey.100',
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'grey.300'
                                            }
                                        }}
                                    />
                                ) : param.name === "Método de pagamento" && globalMetaData?.payment_method?.length > 0 ? (
                                    <FormControl fullWidth>
                                        <InputLabel>Método de Pagamento</InputLabel>
                                        <Select
                                            value={param.value || ""}
                                            onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
                                            label="Método de Pagamento"
                                            displayEmpty
                                            renderValue={(selected) => {
                                                if (!selected) return "";
                                                const method = globalMetaData.payment_method.find(m => m.pk.toString() === selected.toString());
                                                return method ? method.value : selected;
                                            }}
                                        >
                                            <MenuItem value="">
                                                <em>Selecionar método</em>
                                            </MenuItem>
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
                                        value={getDisplayValue(param)}
                                        onChange={(e) => {
                                            const pkValue = convertToId(param.name, e.target.value);
                                            handleParamChange(param.pk, "value", pkValue);
                                        }}
                                    />
                                )}
                            </Grid>
                            <Grid size={{ xs: 12 }} md={6}>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    label="Observações"
                                    value={param.memo || ""}
                                    onChange={(e) => handleParamChange(param.pk, "memo", e.target.value)}
                                />
                            </Grid>
                        </Grid>

                        {isReadOnlyParam(param.name) && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                🔒 Este valor não pode ser alterado
                            </Typography>
                        )}
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
});

export default SimpleParametersEditor;