import React from 'react';
import { Box, Grid, FormControl, InputLabel, Select, MenuItem, Paper, Typography, Chip, Avatar } from '@mui/material';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import OpacityIcon from '@mui/icons-material/Opacity';

const EntitySelector = ({ areaId, metaData, selectedLocation, selectedEntity, onLocationChange, onEntityChange }) => {
    const entities = areaId === 1 ? metaData?.etar : metaData?.ee;
    const entityType = areaId === 1 ? 'ETAR' : 'EE';

    // Localizações únicas
    const locations = [...new Set(entities?.map(e => e.ts_entity) || [])].sort();

    // Entidades filtradas por localização
    const filteredEntities = selectedLocation
        ? entities?.filter(e => e.ts_entity === selectedLocation) || []
        : [];

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Seleccionar {entityType}
            </Typography>

            <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 5 }}>
                    <FormControl fullWidth>
                        <InputLabel>Localização</InputLabel>
                        <Select
                            value={selectedLocation}
                            onChange={onLocationChange}
                            label="Localização"
                        >
                            <MenuItem value="">Seleccionar...</MenuItem>
                            {locations.map(location => (
                                <MenuItem key={location} value={location}>
                                    {location}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 5 }}>
                    <FormControl fullWidth disabled={!selectedLocation}>
                        <InputLabel>{entityType}</InputLabel>
                        <Select
                            value={selectedEntity?.pk || ""}
                            onChange={onEntityChange}
                            label={entityType}
                        >
                            <MenuItem value="">Seleccionar...</MenuItem>
                            {filteredEntities.map(entity => (
                                <MenuItem key={entity.pk} value={entity.pk}>
                                    {entity.nome}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 2 }}>
                    {selectedEntity && (
                        <Chip
                            label="Seleccionada"
                            color="primary"
                            avatar={
                                <Avatar sx={{ bgcolor: 'primary.main' }}>
                                    {areaId === 1 ? <WaterDropIcon /> : <OpacityIcon />}
                                </Avatar>
                            }
                        />
                    )}
                </Grid>
            </Grid>

            {selectedEntity && (
                <Box mt={2}>
                    <Typography variant="body2" color="text.secondary">
                        {entityType} seleccionada: <strong>{selectedEntity.nome}</strong> ({selectedEntity.ts_entity})
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

export default EntitySelector;