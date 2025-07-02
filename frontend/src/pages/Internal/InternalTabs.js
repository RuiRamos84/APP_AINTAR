import React from "react";
import { Tabs, Tab, Box, Grid } from "@mui/material";
import VolumeRecordsTable from "./VolumeRecordsTable";
import EnergyRecordsTable from "./EnergyRecordsTable";
import ExpenseRecordsTable from "./ExpenseRecordsTable";
import MaintenanceRecordsTable from "./MaintenanceRecordsTable";

const InternalTabs = ({ selectedTab, setSelectedTab, selectedArea, selectedEntity, metaData }) => {
    const handleTabChange = (event, newValue) => {
        setSelectedTab(newValue);
    };

    return (
        <Box>
            {/* Tabs Responsivas */}
            <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                aria-label="Detalhes Tabs"
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mt: 2 }}
            >
                <Tab label="Registo de Volumes" />
                <Tab label="Registo de Energia" />
                <Tab label="Registo de Despesas" />~
                {/* <Tab label="Registo de Manutenção" />
                <Tab label="Registo de Intervenção" />
                {selectedArea >= 3 && <Tab label="Registo de Desobstrução" />} */}
            </Tabs>

            {/* Conteúdo das Tabs Responsivo */}
            <Box mt={2}>
                <Grid container spacing={2}>
                    {selectedTab === 0 && (
                        <Grid size={{ xs: 12 }}>
                            <VolumeRecordsTable
                                selectedEntity={selectedEntity}
                                selectedArea={selectedArea}
                                metaData={metaData}
                            />
                        </Grid>
                    )}
                    {selectedTab === 1 && (
                        <Grid size={{ xs: 12 }}>
                            <EnergyRecordsTable
                                selectedEntity={selectedEntity}
                                selectedArea={selectedArea}
                                metaData={metaData}
                            />
                        </Grid>
                    )}
                    {selectedTab === 2 && (
                        <Grid size={{ xs: 12 }}>
                            <ExpenseRecordsTable
                                selectedEntity={selectedEntity}
                                selectedArea={selectedArea}
                                metaData={metaData}
                            />
                        </Grid>
                    )}
                    {selectedTab === 3 && (
                        <MaintenanceRecordsTable
                            selectedEntity={selectedEntity}
                            selectedArea={selectedArea}
                            metaData={metaData}
                            recordType="maintenance"
                        />
                    )}
                </Grid>
            </Box>
        </Box>
    );
};

export default InternalTabs;

