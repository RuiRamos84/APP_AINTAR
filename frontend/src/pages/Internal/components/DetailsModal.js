// /components/DetailsModal.js
import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Grid,
    Typography,
    IconButton,
    Box,
    FormControlLabel,
    Switch,
    CircularProgress
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { formatDate } from "../utils/recordsFormatter";
import { notifyError } from "../../../components/common/Toaster/ThemedToaster";

const FIELD_LABELS = {
    "ener_cpe": "CPE de Energia",
    "ener_consumo": "Consumo Anual de Energia",
    "ener_entidade": "Entidade Responsável",
    "ener_potencia": "Potência Contratada",
    "ener_transf": "Contrato Transferido",
    "ener_val": "Valor de Energia",
    "agua_contrato": "Contrato de Água",
    "agua_entidade": "Entidade de Água",
    "agua_observ": "Observações de Água",
    "apa_licenca": "Licença APA",
    "apa_data_ini": "Data de Início",
    "apa_data_fim": "Data de Fim",
    "apa_data_renovacao": "Data de Renovação",
    "coord_m": "Coordenada M",
    "coord_p": "Coordenada P",
    "tt_freguesia": "Freguesia",
    "subsistema": "Subsistema",
    "pop_dimen": "População Dimensionada",
    "pop_servida": "População Servida",
    "memo": "Notas",
    "ativa": "Estado Ativo",
    "tt_niveltratamento": "Nível de Tratamento",
    "tt_linhatratamento": "Linha de Tratamento",
    "capacidade": "Capacidade",
    "agua_tratada": "Água Tratada",
};

const FIELD_GROUPS = {
    "Energia": ["ener_transf", "ener_cpe", "ener_consumo", "ener_entidade", "ener_potencia", "ener_val"],
    "Água": ["agua_contrato", "agua_entidade", "agua_observ"],
    "Licenciamento": ["apa_licenca", "apa_data_ini", "apa_data_fim", "apa_data_renovacao"],
    "Localização": ["coord_m", "coord_p", "tt_freguesia", "subsistema"],
    "População": ["pop_dimen", "pop_servida", "capacidade", "agua_tratada"],
    "Outros": ["ativa", "memo", "tt_niveltratamento", "tt_linhatratamento"],
};

const EDITABLE_FIELDS = [
    "nome",
    "coord_m",
    "coord_p",
    "apa_licenca",
    "apa_data_ini",
    "apa_data_fim",
    "ener_entidade",
    "ener_cpe",
    "ener_potencia",
    "ener_val",
];

const DetailsModal = ({
    open,
    onClose,
    details,
    editableDetails,
    setEditableDetails,
    isEditMode,
    setIsEditMode,
    onSave,
    entityType,
    loading = false
}) => {
    const [errors, setErrors] = useState({});

    console.log("DetailsModal props:", details);

    // Definir tipos de campos
    const FIELD_TYPES = {
        coord_m: 'number',
        coord_p: 'number',
        ener_entidade: 'integer',
        ener_potencia: 'number',
        ener_val: 'integer',
        apa_data_ini: 'date',
        apa_data_fim: 'date'
    };

    const validateField = (field, value) => {
        const type = FIELD_TYPES[field];
        if (!type || !value) return true;

        switch (type) {
            case 'number':
                return !isNaN(parseFloat(value));
            case 'integer':
                return /^\d+$/.test(value);
            case 'date':
                return !isNaN(Date.parse(value));
            default:
                return true;
        }
    };

    const handleFieldChange = (field, value) => {
        setEditableDetails(prev => ({
            ...prev,
            [field]: value
        }));

        // Validar campo
        if (!validateField(field, value) && value !== '') {
            setErrors(prev => ({
                ...prev,
                [field]: `Campo deve ser ${FIELD_TYPES[field] === 'integer' ? 'número inteiro' : 'numérico'}`
            }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleSave = () => {
        // Verificar se há erros
        if (Object.keys(errors).length > 0) {
            notifyError("Corrija os erros antes de guardar");
            return;
        }

        // Preparar dados com tipos correctos
        const preparedData = { ...editableDetails };
        Object.keys(FIELD_TYPES).forEach(field => {
            if (preparedData[field]) {
                const type = FIELD_TYPES[field];
                if (type === 'integer') {
                    preparedData[field] = parseInt(preparedData[field]);
                } else if (type === 'number') {
                    preparedData[field] = parseFloat(preparedData[field]);
                }
            }
        });

        onSave(preparedData);
    };

    const handleCancel = () => {
        setEditableDetails(details);
        setIsEditMode(false);
    };

    if (!details && !loading) {
        return null;
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                Detalhes da {entityType === 1 ? "ETAR" : "EE"} {details?.nome ? `- ${details.nome}` : ""}
                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    Object.entries(FIELD_GROUPS).map(([groupName, fields]) => (
                        <Box key={groupName} mb={3}>
                            <Typography variant="h6" gutterBottom>
                                {groupName}
                            </Typography>
                            <Grid container spacing={2}>
                                {fields.map(field => (
                                    <Grid key={field} item xs={12} sm={6} md={4}>
                                        {["ativa", "ener_transf"].includes(field) ? (
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={!!editableDetails[field]}
                                                        onChange={(e) => isEditMode &&
                                                            EDITABLE_FIELDS.includes(field) &&
                                                            handleFieldChange(field, e.target.checked ? 1 : 0)}
                                                        color="primary"
                                                        disabled={!isEditMode || !EDITABLE_FIELDS.includes(field)}
                                                    />
                                                }
                                                label={FIELD_LABELS[field] || field.replace(/_/g, " ")}
                                            />
                                        ) : (
                                                <TextField
                                                    label={FIELD_LABELS[field] || field.replace(/_/g, " ")}
                                                    value={editableDetails[field] || ""}
                                                    onChange={(e) => isEditMode &&
                                                        EDITABLE_FIELDS.includes(field) &&
                                                        handleFieldChange(field, e.target.value)}
                                                    variant="outlined"
                                                    fullWidth
                                                    error={!!errors[field]}
                                                    helperText={errors[field]}
                                                    InputProps={{
                                                        readOnly: !isEditMode || !EDITABLE_FIELDS.includes(field),
                                                    }}
                                                    sx={{
                                                        backgroundColor: isEditMode && EDITABLE_FIELDS.includes(field)
                                                            ? "#e8f5e9"
                                                            : "transparent",
                                                    }}
                                                />
                                        )}
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    ))
                )}
            </DialogContent>

            <DialogActions>
                {!isEditMode ? (
                    <Button onClick={() => setIsEditMode(true)} variant="contained" color="primary">
                        Editar
                    </Button>
                ) : (
                    <>
                        <Button onClick={handleCancel} color="secondary" variant="outlined">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            color="primary"
                            variant="contained"
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} /> : null}
                        >
                            {loading ? "A Guardar..." : "Guardar"}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default DetailsModal;