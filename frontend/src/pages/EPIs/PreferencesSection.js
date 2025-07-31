import React, { useState, useEffect } from "react";
import {
    Box, Typography, Grid, Paper, TextField, Button, FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import { updateEpiPreferences } from "../../services/episervice";
import { notifySuccess, notifyError } from "../../components/common/Toaster/ThemedToaster";
import { useEpi } from "../../contexts/EpiContext";

const PreferencesSection = ({ selectedEmployee }) => {
    const [preferences, setPreferences] = useState({
        tt_epishoetype: "",
        shoenumber: "",
        tshirt: "",
        sweatshirt: "",
        jacket: "",
        pants: "",
        apron: "",
        gown: "",
        welderboot: "",
        waterproof: "",
        reflectivevest: "",
        galoshes: "",
        gloves: "",
        mask: "",
        memo: ""
    });

    const [originalPreferences, setOriginalPreferences] = useState({});
    const [hasChanges, setHasChanges] = useState(false);

    const { epiData, loading, error, fetchEpiData, updateEpiList } = useEpi();

    // Carrega os dados quando o componente monta
    useEffect(() => {
        fetchEpiData();
    }, [fetchEpiData]);

    useEffect(() => {
        if (selectedEmployee) {
            const employee = epiData?.epi_list?.find(emp => emp.pk === selectedEmployee);
            if (employee) {
                const shoeType = epiData?.epi_shoe_types?.find(
                    type => type.value.toLowerCase() === employee.tt_epishoetype?.toLowerCase()
                );

                const currentPrefs = {
                    tt_epishoetype: shoeType?.pk || "",
                    shoenumber: employee.shoenumber || "",
                    tshirt: employee.tshirt || "",
                    sweatshirt: employee.sweatshirt || "",
                    jacket: employee.jacket || "",
                    pants: employee.pants || "",
                    apron: employee.apron || "",
                    gown: employee.gown || "",
                    welderboot: employee.welderboot || "",
                    waterproof: employee.waterproof || "",
                    reflectivevest: employee.reflectivevest || "",
                    galoshes: employee.galoshes || "",
                    gloves: employee.gloves || "",
                    mask: employee.mask || "",
                    memo: employee.memo || ""
                };

                setPreferences(currentPrefs);
                setOriginalPreferences(currentPrefs);
                setHasChanges(false);
            }
        } else {
            handleReset();
        }
    }, [selectedEmployee, epiData]);

    const handleReset = () => {
        setPreferences({
            tt_epishoetype: "",
            shoenumber: "",
            tshirt: "",
            sweatshirt: "",
            jacket: "",
            pants: "",
            apron: "",
            gown: "",
            welderboot: "",
            waterproof: "",
            reflectivevest: "",
            galoshes: "",
            gloves: "",
            mask: "",
            memo: ""
        });
    };

    const handleInputChange = (field, value) => {
        // Campos que devem ter todas as letras maiúsculas
        const upperCaseFields = [
            'shoenumber', 'tshirt', 'sweatshirt', 'jacket', 'pants',
            'apron', 'gown', 'welderboot', 'waterproof', 'reflectivevest',
            'galoshes', 'gloves', 'mask'
        ];

        let processedValue = value;
        if (upperCaseFields.includes(field)) {
            processedValue = value.toUpperCase();
        }

        const newPrefs = {
            ...preferences,
            [field]: processedValue
        };

        setPreferences(newPrefs);

        // Verificar se há alterações
        const hasChanged = JSON.stringify(newPrefs) !== JSON.stringify(originalPreferences);
        setHasChanges(hasChanged);
    };

    const handleCancel = () => {
        setPreferences(originalPreferences);
        setHasChanges(false);
    };

    const handleSave = async () => {
        if (!selectedEmployee) {
            notifyError("Nenhum funcionário selecionado");
            return;
        }

        try {
            const response = await updateEpiPreferences(selectedEmployee, preferences);
            console.log("Resposta do servidor:", response); // Debug

            // Aceita qualquer resposta de sucesso
            if (response && !response.error) {
                notifySuccess("Preferências atualizadas com sucesso");
                await fetchEpiData();
                setHasChanges(false);
            } else {
                notifyError(response?.message || "Erro ao atualizar preferências");
            }
        } catch (error) {
            console.error("Erro ao atualizar:", error);
            notifyError("Erro ao atualizar preferências");
        }
    };

    if (!selectedEmployee) {
        return null;
    }

    return (
        <Box>
            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Registo de Tamanhos EPI's e Fardamento
                        </Typography>
                        <Grid container spacing={2}>
                            {/* Calçado */}
                            <Grid size={{ xs: 12 }}>
                                <Typography variant="subtitle1" gutterBottom>Calçado</Typography>
                            </Grid>

                            <Grid size={{ xs: 12, md: 3 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Tipo de Calçado Standard</InputLabel>
                                    <Select
                                        label="Tipo de Calçado Standard"
                                        value={preferences.tt_epishoetype}
                                        onChange={(e) => handleInputChange("tt_epishoetype", e.target.value)}
                                    >
                                        {epiData?.epi_shoe_types?.map((type) => (
                                            <MenuItem key={type.pk} value={type.pk}>
                                                {type.value}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    fullWidth
                                    label="Tamanho do Calçado"
                                    value={preferences.shoenumber}
                                    onChange={(e) => handleInputChange("shoenumber", e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    fullWidth
                                    label="Galochas"
                                    value={preferences.galoshes}
                                    onChange={(e) => handleInputChange("galoshes", e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    fullWidth
                                    label="Botas de Soldador"
                                    value={preferences.welderboot}
                                    onChange={(e) => handleInputChange("welderboot", e.target.value)}
                                />
                            </Grid>

                            {/* Fardamento */}
                            <Grid size={{ xs: 12 }}>
                                <Typography variant="subtitle1" gutterBottom>Fardamento</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    fullWidth
                                    label="T-Shirt"
                                    value={preferences.tshirt}
                                    onChange={(e) => handleInputChange("tshirt", e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    fullWidth
                                    label="Sweatshirt"
                                    value={preferences.sweatshirt}
                                    onChange={(e) => handleInputChange("sweatshirt", e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    fullWidth
                                    label="Casaco"
                                    value={preferences.jacket}
                                    onChange={(e) => handleInputChange("jacket", e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    fullWidth
                                    label="Calças"
                                    value={preferences.pants}
                                    onChange={(e) => handleInputChange("pants", e.target.value)}
                                />
                            </Grid>

                            {/* Outros EPIs */}
                            <Grid size={{ xs: 12 }}>
                                <Typography variant="subtitle1" gutterBottom>EPI's</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                                <TextField
                                    fullWidth
                                    label="Avental"
                                    value={preferences.apron}
                                    onChange={(e) => handleInputChange("apron", e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                                <TextField
                                    fullWidth
                                    label="Bata"
                                    value={preferences.gown}
                                    onChange={(e) => handleInputChange("gown", e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                                <TextField
                                    fullWidth
                                    label="Capa Impermeável"
                                    value={preferences.waterproof}
                                    onChange={(e) => handleInputChange("waterproof", e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                                <TextField
                                    fullWidth
                                    label="Colete Refletor"
                                    value={preferences.reflectivevest}
                                    onChange={(e) => handleInputChange("reflectivevest", e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                                <TextField
                                    fullWidth
                                    label="Luvas"
                                    value={preferences.gloves}
                                    onChange={(e) => handleInputChange("gloves", e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                                <TextField
                                    fullWidth
                                    label="Máscara"
                                    value={preferences.mask}
                                    onChange={(e) => handleInputChange("mask", e.target.value)}
                                />
                            </Grid>

                            {/* Observações */}
                            {/* <Grid size={{ xs: 12 }}>
                                <Typography variant="subtitle1" gutterBottom>Informação Adicional</Typography>
                            </Grid> */}
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    label="Observações"
                                    value={preferences.memo}
                                    onChange={(e) => handleInputChange("memo", e.target.value)}
                                />
                            </Grid>

                            {hasChanges && (
                                <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                                    <Button
                                        variant="outlined"
                                        onClick={handleCancel}
                                        sx={{ mt: 2 }}
                                    >
                                        Cancelar Alterações
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={handleSave}
                                        sx={{ mt: 2 }}
                                    >
                                        Guardar Tamanhos
                                    </Button>
                                </Grid>
                            )}
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default PreferencesSection;