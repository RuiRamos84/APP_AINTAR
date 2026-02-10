import React from "react";
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
} from "@mui/material";

const RecordForm = ({
    formData,
    setFormData,
    onSubmit,
    fieldsConfig,
    loading = false,
    editingId = null // Para mudar o texto do botão
}) => {

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        onSubmit(formData);
    };

    const isFormValid = () => {
        return fieldsConfig.every(field =>
            !field.required || (formData[field.name] !== undefined && formData[field.name] !== "")
        );
    };

    return (
        <Paper sx={{ p: 2 }}>
            <Grid container spacing={2}>
                {fieldsConfig.map(field => (
                    <Grid key={field.name} size={{ xs: 12, sm: 6, md: field.size || 3 }}>
                        {field.type === "select" ? (
                            <FormControl fullWidth>
                                <InputLabel>{field.label}</InputLabel>
                                <Select
                                    value={formData[field.name] || ""}
                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                    label={field.label}
                                    required={field.required}
                                    disabled={field.disabled || loading} // <-- Aqui respeita disabled
                                >
                                    {field.emptyOption && (
                                        <MenuItem value="">
                                            <em>{field.emptyOption}</em>
                                        </MenuItem>
                                    )}
                                    {field.options && field.options.map(option => (
                                        <MenuItem key={option.pk || option.value} value={option.pk || option.value}>
                                            {option.value || option.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        ) : (
                            <TextField
                                type={field.type}
                                label={field.label}
                                value={formData[field.name] || ""}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                InputLabelProps={
                                    field.type === "date" || field.type === "datetime-local"
                                        ? { shrink: true }
                                        : undefined
                                }
                                fullWidth
                                multiline={field.multiline}
                                rows={field.rows}
                                required={field.required}
                                disabled={field.disabled || loading} // <-- Aqui também
                            />
                        )}
                    </Grid>
                ))}

                <Grid size={{ xs: 12, md: 1.5 }} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={!isFormValid() || loading}
                        fullWidth
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                        {loading ? "A Processar..." : editingId ? "Atualizar" : "Adicionar"}
                    </Button>
                </Grid>
            </Grid>
        </Paper>
    );
};

export default RecordForm;