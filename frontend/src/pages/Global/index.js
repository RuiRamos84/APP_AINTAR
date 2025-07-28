// frontend/src/pages/Global/index.js

import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { GlobalProvider, useGlobal } from './context/GlobalContext';
import AreaSelector from './views/AreaSelector';
import EntityManagement from './views/EntityManagement';
import NetworkManagement from './views/NetworkManagement';
import MaintenanceView from './views/MaintenanceView';
import { AREAS } from './utils/constants';

const GlobalContent = () => {
    const { state, dispatch } = useGlobal();
    const [currentView, setCurrentView] = useState('areas');

    const handleSelectArea = (areaId) => {
        dispatch({ type: 'SET_AREA', payload: areaId });
        setCurrentView('management');
    };

    const handleBack = () => {
        dispatch({ type: 'RESET' });
        setCurrentView('areas');
    };

    const renderView = () => {
        if (currentView === 'areas') {
            return <AreaSelector onSelectArea={handleSelectArea} />;
        }

        const areaId = state.selectedArea;

        // ETAR/EE - gestão completa
        if (areaId === 1 || areaId === 2) {
            return <EntityManagement areaId={areaId} onBack={handleBack} />;
        }

        // Rede/Ramais - gestão de rede
        if (areaId === 3 || areaId === 4) {
            return <NetworkManagement areaId={areaId} onBack={handleBack} />;
        }

        // Manutenção/Equipamento - apenas despesas
        if (areaId === 5 || areaId === 6) {
            return <MaintenanceView onBack={handleBack} />;
        }

        return <AreaSelector onSelectArea={handleSelectArea} />;
    };

    return (
        <Box sx={{ p: 3 }}>
            {renderView()}
        </Box>
    );
};

const GlobalModule = () => {
    return (
        <GlobalProvider>
            <GlobalContent />
        </GlobalProvider>
    );
};

export default GlobalModule;