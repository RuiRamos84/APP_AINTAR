import React, { useState } from 'react';
import { Box, Paper, Grid, Tabs, Tab, SpeedDial, SpeedDialAction } from '@mui/material';
import { FilterList, CheckCircle, MyLocation, Phone } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useMetaData } from '../../../contexts/MetaDataContext';
import { useOperationsData } from '../hooks/useOperationsData';
import { useOperationsFilters } from '../hooks/useOperationsFilters';
import AssociateFilter from '../components/filters/AssociateFilter';
import OperationCard from '../components/cards/OperationCard';
import DetailsDrawer from '../../Operação/containers/DetailsDrawer/DetailsDrawer';
import CompletionModal from '../components/modals/CompletionModal';
import ParametersModal from '../components/modals/ParametersModal';
import { completeOperatorTask } from '../../Operação/services/completionService';
import { getUserNameByPk, getRemainingDaysColor } from '../utils/helpers';

const TabletView = () => {
    const { user: currentUser } = useAuth();
    const { metaData } = useMetaData();
    const { operationsData, associates } = useOperationsData();

    const {
        selectedAssociate,
        selectedView,
        isFossaView,
        isRamaisView,
        filteredData,
        sortedViews,
        handleViewChange,
        handleAssociateChange
    } = useOperationsFilters(operationsData);

    const [selectedItem, setSelectedItem] = useState(null);
    const [detailsDrawer, setDetailsDrawer] = useState(false);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [paramsDialogOpen, setParamsDialogOpen] = useState(false);
    const [completionNote, setCompletionNote] = useState('');

    const canExecuteActions = (item) => {
        if (!item || !currentUser) return false;
        return Number(item.who) === Number(currentUser?.user_id);
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
        setDetailsDrawer(true);
    };

    const handleCompleteProcess = () => {
        if (isFossaView) {
            setParamsDialogOpen(true);
        } else {
            setCompleteDialogOpen(true);
        }
    };

    const handleFinalCompletion = async () => {
        await completeOperatorTask(selectedItem.pk, completionNote);
        setCompleteDialogOpen(false);
        setDetailsDrawer(false);
        setSelectedItem(null);
    };

    const sortedData = filteredData[selectedView]?.data || [];

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <Paper sx={{ p: 2, m: 2 }}>
                <AssociateFilter
                    associates={associates}
                    selectedAssociate={selectedAssociate}
                    onAssociateChange={handleAssociateChange}
                />
            </Paper>

            <Tabs
                value={selectedView || false}
                onChange={(e, newValue) => handleViewChange(newValue)}
                variant="scrollable"
            >
                {sortedViews.map(([key, value]) => (
                    <Tab key={key} value={key} label={value.name} />
                ))}
            </Tabs>

            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                <Grid container spacing={3}>
                    {sortedData.map((item, index) => (
                        <Grid item xs={12} sm={6} lg={4} key={index}>
                            <OperationCard
                                item={item}
                                isUrgent={item.urgency === "1"}
                                canAct={item ? canExecuteActions(item) : false}
                                isRamaisView={isRamaisView}
                                onClick={() => handleItemClick(item)}
                                onNavigate={() => window.open(`https://www.google.com/maps/search/?api=1&query=${item.address}`)}
                                onCall={() => window.location.href = `tel:${item.phone}`}
                                metaData={metaData}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Box>

            <SpeedDial
                ariaLabel="Acções"
                sx={{ position: 'fixed', bottom: 24, right: 24 }}
                icon={<FilterList />}
            >
                {selectedItem && canExecuteActions(selectedItem) && (
                    <SpeedDialAction
                        icon={<CheckCircle />}
                        tooltipTitle="Finalizar"
                        onClick={handleCompleteProcess}
                    />
                )}
            </SpeedDial>

            <DetailsDrawer
                open={detailsDrawer}
                onClose={() => setDetailsDrawer(false)}
                item={selectedItem}
                canExecuteActions={canExecuteActions(selectedItem)}
                isRamaisView={isRamaisView}
                isFossaView={isFossaView}
                metaData={metaData}
                onComplete={handleCompleteProcess}
            />

            <ParametersModal
                open={paramsDialogOpen}
                onClose={() => setParamsDialogOpen(false)}
                document={selectedItem}
                onSave={() => {
                    setParamsDialogOpen(false);
                    setCompleteDialogOpen(true);
                }}
            />

            <CompletionModal
                open={completeDialogOpen}
                onClose={() => setCompleteDialogOpen(false)}
                note={completionNote}
                onNoteChange={setCompletionNote}
                onConfirm={handleFinalCompletion}
                document={selectedItem}
            />
        </Box>
    );
};

export default TabletView;