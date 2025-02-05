import React, { useState, useEffect  } from "react";
import {
    Box, FormControl, InputLabel, Select, MenuItem, Typography,
    Grid, Paper, TextField, Button, useTheme
} from "@mui/material";
import { updateEpiPreferences } from "../../services/episervice";
import { notifySuccess, notifyError } from "../../components/common/Toaster/ThemedToaster";
import { useEpi } from "../../contexts/EpiContext";

const PreferencesSection = () => {  // Remova o { metaData } dos props
    const theme = useTheme();
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const { epiData, loading, error, fetchEpiData, updateEpiList } = useEpi();
    
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

                setPreferences({
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
                });
            }
        }
    }, [selectedEmployee, epiData]);

    // Atualiza os dados de EPIs quando o funcionário selecionado muda
    const handleEmployeeChange = (employeeId) => {
        setSelectedEmployee(employeeId);
        if (!employeeId) {
            handleReset();
        }
    };

    const handleReset = () => {
        setSelectedEmployee("");
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
        setPreferences(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        try {
            const response = await updateEpiPreferences(selectedEmployee, preferences);

            if (response?.message === 'Preferências atualizadas com sucesso') {
                notifySuccess(response.message);
                await fetchEpiData(); // Aguarda a atualização dos dados

                const updatedEmployee = epiData?.epi_list?.find(emp => emp.pk === selectedEmployee);
                if (updatedEmployee) {
                    const shoeType = epiData?.epi_shoe_types?.find(
                        type => type.value.toLowerCase() === updatedEmployee.tt_epishoetype?.toLowerCase()
                    );

                    setPreferences({
                        tt_epishoetype: shoeType?.pk || "",
                        shoenumber: updatedEmployee.shoenumber || "",
                        tshirt: updatedEmployee.tshirt || "",
                        sweatshirt: updatedEmployee.sweatshirt || "",
                        jacket: updatedEmployee.jacket || "",
                        pants: updatedEmployee.pants || "",
                        apron: updatedEmployee.apron || "",
                        gown: updatedEmployee.gown || "",
                        welderboot: updatedEmployee.welderboot || "",
                        waterproof: updatedEmployee.waterproof || "",
                        reflectivevest: updatedEmployee.reflectivevest || "",
                        galoshes: updatedEmployee.galoshes || "",
                        gloves: updatedEmployee.gloves || "",
                        mask: updatedEmployee.mask || "",
                        memo: updatedEmployee.memo || ""
                    });
                }
            }
        } catch (error) {
            notifyError("Erro ao atualizar preferências");
            console.error(error);
        }
    };

    return (
        <Box>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                        <InputLabel id="employee-select-label">Funcionário</InputLabel>
                        <Select
                            labelId="employee-select-label"
                            value={selectedEmployee}
                            onChange={(e) => handleEmployeeChange(e.target.value)}
                            label="Funcionário"
                        >
                            <MenuItem value="">
                                <em>Selecione um funcionário</em>
                            </MenuItem>
                            {epiData?.epi_list?.map((emp) => (
                                <MenuItem key={emp.pk} value={emp.pk}>
                                    {emp.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {selectedEmployee && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Registo de Tamanhos EPI's e Fardamento
                            </Typography>
                            <Grid container spacing={2}>
                                {/* Calçado */}
                                <Grid item xs={12}>
                                    <Typography variant="subtitle1" gutterBottom>Calçado</Typography>
                                </Grid>
                                
                                <Grid item xs={12} md={3}>
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
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        label="Tamanho do Calçado"
                                        value={preferences.shoenumber}
                                        onChange={(e) => handleInputChange("shoenumber", e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        label="Galochas"
                                        value={preferences.galoshes}
                                        onChange={(e) => handleInputChange("galoshes", e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        label="Botas de Soldador"
                                        value={preferences.welderboot}
                                        onChange={(e) => handleInputChange("welderboot", e.target.value)}
                                    />
                                </Grid>

                                {/* Fardamento */}
                                <Grid item xs={12}>
                                    <Typography variant="subtitle1" gutterBottom>Fardamento</Typography>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        label="T-Shirt"
                                        value={preferences.tshirt}
                                        onChange={(e) => handleInputChange("tshirt", e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        label="Sweatshirt"
                                        value={preferences.sweatshirt}
                                        onChange={(e) => handleInputChange("sweatshirt", e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        label="Casaco"
                                        value={preferences.jacket}
                                        onChange={(e) => handleInputChange("jacket", e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        label="Calças"
                                        value={preferences.pants}
                                        onChange={(e) => handleInputChange("pants", e.target.value)}
                                    />
                                </Grid>

                                {/* Outros EPIs */}
                                <Grid item xs={12}>
                                    <Typography variant="subtitle1" gutterBottom>EPI's</Typography>
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <TextField
                                        fullWidth
                                        label="Avental"
                                        value={preferences.apron}
                                        onChange={(e) => handleInputChange("apron", e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <TextField
                                        fullWidth
                                        label="Bata"
                                        value={preferences.gown}
                                        onChange={(e) => handleInputChange("gown", e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <TextField
                                        fullWidth
                                        label="Capa Impermeável"
                                        value={preferences.waterproof}
                                        onChange={(e) => handleInputChange("waterproof", e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <TextField
                                        fullWidth
                                        label="Colete Refletor"
                                        value={preferences.reflectivevest}
                                        onChange={(e) => handleInputChange("reflectivevest", e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <TextField
                                        fullWidth
                                        label="Luvas"
                                        value={preferences.gloves}
                                        onChange={(e) => handleInputChange("gloves", e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <TextField
                                        fullWidth
                                        label="Máscara"
                                        value={preferences.mask}
                                        onChange={(e) => handleInputChange("mask", e.target.value)}
                                    />
                                </Grid>

                                {/* Observações */}
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={3}
                                        label="Observações"
                                        value={preferences.memo}
                                        onChange={(e) => handleInputChange("memo", e.target.value)}
                                    />
                                </Grid>

                                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <Button
                                        variant="contained"
                                        onClick={handleSave}
                                        sx={{ mt: 2 }}
                                    >
                                        Guardar Tamanhos
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default PreferencesSection;