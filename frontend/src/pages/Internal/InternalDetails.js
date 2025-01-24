import React, { useState, useEffect } from "react";
import {
    Box,
    Grid,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    DialogActions, FormControlLabel, Switch
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import InternalTabs from "./InternalTabs";
import VolumeRecordsTable from "./VolumeRecordsTable";
import EnergyRecordsTable from "./EnergyRecordsTable";
import ExpenseRecordsTable from "./ExpenseRecordsTable";
import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { format } from "date-fns";
import { getEnergyRecords, getExpenseRecords, getEntityDetails } from "../../services/InternalService";
import { notifySuccess, notifyError, notifyWarning, notifyInfo, notifyCustom } from "../../components/common/Toaster/ThemedToaster";

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
    "Licenciamento": ["apa_licenca", "apa_data_ini", "apa_data_fim", "apa_data_renovacao" ],
    "Localização": ["coord_m", "coord_p", "tt_freguesia", "subsistema"],
    "População": ["pop_dimen", "pop_servida", "capacidade", "agua_tratada"],
    "Outros": ["ativa", "memo", "tt_niveltratamento", "tt_linhatratamento", ],
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


const InternalDetails = ({
    metaData,
    selectedArea,
    selectedLocation,
    setSelectedLocation,
    filteredEntities,
    setFilteredEntities,
    selectedEntity,
    setSelectedEntity,
    isEditMode,
    setIsEditMode,
    entityBackup,
    setEntityBackup,
    handleTabChange,
    setVolumeData,
}) => {
    const [entityDetails, setEntityDetails] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false); 
    const [selectedTab, setSelectedTab] = useState(0);
    const [editableValues, setEditableValues] = useState({});
    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    const handleOpenEdit = () => {
        setEditableValues(entityDetails); // Inicializa valores para edição
        setEditMode(true);
    };

    const handleCancelEdit = () => {
        setEditMode(false);
        setEditableValues({}); // Reseta valores temporários
    }

    const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
        return format(new Date(dateString), "dd/MM/yyyy");
    } catch (error) {
        console.error("Erro ao formatar a data:", error);
        return dateString;
    }
    };
    

    useEffect(() => {
        if (selectedEntity) {
            const fetchDetails = async () => {
                try {
                    const details = await getEntityDetails(selectedArea, selectedEntity.pk);
                    setEntityDetails(details.details || {});
                    // console.log(metaData)
                } catch (error) {
                    console.error("Erro ao carregar os detalhes da entidade:", error);
                    notifyError("Erro ao carregar os detalhes da entidade");
                }
            };
            fetchDetails();
        }
    }, [selectedEntity, selectedArea]);


    const handleLocationChange = (event) => {
        const location = event.target.value;
        setSelectedLocation(location);
        if (selectedArea === 1 && metaData?.etar) {
            setFilteredEntities(metaData.etar.filter((entity) => entity.ts_entity === location));
        } else if (selectedArea === 2 && metaData?.ee) {
            setFilteredEntities(metaData.ee.filter((entity) => entity.ts_entity === location));
        } else {
            setFilteredEntities([]);
        }
        setSelectedEntity(null);
    };

    const handleEntityChange = (event) => {
        const entityId = event.target.value;
        setSelectedEntity(filteredEntities.find((entity) => entity.pk === parseInt(entityId)));
    };

    const handleSaveEdit = async () => {
        if (!selectedEntity) {
                    notifyWarning("Por favor, selecione uma ETAR/EE.");
                    return;
                }
        try {
            // Implementar chamada ao backend para salvar alterações
            console.log("Salvar alterações:", editableValues);
            setEntityDetails(editableValues); // Atualiza os detalhes após salvar
            setEditMode(false);
        } catch (error) {
            console.error("Erro ao salvar alterações:", error);
        }
    };

    const handleFieldChange = (field, value) => {
        setEditableValues((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const calculateGridSize = (totalFields) => {
        const size = 12 / totalFields; // Divide a largura total de 12 igualmente
        return size > 2 ? Math.floor(size) : 2; // Garante que não fique menor que 2
    };

    const totalFields = 6; // Número total de campos a exibir
    const gridSize = calculateGridSize(totalFields);

    return (
        <Box>
            {/* Linha 1: Localização, ETAR/EE e Mostrar Detalhes */}
            <Grid container spacing={2} alignItems="center">
                {/* Localização */}
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel>Localização</InputLabel>
                        <Select
                            value={selectedLocation}
                            onChange={handleLocationChange}
                            label="Localização"
                        >
                            {[...new Set((selectedArea === 1 ? metaData?.etar : metaData?.ee)?.map((entity) => entity.ts_entity))].map((location) => (
                                <MenuItem key={location} value={location}>
                                    {location}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* ETAR/EE */}
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel>{selectedArea === 1 ? "ETAR" : "Estação Elevatória"}</InputLabel>
                        <Select
                            value={selectedEntity?.pk || ""}
                            onChange={handleEntityChange}
                            label={selectedArea === 1 ? "ETAR" : "Estação Elevatória"}
                        >
                            {filteredEntities?.map((entity) => (
                                <MenuItem key={entity.pk} value={entity.pk}>
                                    {entity.nome}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Botão para abrir Modal */}
                <Grid item xs={12} sm={4} display="flex" justifyContent="center" alignItems="center">
                    {selectedEntity && (
                        <Button variant="contained" color="primary" onClick={handleOpenModal}>
                            Abrir Detalhes
                        </Button>
                    )}
                </Grid>
            </Grid>

            {/* Modal para Detalhes */}
            <Dialog open={isModalOpen} onClose={handleCloseModal} fullWidth maxWidth="ml">
                <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    Detalhes da {selectedArea === 1 ? "ETAR" : "EE"}
                    <IconButton onClick={handleCloseModal}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {Object.entries(FIELD_GROUPS).map(([groupName, fields]) => (
                        <Box key={groupName} mb={3}>
                            <Typography variant="h6" gutterBottom>
                                {groupName}
                            </Typography>
                            <Grid container spacing={2}>
                                {fields.map((field) => (
                                    <Grid key={field} item xs={12} sm={gridSize}>
                                        {["ativa", "ener_transf"].includes(field) ? (
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={!!editableValues[field]}
                                                        onChange={(e) =>
                                                            editMode && handleFieldChange(field, e.target.checked ? 1 : 0)
                                                        }
                                                        color="primary"
                                                    />
                                                }
                                                label={FIELD_LABELS[field] || field.replace(/_/g, " ")}
                                                labelPlacement="start"
                                            />
                                        ) : (
                                            <TextField
                                                label={FIELD_LABELS[field] || field.replace(/_/g, " ")}
                                                value={
                                                    field.includes("data")
                                                        ? formatDate(entityDetails[field])
                                                        : entityDetails[field] || ""
                                                }
                                                onChange={(e) =>
                                                    editMode &&
                                                    EDITABLE_FIELDS.includes(field) &&
                                                    handleFieldChange(field, e.target.value)
                                                }
                                                variant="outlined"
                                                fullWidth
                                                InputProps={{
                                                    readOnly: !editMode || !EDITABLE_FIELDS.includes(field),
                                                }}
                                                sx={{
                                                    backgroundColor:
                                                        editMode && EDITABLE_FIELDS.includes(field)
                                                            ? "#e8f5e9"
                                                            : "transparent",
                                                }}
                                            />
                                        )}
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    ))}
                </DialogContent>
                {!editMode && (
                    <DialogActions>
                        <Button onClick={handleOpenEdit} variant="contained" color="primary">
                            Editar
                        </Button>
                    </DialogActions>
                )}
                {editMode && (
                    <DialogActions>
                        <Button onClick={handleCancelEdit} color="secondary" variant="outlined">
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveEdit} color="primary" variant="contained">
                            Guardar
                        </Button>
                    </DialogActions>
                )}
            </Dialog>
            <hr style={{ margin: '20px 0' }} />
            <InternalTabs
                selectedTab={selectedTab}
                setSelectedTab={setSelectedTab}
                selectedArea={selectedArea}
                selectedEntity={selectedEntity}
                metaData={metaData}
            />
        </Box >
    );
};

export default InternalDetails;
