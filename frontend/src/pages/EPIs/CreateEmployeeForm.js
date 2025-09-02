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

const CreateEmployeeForm = ({ open, onClose, shoeTypes, afterSuccess }) => {
    const [employee, setEmployee] = useState({
        pk: '',
        name: '',
        tt_epishoetype: '',
        shoenumber: '',
        tshirt: '',
        sweatshirt: '',
        jacket: '',
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
            'tshirt', 'sweatshirt', 'jacket', 'pants',
            'apron', 'gown', 'welderboot', 'waterproof',
            'reflectivevest', 'galoshes', 'gloves', 'mask'
        ];

        let processedValue = value;

        // Maiúsculas para campos de tamanho
        if (upperCaseFields.includes(field)) {
            processedValue = value.toUpperCase();
        }

        // Apenas números para PK e shoenumber
        if (['pk', 'shoenumber'].includes(field) && value && !/^\d+$/.test(value)) {
            return; // Bloquear input inválido
        }

        setEmployee(prev => ({ ...prev, [field]: processedValue }));
    };

    const handleSubmit = async () => {
        if (!employee.name.trim() || !employee.pk || !employee.tt_epishoetype || !employee.shoenumber) {
            notifyError("Nome, número, tipo de calçado e tamanho são obrigatórios");
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
            tt_epishoetype: '',
            shoenumber: '',
            tshirt: '',
            sweatshirt: '',
            jacket: '',
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
                    {/* ID */}
                    <Grid size={{ xs: 12, md: 1.5 }}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Número"
                            value={employee.pk}
                            onChange={(e) => handleInputChange("pk", e.target.value)}
                            required
                        />
                    </Grid>
                    {/* Nome */}
                    <Grid size={{ xs: 12, md: 5.5 }}>
                        <TextField
                            fullWidth
                            label="Nome"
                            value={employee.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            required
                        />
                    </Grid>

                    {/* Tipo de Calçado */}
                    <Grid size={{ xs: 12, md: 2.5 }}>
                        <FormControl fullWidth>
                            <InputLabel>Tipo de Calçado *</InputLabel>
                            <Select
                                value={employee.tt_epishoetype}
                                onChange={(e) => handleInputChange("tt_epishoetype", e.target.value)}
                                label="Tipo de Calçado"
                                required
                            >
                                {shoeTypes?.map((type) => (
                                    <MenuItem key={type.pk} value={type.pk}>
                                        {type.value}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Calçado */}
                    <Grid size={{ xs: 12, md: 2.5 }}>
                        <TextField
                            fullWidth
                            label="Tamanho Calçado"
                            value={employee.shoenumber}
                            onChange={(e) => handleInputChange("shoenumber", e.target.value)}
                            required
                        />
                    </Grid>
                    {/* Calçado Especial */}
                    <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Galochas"
                            value={employee.galoshes}
                            onChange={(e) => handleInputChange("galoshes", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Botas Soldador"
                            value={employee.welderboot}
                            onChange={(e) => handleInputChange("welderboot", e.target.value)}
                        />
                    </Grid>

                    {/* Fardamento */}
                    <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                            fullWidth
                            label="T-Shirt"
                            value={employee.tshirt}
                            onChange={(e) => handleInputChange("tshirt", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Sweatshirt"
                            value={employee.sweatshirt}
                            onChange={(e) => handleInputChange("sweatshirt", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Casaco"
                            value={employee.jacket}
                            onChange={(e) => handleInputChange("jacket", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Calças"
                            value={employee.pants}
                            onChange={(e) => handleInputChange("pants", e.target.value)}
                        />
                    </Grid>

                    {/* EPIs */}
                    <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Avental"
                            value={employee.apron}
                            onChange={(e) => handleInputChange("apron", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Bata"
                            value={employee.gown}
                            onChange={(e) => handleInputChange("gown", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Impermeável"
                            value={employee.waterproof}
                            onChange={(e) => handleInputChange("waterproof", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Colete Refletor"
                            value={employee.reflectivevest}
                            onChange={(e) => handleInputChange("reflectivevest", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Luvas"
                            value={employee.gloves}
                            onChange={(e) => handleInputChange("gloves", e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                        <TextField
                            fullWidth
                            label="Máscara"
                            value={employee.mask}
                            onChange={(e) => handleInputChange("mask", e.target.value)}
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
                    disabled={loading || !employee.name.trim() || !employee.pk || !employee.tt_epishoetype || !employee.shoenumber}
                >
                    {loading ? 'A criar...' : 'Criar Colaborador'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateEmployeeForm;