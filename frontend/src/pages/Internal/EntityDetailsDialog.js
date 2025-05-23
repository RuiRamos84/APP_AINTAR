// Componente extraído: EntityDetailsDialog.js
import React from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, IconButton, Button, Grid, TextField, Switch, FormControlLabel, Box
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { format } from "date-fns";

const EntityDetailsDialog = ({
    open, onClose, data, editMode, editableValues,
    onFieldChange, onSave, onEdit, onCancel, fieldGroups, fieldLabels, editableFields
}) => {
    const formatDate = (dateString) => {
        if (!dateString) return "";
        try {
            return format(new Date(dateString), "dd/MM/yyyy");
        } catch {
            return dateString;
        }
    };

    const calculateGridSize = (totalFields) => {
        const size = 12 / totalFields;
        return size > 2 ? Math.floor(size) : 2;
    };

    const gridSize = calculateGridSize(6);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="ml">
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                Detalhes da Entidade
                <IconButton onClick={onClose}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent>
                {Object.entries(fieldGroups).map(([groupName, fields]) => (
                    <Box key={groupName} mb={3}>
                        <Typography variant="h6" gutterBottom>{groupName}</Typography>
                        <Grid container spacing={2}>
                            {fields.map((field) => (
                                <Grid key={field} item xs={12} sm={gridSize}>
                                    {["ativa", "ener_transf"].includes(field) ? (
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={!!editableValues[field]}
                                                    onChange={(e) => editMode && onFieldChange(field, e.target.checked ? 1 : 0)}
                                                    color="primary"
                                                />
                                            }
                                            label={fieldLabels[field] || field}
                                            labelPlacement="start"
                                        />
                                    ) : (
                                        <TextField
                                            label={fieldLabels[field] || field}
                                            value={
                                                field.includes("data")
                                                    ? formatDate(data[field])
                                                    : data[field] || ""
                                            }
                                            onChange={(e) => editMode && editableFields.includes(field) && onFieldChange(field, e.target.value)}
                                            variant="outlined"
                                            fullWidth
                                            InputProps={{ readOnly: !editMode || !editableFields.includes(field) }}
                                            sx={{ backgroundColor: editMode && editableFields.includes(field) ? "#e8f5e9" : "transparent" }}
                                        />
                                    )}
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                ))}
            </DialogContent>
            <DialogActions>
                {!editMode ? (
                    <Button onClick={onEdit} variant="contained">Editar</Button>
                ) : (
                    <>
                        <Button onClick={onCancel} color="secondary" variant="outlined">Cancelar</Button>
                        <Button onClick={onSave} color="primary" variant="contained">Guardar</Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default EntityDetailsDialog;
