// /components/RecordForm.js
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
    Box,
    CircularProgress,
    Tooltip
} from "@mui/material";
import { getCurrentDate } from "../../../utils/dataUtils";

const RecordForm = ({
    formData,
    setFormData,
    onSubmit,
   
    fieldsConfig,
    loading = false,
    editMode = false,
    onCancel
}) => {
    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
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
                {fieldsConfig.map((field) => {
                    const isDisabled = field.disabled || loading;
                    const fieldElement = field.type === "select" ? (
                        <FormControl fullWidth>
                            <InputLabel>{field.label}</InputLabel>
                            <Select
                                value={formData[field.name] || ""}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                label={field.label}
                                required={field.required}
                                disabled={isDisabled}
                            >
                                {field.emptyOption && (
                                    <MenuItem value="">
                                        <em>{field.emptyOption}</em>
                                    </MenuItem>
                                )}
                                {field.options && field.options.map((option) => (
                                    <MenuItem key={option.pk} value={option.pk}>
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
                            InputLabelProps={(field.type === "date" || field.type === "datetime-local") ? { shrink: true } : undefined}
                            fullWidth
                            multiline={field.multiline}
                            rows={field.rows}
                            required={field.required}
                            disabled={isDisabled}
                        />
                    );

                    return (
                        <Grid size={{ xs: 12, sm: 6, md: field.size || 3 }} key={field.name}>
                            {field.disabled ? (
                                <Tooltip title="Este campo não pode ser alterado em modo de edição" arrow>
                                    <span>{fieldElement}</span>
                                </Tooltip>
                            ) : (
                                fieldElement
                            )}
                        </Grid>
                    );
                })}
                <Grid size={{ xs: 12, md: onCancel ? 2 : 1.5 }} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={!isFormValid() || loading}
                        fullWidth
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                        {loading ? "A Processar..." : editMode ? "Atualizar" : "Adicionar"}
                    </Button>
                    {onCancel && (
                        <Button
                            variant="outlined"
                            color="inherit"
                            onClick={onCancel}
                            disabled={loading}
                            fullWidth
                        >
                            Cancelar
                        </Button>
                    )}
                </Grid>
            </Grid>
        </Paper>
    );
};

export default RecordForm;