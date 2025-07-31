// frontend/src/pages/Global/views/EntityManagement.js

import React, { useState } from 'react';
import {
    Box, Tabs, Tab, Paper, Button, Typography, FormControl,
    InputLabel, Select, MenuItem, Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DetailsModal from '../components/common/DetailsModal';
import EnhancedDetailsModal from '../components/common/EnhancedDetailsModal';
import RecordManager from '../components/common/RecordManager';
import WaterVolumeManager from '../components/forms/WaterVolumeManager';
import RequestManager from '../components/forms/RequestManager';
import { useEntity } from '../hooks/useEntity';
import { useGlobal } from '../context/GlobalContext';
import { AREAS } from '../utils/constants';

const ENTITY_TABS = [
    { id: 0, label: 'Volumes', type: 'volume' },
    { id: 1, label: 'Volumes Água', type: 'water_volume' },
    { id: 2, label: 'Energia', type: 'energy' },
    { id: 3, label: 'Despesas', type: 'expense' },
    { id: 4, label: 'Pedidos', type: 'requests' }
];

const EntityManagement = ({ areaId, onBack }) => {
    const { state } = useGlobal();
    const {
        selectedEntity,
        locations,
        entities,
        selectLocation,
        selectEntity,
        saveEntityDetails,
        details,
        detailsLoading
    } = useEntity(areaId);

    const [selectedTab, setSelectedTab] = useState(0);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const currentArea = Object.values(AREAS).find(area => area.id === areaId);

    const handleOpenDetails = () => {
        if (selectedEntity) {
            setDetailsOpen(true);
        }
    };

    const handleSaveDetails = async (data) => {
        const success = await saveEntityDetails(data);
        if (success) {
            setDetailsOpen(false);
        }
    };

    const renderTabContent = () => {
        const currentTab = ENTITY_TABS[selectedTab];

        if (!selectedEntity && currentTab.type !== 'requests') {
            return (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                        Seleccione uma entidade para continuar
                    </Typography>
                </Box>
            );
        }

        switch (currentTab.type) {
            case 'requests':
                return <RequestManager areaId={areaId} />;
            case 'water_volume':
                return <WaterVolumeManager />;
            default:
                return <RecordManager recordType={currentTab.type} />;
        }
    };

    return (
        <Box>
            {/* Header com título, selectors e botão voltar */}
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                gap={3}
                mb={3}
                sx={{
                    minHeight: '56px',
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    boxShadow: 1
                }}
            >
                {/* Título da área */}
                <Typography variant="h5" sx={{ fontWeight: 600, flexShrink: 0 }}>
                    {currentArea?.name}
                </Typography>

                {/* Selectors horizontais */}
                <Box display="flex" gap={2} sx={{ flex: 1, maxWidth: '600px' }}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Localização</InputLabel>
                        <Select
                            value={state.selectedLocation || ''}
                            onChange={(e) => selectLocation(e.target.value)}
                            label="Localização"
                        >
                            <MenuItem value="">Seleccionar</MenuItem>
                            {locations.map(location => (
                                <MenuItem key={location} value={location}>
                                    {location}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl
                        size="small"
                        sx={{ minWidth: 200 }}
                        disabled={!state.selectedLocation}
                    >
                        <InputLabel>{currentArea?.name}</InputLabel>
                        <Select
                            value={selectedEntity?.pk || ''}
                            onChange={(e) => selectEntity(e.target.value)}
                            label={currentArea?.name}
                        >
                            <MenuItem value="">Seleccionar</MenuItem>
                            {entities.map(entity => (
                                <MenuItem key={entity.pk} value={entity.pk}>
                                    {entity.nome}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {selectedEntity && (
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleOpenDetails}
                        >
                            Detalhes
                        </Button>
                    )}
                </Box>

                {/* Botão voltar */}
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={onBack}
                    sx={{ flexShrink: 0 }}
                >
                    Voltar
                </Button>
            </Box>

            {/* Indicador entidade seleccionada */}
            {selectedEntity && (
                <Box sx={{ mb: 2 }}>
                    <Chip
                        label={`${selectedEntity.nome} • ${selectedEntity.ts_entity}`}
                        color="primary"
                        variant="outlined"
                        size="small"
                    />
                </Box>
            )}

            {/* Conteúdo principal */}
            <Paper>
                <Tabs
                    value={selectedTab}
                    onChange={(e, v) => setSelectedTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {ENTITY_TABS.map(tab => (
                        <Tab key={tab.id} label={tab.label} />
                    ))}
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {renderTabContent()}
                </Box>
            </Paper>

            {/* Modal de detalhes */}
            <EnhancedDetailsModal
                open={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                details={details}
                entityType={areaId}
                onSave={handleSaveDetails}
                loading={detailsLoading}
            />
        </Box>
    );
};

export default EntityManagement;