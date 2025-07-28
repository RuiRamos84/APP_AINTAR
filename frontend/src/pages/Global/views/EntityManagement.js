// frontend/src/pages/Global/views/EntityManagement.js

import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EntitySelector from '../components/common/EntitySelector';
import DetailsModal from '../components/common/DetailsModal';
import EnhancedDetailsModal from '../components/common/EnhancedDetailsModal';
import RecordManager from '../components/common/RecordManager';
import WaterVolumeManager from '../components/forms/WaterVolumeManager';
import RequestManager from '../components/forms/RequestManager';
import { useEntity } from '../hooks/useEntity';
import { useGlobal } from '../context/GlobalContext';

const ENTITY_TABS = [
    { id: 0, label: 'Volumes', type: 'volume' },
    { id: 1, label: 'Volumes Água', type: 'water_volume' },
    { id: 2, label: 'Energia', type: 'energy' },
    { id: 3, label: 'Despesas', type: 'expense' },
    { id: 4, label: 'Pedidos', type: 'requests' }
];

const EntityManagement = ({ areaId, onBack }) => {
    const { state } = useGlobal();
    const { selectedEntity, saveEntityDetails, details, detailsLoading } = useEntity(areaId);
    const [selectedTab, setSelectedTab] = useState(0);
    const [detailsOpen, setDetailsOpen] = useState(false);

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
            return null;
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
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={onBack}
                >
                    Voltar
                </Button>
            </Box>

            <EntitySelector
                areaId={areaId}
                onOpenDetails={handleOpenDetails}
            />

            <Paper sx={{ mt: 3 }}>
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