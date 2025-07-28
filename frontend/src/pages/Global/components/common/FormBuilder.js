// frontend/src/pages/Global/components/common/FormBuilder.js

import React from 'react';
import {
    Grid,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    CircularProgress
} from '@mui/material';
import { validateForm } from '../../utils/helpers';

const FormBuilder = ({
    fields,
    formData,
    onFieldChange,
    onSubmit,
    metaData,
    loading = false,
    submitLabel = 'Adicionar'
}) => {
    const handleSubmit = () => {
        const validation = validateForm(formData, fields);
        if (validation.isValid) {
            onSubmit(formData);
        }
    };

    const isFormValid = () => {
        return validateForm(formData, fields).isValid;
    };

    const renderField = (field) => {
        const value = formData[field.name] || '';

        if (field.type === 'select') {
            const options = field.metaKey ? metaData?.[field.metaKey] || [] : field.options || [];

            return (
                <FormControl fullWidth>
                    <InputLabel>{field.label}</InputLabel>
                    <Select
                        value={value}
                        onChange={(e) => onFieldChange(field.name, e.target.value)}
                        label={field.label}
                        disabled={loading}
                    >
                        {!field.required && (
                            <MenuItem value="">
                                <em>Nenhum</em>
                            </MenuItem>
                        )}
                        {options.map((option) => (
                            <MenuItem key={option.pk} value={option.pk}>
                                {option.value || option.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            );
        }

        return (
            <TextField
                label={field.label}
                type={field.type}
                value={value}
                onChange={(e) => onFieldChange(field.name, e.target.value)}
                fullWidth
                multiline={field.multiline}
                rows={field.rows}
                required={field.required}
                disabled={loading}
                InputLabelProps={
                    field.type === 'datetime-local' ? { shrink: true } : undefined
                }
            />
        );
    };

    return (
        <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="end">
                {fields.map((field) => (
                    <Grid size={{ xs: 12, md: field.size || 3 }} key={field.name}>
                        {renderField(field)}
                    </Grid>
                ))}

                <Grid size={{ xs: 12, md: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={!isFormValid() || loading}
                        fullWidth
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                        sx={{ height: '56px' }}
                    >
                        {loading ? 'A processar...' : submitLabel}
                    </Button>
                </Grid>
            </Grid>
        </Paper>
    );
};

export default FormBuilder;