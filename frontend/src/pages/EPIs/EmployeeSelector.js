import React, { useState } from 'react';
import {
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Fade,
    Button
} from '@mui/material';
import { Add } from '@mui/icons-material';
import CreateEmployeeForm from './CreateEmployeeForm';

const EmployeeSelector = ({
    employees = [],
    selectedEmployee,
    onChange,
    isCentered = false,
    shoeTypes = []
}) => {
    const [createEmployeeOpen, setCreateEmployeeOpen] = useState(false);

    const handleAfterSuccess = () => {
        // Recarregar a página para actualizar a lista de funcionários
        window.location.reload();
    };

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            {!selectedEmployee ? (
                // Select centralizado quando vazio
                <Box sx={{ minHeight: '40vh', display: 'flex', alignItems: 'center' }}>
                    <Fade in timeout={600}>
                        <Box sx={{ textAlign: 'center' }}>
                            <FormControl sx={{ width: '450px' }}>
                                <InputLabel>Funcionário</InputLabel>
                                <Select
                                    value={selectedEmployee}
                                    onChange={(e) => onChange(e.target.value)}
                                    label="Funcionário"
                                >
                                    <MenuItem value="">
                                        <em>Seleccione um funcionário</em>
                                    </MenuItem>
                                    {employees.map((emp) => (
                                        <MenuItem key={emp.pk} value={emp.pk}>
                                            {emp.pk} - {emp.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Typography
                                variant="body2"
                                color="text.secondary"
                                align="center"
                                sx={{ mt: 2, mb: 3, opacity: 0.8 }}
                            >
                                Seleccione o funcionário para continuar
                            </Typography>

                            <Button
                                variant="outlined"
                                startIcon={<Add />}
                                onClick={() => setCreateEmployeeOpen(true)}
                                sx={{ mt: 1 }}
                            >
                                Criar Novo Funcionário
                            </Button>
                        </Box>
                    </Fade>
                </Box>
            ) : (
                // Select compacto após selecção
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 3 }}>
                    <FormControl sx={{ width: '350px' }}>
                        <InputLabel>Funcionário</InputLabel>
                        <Select
                            value={selectedEmployee}
                            onChange={(e) => onChange(e.target.value)}
                            label="Funcionário"
                        >
                            {employees.map((emp) => (
                                <MenuItem key={emp.pk} value={emp.pk}>
                                    {emp.pk} - {emp.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            )}

            <CreateEmployeeForm
                open={createEmployeeOpen}
                onClose={() => setCreateEmployeeOpen(false)}
                shoeTypes={shoeTypes}
                afterSuccess={handleAfterSuccess}
            />
        </Box>
    );
};

export default EmployeeSelector;