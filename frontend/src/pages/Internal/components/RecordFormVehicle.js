import React, { useRef } from "react";
import {
    Grid,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    CircularProgress,
    Tooltip
} from "@mui/material";

// Máscara da matrícula: posições 2 e 5 são traços fixos, restantes são editáveis
const LICENCE_MASK = "  -  -  ";
const LICENCE_EDITABLE = [0, 1, 3, 4, 6, 7];

const RecordFormVehicle = ({
    formData,
    setFormData,
    onSubmit,
    fieldsConfig,
    loading = false,
    editMode = false,
    onCancel
}) => {
    const licenceInputRef = useRef(null);

    const setCursor = (pos) => {
        requestAnimationFrame(() => {
            if (licenceInputRef.current) {
                licenceInputRef.current.setSelectionRange(pos, pos);
            }
        });
    };

    const handleLicenceKeyDown = (e) => {
        const input = e.target;
        const value = formData.licence || LICENCE_MASK;
        const cursorPos = input.selectionStart;

        if (e.key === "Backspace") {
            e.preventDefault();
            // Apaga o último carácter preenchido antes do cursor
            const prevFilled = [...LICENCE_EDITABLE].reverse().find(p => p < cursorPos && value[p] !== " ");
            if (prevFilled !== undefined) {
                const newValue = value.substring(0, prevFilled) + " " + value.substring(prevFilled + 1);
                setFormData(prev => ({ ...prev, licence: newValue }));
                setCursor(prevFilled);
            }
            return;
        }

        if (/^[A-Za-z0-9]$/.test(e.key)) {
            e.preventDefault();
            // Escreve na próxima posição editável a partir do cursor
            const targetPos = LICENCE_EDITABLE.find(p => p >= cursorPos);
            if (targetPos !== undefined) {
                const newValue = value.substring(0, targetPos) + e.key.toUpperCase() + value.substring(targetPos + 1);
                setFormData(prev => ({ ...prev, licence: newValue }));
                const nextPos = LICENCE_EDITABLE.find(p => p > targetPos) ?? targetPos + 1;
                setCursor(nextPos);
            }
            return;
        }

        // Bloqueia qualquer outro carácter imprimível
        if (e.key.length === 1) {
            e.preventDefault();
        }
    };

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
                {fieldsConfig.map((field) => {
                    const isDisabled = field.disabled || loading;

                    const fieldElement =
                        field.name === "licence" ? (
                            <TextField
                                type="text"
                                label={field.label}
                                value={formData[field.name] || ""}
                                onChange={() => {}}
                                onKeyDown={handleLicenceKeyDown}
                                onFocus={() => {
                                    if (!formData.licence) {
                                        setFormData(prev => ({ ...prev, licence: LICENCE_MASK }));
                                    }
                                    // Posiciona o cursor no primeiro slot vazio
                                    requestAnimationFrame(() => {
                                        if (licenceInputRef.current) {
                                            const val = formData.licence || LICENCE_MASK;
                                            const firstEmpty = LICENCE_EDITABLE.find(p => val[p] === " ") ?? 8;
                                            licenceInputRef.current.setSelectionRange(firstEmpty, firstEmpty);
                                        }
                                    });
                                }}
                                onBlur={() => {
                                    const raw = (formData.licence || "").replace(/[^A-Za-z0-9]/g, "");
                                    if (raw.length === 0) {
                                        setFormData(prev => ({ ...prev, licence: "" }));
                                    }
                                }}
                                inputRef={licenceInputRef}
                                inputProps={{ maxLength: 8 }}
                                fullWidth
                                required={field.required}
                                disabled={isDisabled}
                            />
                        ) : field.type === "select" ? (
                            <FormControl fullWidth disabled={isDisabled}>
                                <InputLabel>{field.label}</InputLabel>
                                <Select
                                    value={formData[field.name] || ""}
                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                    label={field.label}
                                    required={field.required}
                                >
                                    {field.emptyOption && (
                                        <MenuItem value="">
                                            <em>{field.emptyOption}</em>
                                        </MenuItem>
                                    )}
                                    {field.options && field.options.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
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

export default RecordFormVehicle;