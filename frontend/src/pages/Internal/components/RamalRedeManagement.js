import React, { useState } from 'react';
import {
    Box,
    Tabs,
    Tab,
    Grid
} from '@mui/material';
import ExpenseRecordsTable from './ExpenseRecordsTable';
import MaintenanceRecordsTable from '../MaintenanceRecordsTable';

const RamalRedeManagement = ({ selectedArea, metaData }) => {
    const [selectedTab, setSelectedTab] = useState(0);

    const handleTabChange = (event, newValue) => {
        setSelectedTab(newValue);
    };

    return (
        <Box>
            <Tabs value={selectedTab} onChange={handleTabChange}>
                <Tab label="Registo de Despesa" />
                <Tab label="Registo de Desobstrução" />
                {selectedArea === 4 && <Tab label="Agendamento de Manutenção" />}
            </Tabs>

            <Box mt={2}>
                {selectedTab === 0 && (
                    <ExpenseRecordsTable
                        selectedArea={selectedArea}
                        metaData={metaData}
                    />
                )}
                {selectedTab === 1 && (
                    <MaintenanceRecordsTable
                        selectedArea={selectedArea}
                        metaData={metaData}
                        recordType="unblocking"
                    />
                )}
                {selectedTab === 2 && selectedArea === 4 && (
                    <MaintenanceRecordsTable
                        selectedArea={selectedArea}
                        metaData={metaData}
                        recordType="maintenance"
                    />
                )}
            </Box>
        </Box>
    );
};

export default RamalRedeManagement;