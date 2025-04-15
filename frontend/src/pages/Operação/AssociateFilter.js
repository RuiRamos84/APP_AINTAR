import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const AssociateFilter = ({ associates, selectedAssociate, onAssociateChange }) => {
    return (
        <FormControl fullWidth margin="normal">
            <InputLabel id="associate-select-label">
                Filtrar por Associado
            </InputLabel>
            <Select
                labelId="associate-select-label"
                value={selectedAssociate}
                onChange={(e) => onAssociateChange(e.target.value)}
                label="Filtrar por Associado"
            >
                {associates.map((associate) => (
                    <MenuItem key={associate} value={associate}>
                        {associate === "all" ? "Todos" : associate}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

export default AssociateFilter;