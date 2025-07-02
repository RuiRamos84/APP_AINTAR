import React from "react";
import {
    Box,
    Typography,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Button,
} from "@mui/material";
import { addMaintenance } from "../../services/InternalService";
import { notifySuccess, notifyError, notifyWarning, notifyInfo, notifyCustom, toast } from "../../components/common/Toaster/ThemedToaster";

const InternalMaintenance = ({
    metaData,
    selectedArea,
    selectedLocation,
    setSelectedLocation,
    filteredEntities = [], // valor default
    setFilteredEntities,
    selectedEntities = [], // valor default
    setSelectedEntities,
}) => {
    // Atualiza as entidades com base na localização selecionada
    const handleLocationChange = (event) => {
        const location = event.target.value;
        setSelectedLocation(location);
        const entities = selectedArea === 1 ? metaData?.etar : metaData?.ee;
        if (entities) {
            setFilteredEntities(entities.filter((entity) => entity.ts_entity === location));
        }
    };

    const locations = selectedArea === 1 ?
        [...new Set(metaData?.etar?.map(entity => entity.ts_entity) || [])] :
        [...new Set(metaData?.ee?.map(entity => entity.ts_entity) || [])];

    // Atualiza a seleção de entidades
    const handleEntitySelect = (entityId) => {
        setSelectedEntities((prevSelected) =>
            prevSelected.includes(entityId)
                ? prevSelected.filter((id) => id !== entityId)
                : [...prevSelected, entityId]
        );
    };

    // Função para agendar manutenção
    const handleAddMaintenance = async () => {
        try {
            let type = selectedArea === 1 ? "etar" : "ee";
            const maintenanceIds = []; // Array para armazenar os IDs das manutenções agendadas
            for (const entityId of selectedEntities) {
                console.log(`Agendando manutenção para ${type} ID: ${entityId}`);
                const result = await addMaintenance(type, entityId); // Chama o serviço para cada entidade
                maintenanceIds.push(result.result); // Adiciona o ID da manutenção agendada ao array
            }
            notifySuccess(`${maintenanceIds.length} manutenção(ões) agendada(s) com sucesso. IDs: ${maintenanceIds.join(", ")}`);
            setSelectedEntities([]); // Limpa as seleções após agendar
        } catch (error) {
            console.error("Erro ao agendar manutenção:", error);
            notifyError("Erro ao agendar manutenção");
        }
    };

    return (
        <Box>
            <Box display="flex" gap={2} mb={3}>
                {/* Seleção de Localização */}
                <FormControl fullWidth variant="outlined">
                    <InputLabel>Localização</InputLabel>
                    <Select value={selectedLocation} onChange={handleLocationChange} label="Localização">
                        {locations.map((location) => (
                            <MenuItem key={location} value={location}>
                                {location}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {selectedLocation && (
                <Box>
                    <Typography variant="h6" gutterBottom>
                        Selecione as {selectedArea === 1 ? "ETAR" : "EE"} para agendamento de manutenção:
                    </Typography>
                    <Grid container spacing={2}>
                        {filteredEntities?.map((entity) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={entity.pk}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={selectedEntities.includes(entity.pk)}
                                            onChange={() => handleEntitySelect(entity.pk)}
                                        />
                                    }
                                    label={`${entity.nome} - ${entity.ts_entity}`}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {selectedEntities.length > 0 && (
                <Box mt={3}>
                    <Button variant="contained" color="primary" onClick={handleAddMaintenance}>
                        Confirmar Agendamento
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default InternalMaintenance;
