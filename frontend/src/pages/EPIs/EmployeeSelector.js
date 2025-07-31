import React from 'react';
import {
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Fade
} from '@mui/material';

const EmployeeSelector = ({
    employees = [],
    selectedEmployee,
    onChange,
    isCentered = false
}) => {

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            {!selectedEmployee ? (
                // Select centralizado quando vazio
                <Box sx={{ minHeight: '40vh', display: 'flex', alignItems: 'center' }}>
                    <Fade in timeout={600}>
                        <Box>
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
                                sx={{ mt: 2, opacity: 0.8 }}
                            >
                                Seleccione o funcionário para continuar
                            </Typography>
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
        </Box>
    );
};

export default EmployeeSelector;