import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { createEpi } from '../../services/episervice';
import { notifySuccess, notifyError } from "../../components/common/Toaster/ThemedToaster";

const CreateEmployeeForm = ({ open, onClose, afterSuccess }) => {
    const [employee, setEmployee] = useState({
        pk: '',
        name: '',
        shoe: '',
        boot: '',
        tshirt: '',
        sweatshirt: '',
        reflectivejacket: '',
        polarjacket: '',
        monkeysuit: '',
        pants: '',
        apron: '',
        gown: '',
        welderboot: '',
        waterproof: '',
        reflectivevest: '',
        galoshes: '',
        gloves: '',
        mask: '',
        memo: ''
    });
    const [loading, setLoading] = useState(false);

    const handleInputChange = (field, value) => {
        const upperCaseFields = [
            'tshirt', 'sweatshirt', 'reflectivejacket', 'polarjacket',
            'monkeysuit', 'pants', 'apron', 'gown', 'welderboot',
            'waterproof', 'reflectivevest', 'galoshes', 'gloves', 'mask'
        ];

        let processedValue = value;

        // Maiúsculas para campos de tamanho
        if (upperCaseFields.includes(field)) {
            processedValue = value.toUpperCase();
        }

        // Apenas números para PK e shoenumber
        if (['pk', 'shoe', 'boot'].includes(field) && value && !/^\d+$/.test(value)) {
            return; // Bloquear input inválido
        }

        setEmployee(prev => ({ ...prev, [field]: processedValue }));
    };

    const handleSubmit = async () => {
        if (!employee.name.trim() || !employee.pk) {
            notifyError("Nome e número são obrigatórios");
            return;
        }

        setLoading(true);
        try {
            await createEpi(employee);
            notifySuccess("Colaborador criado com sucesso");
            if (afterSuccess) afterSuccess();
            onClose();
        } catch (error) {
            notifyError("Erro ao criar colaborador");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setEmployee({
            pk: '',
            name: '',
            shoe: '',
            boot: '',
            tshirt: '',
            sweatshirt: '',
            reflectivejacket: '',
            polarjacket: '',
            monkeysuit: '',
            pants: '',
            apron: '',
            gown: '',
            welderboot: '',
            waterproof: '',
            reflectivevest: '',
            galoshes: '',
            gloves: '',
            mask: '',
            memo: ''
        });
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Criar Novo Colaborador</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    {/* ID e Nome */}
                    <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Número"
                            value={employee.pk}
                            onChange={(e) => handleInputChange("pk", e.target.value)}
                            required
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 8, md: 10 }}>
                        <TextField
                            fullWidth
                            label="Nome"
                            value={employee.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            required
                        />
                    </Grid>

                    {/* Calçado */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            fullWidth
                            label="Nº Sapato"
                            value={employee.shoe}
                            onChange={(e) => handleInputChange("shoe", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            fullWidth
                            label="Nº Bota"
                            value={employee.boot}
                            onChange={(e) => handleInputChange("boot", e.target.value)}
                        />
                    </Grid>

                    {/* Calçado Especial */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            fullWidth
                            label="Galochas"
                            value={employee.galoshes}
                            onChange={(e) => handleInputChange("galoshes", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            fullWidth
                            label="Botas Soldador"
                            value={employee.welderboot}
                            onChange={(e) => handleInputChange("welderboot", e.target.value)}
                        />
                    </Grid>

                    {/* Fardamento */}
                    <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                        <TextField
                            fullWidth
                            label="T-Shirt"
                            value={employee.tshirt}
                            onChange={(e) => handleInputChange("tshirt", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Sweatshirt"
                            value={employee.sweatshirt}
                            onChange={(e) => handleInputChange("sweatshirt", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Casaco Refletor"
                            value={employee.reflectivejacket}
                            onChange={(e) => handleInputChange("reflectivejacket", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Casaco Polar"
                            value={employee.polarjacket}
                            onChange={(e) => handleInputChange("polarjacket", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Fato Macaco"
                            value={employee.monkeysuit}
                            onChange={(e) => handleInputChange("monkeysuit", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Calças"
                            value={employee.pants}
                            onChange={(e) => handleInputChange("pants", e.target.value)}
                        />
                    </Grid>

                    {/* EPIs */}
                    <Grid size={{ xs: 12, sm: 4, md: 2.4 }}>
                        <TextField
                            fullWidth
                            label="Avental"
                            value={employee.apron}
                            onChange={(e) => handleInputChange("apron", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 2.4 }}>
                        <TextField
                            fullWidth
                            label="Bata"
                            value={employee.gown}
                            onChange={(e) => handleInputChange("gown", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 2.4 }}>
                        <TextField
                            fullWidth
                            label="Impermeável"
                            value={employee.waterproof}
                            onChange={(e) => handleInputChange("waterproof", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 2.4 }}>
                        <TextField
                            fullWidth
                            label="Colete Refletor"
                            value={employee.reflectivevest}
                            onChange={(e) => handleInputChange("reflectivevest", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4, md: 2.4 }}>
                        <TextField
                            fullWidth
                            label="Luvas"
                            value={employee.gloves}
                            onChange={(e) => handleInputChange("gloves", e.target.value)}
                        />
                    </Grid>

                    {/* Observações */}
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Observações"
                            value={employee.memo}
                            onChange={(e) => handleInputChange("memo", e.target.value)}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancelar</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || !employee.name.trim() || !employee.pk}
                >
                    {loading ? 'A criar...' : 'Criar Colaborador'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateEmployeeForm;