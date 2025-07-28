// frontend/src/pages/Global/components/common/EntitySelector.js

import React from 'react';
import {
    Paper,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Button,
    Box
} from '@mui/material';
import { useEntity } from '../../hooks/useEntity';

const EntitySelector = ({
    areaId,
    showDetailsButton = true,
    onOpenDetails
}) => {
    const {
        selectedLocation,
        entities,
        selectedEntity,
        locations,
        selectLocation,
        selectEntity
    } = useEntity(areaId);

    const entityLabel = areaId === 1 ? 'ETAR' : 'EE';

    return (
        <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Seleccionar {entityLabel}
            </Typography>

            <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                        <InputLabel>Localização</InputLabel>
                        <Select
                            value={selectedLocation}
                            onChange={(e) => selectLocation(e.target.value)}
                            label="Localização"
                        >
                            {locations.map(location => (
                                <MenuItem key={location} value={location}>
                                    {location}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth disabled={!selectedLocation}>
                        <InputLabel>{entityLabel}</InputLabel>
                        <Select
                            value={selectedEntity?.pk || ''}
                            onChange={(e) => selectEntity(e.target.value)}
                            label={entityLabel}
                        >
                            {entities.map(entity => (
                                <MenuItem key={entity.pk} value={entity.pk}>
                                    {entity.nome}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {showDetailsButton && selectedEntity && (
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={onOpenDetails}
                            fullWidth
                        >
                            Ver Detalhes
                        </Button>
                    </Grid>
                )}
            </Grid>

            {selectedEntity && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2">
                        <strong>Seleccionado:</strong> {selectedEntity.nome}
                        {selectedEntity.subsistema && (
                            <> • <strong>Subsistema:</strong> {selectedEntity.subsistema}</>
                        )}
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

export default EntitySelector;