// /components/EntitySelector.js
import React, { useEffect } from "react";
import {
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Box,
    Typography
} from "@mui/material";
import { useInternalContext } from "../context/InternalContext";

const EntitySelector = ({ areaId, metaData }) => {
    const { state, dispatch } = useInternalContext();

    // Resetar área quando o componente montar com nova área
    useEffect(() => {
        dispatch({ type: "SET_AREA", payload: areaId });
    }, [areaId, dispatch]);

    const handleLocationChange = (event) => {
        const location = event.target.value;
        dispatch({ type: "SET_LOCATION", payload: location });

        const entities = areaId === 1 ? metaData?.etar : metaData?.ee;
        if (entities) {
            const filtered = entities.filter(entity => entity.ts_entity === location);
            dispatch({ type: "SET_FILTERED_ENTITIES", payload: filtered });
            dispatch({ type: "SET_ENTITY", payload: null });
        }
    };

    const handleEntityChange = (event) => {
        const entityId = parseInt(event.target.value, 10);
        const entity = state.filteredEntities.find(entity => entity.pk === entityId);
        dispatch({ type: "SET_ENTITY", payload: entity });
    };

    const getLocations = () => {
        const entities = areaId === 1 ? metaData?.etar : metaData?.ee;
        return [...new Set(entities?.map(entity => entity.ts_entity) || [])];
    };

    return (
        <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Identificação da {areaId === 1 ? "ETAR" : "Estação Elevatória"}
            </Typography>

            <Box sx={{ mb: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Localização</InputLabel>
                            <Select
                                value={state.selectedLocation}
                                onChange={handleLocationChange}
                                label="Localização"
                            >
                                {getLocations().map(location => (
                                    <MenuItem key={location} value={location}>
                                        {location}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>{areaId === 1 ? "ETAR" : "Estação Elevatória"}</InputLabel>
                            <Select
                                value={state.selectedEntity?.pk || ""}
                                onChange={handleEntityChange}
                                label={areaId === 1 ? "ETAR" : "Estação Elevatória"}
                                disabled={!state.selectedLocation}
                            >
                                {state.filteredEntities.map(entity => (
                                    <MenuItem key={entity.pk} value={entity.pk}>
                                        {entity.nome}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );
};

export default EntitySelector;