// /components/DetailsModal.js
import React from "react";
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
    const handleFieldChange = (field, value) => {
        setEditableDetails(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        onSave(editableDetails);
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
                                                value={
                                                    field.includes("data")
                                                        ? formatDate(editableDetails[field])
                                                        : editableDetails[field] || ""
                                                }
                                                onChange={(e) => isEditMode &&
                                                    EDITABLE_FIELDS.includes(field) &&
                                                    handleFieldChange(field, e.target.value)}
                                                variant="outlined"
                                                fullWidth
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