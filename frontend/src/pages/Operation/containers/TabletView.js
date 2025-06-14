import React, { useState } from 'react';
import { Box, Paper, Grid, Tabs, Tab, SpeedDial, SpeedDialAction } from '@mui/material';
import { FilterList, CheckCircle, MyLocation, Phone } from '@mui/icons-material';

// Hooks
import { useAuth } from '../../../contexts/AuthContext';
import { useMetaData } from '../../../contexts/MetaDataContext';
import { useOperationsData } from '../hooks/useOperationsData';
import { useOperationsFilters } from '../hooks/useOperationsFilters';
import useOfflineSync from '../hooks/useOfflineSync';

// Componentes
import AssociateFilter from '../components/filters/AssociateFilter';
import OperationCard from '../components/cards/OperationCard';
import SwipeableCard from '../components/gestures/SwipeableCard';
import ConnectionStatus from '../components/offline/ConnectionStatus';
import DetailsDrawer from '../components/modals/DetailsDrawer';
import CompletionModal from '../components/modals/CompletionModal';
import ParametersModal from '../components/modals/ParametersModal';

// Serviços
import { completeOperatorTask } from '../services/completionService';
import { exportToExcel } from '../services/exportService';
import { getUserNameByPk, getRemainingDaysColor } from '../utils/helpers';

const TabletView = () => {
    const { user: currentUser } = useAuth();
    const { metaData } = useMetaData();
    const { operationsData, associates } = useOperationsData();
    const { isOnline, pendingActions, addAction, syncActions } = useOfflineSync('operations');

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

    // Estado UI
    const [selectedItem, setSelectedItem] = useState(null);
    const [detailsDrawer, setDetailsDrawer] = useState(false);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [paramsDialogOpen, setParamsDialogOpen] = useState(false);
    const [completionNote, setCompletionNote] = useState('');

    // Permissões
    const canExecuteActions = (item) => {
        if (!item || !currentUser) return false;
        return Number(item.who) === Number(currentUser?.user_id);
    };

    // Handlers
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
        if (!isOnline) {
            addAction('complete', { documentId: selectedItem.pk, note: completionNote });
        } else {
            await completeOperatorTask(selectedItem.pk, completionNote);
        }

        setCompleteDialogOpen(false);
        setDetailsDrawer(false);
        setSelectedItem(null);
    };

    const handleNavigate = (item) => {
        const address = encodeURIComponent(`${item.address}, ${item.nut2}`);
        window.open(`https://www.google.com/maps/search/?api=1&query=${address}`);
    };

    const handleCall = (item) => {
        if (item.phone) window.location.href = `tel:${item.phone}`;
    };

    const sortedData = filteredData[selectedView]?.data || [];

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <ConnectionStatus
                isOnline={isOnline}
                pendingActions={pendingActions}
                onSync={() => syncActions({
                    complete: (data) => completeOperatorTask(data.documentId, data.note)
                })}
                onDiscard={() => { }}
            />

            {/* Filtros */}
            <Paper sx={{ p: 2, m: 2 }}>
                <AssociateFilter
                    associates={associates}
                    selectedAssociate={selectedAssociate}
                    onAssociateChange={handleAssociateChange}
                />
            </Paper>

            {/* Tabs */}
            <Tabs
                value={selectedView || false}
                onChange={(e, newValue) => handleViewChange(newValue)}
                variant="scrollable"
            >
                {sortedViews.map(([key, value]) => (
                    <Tab key={key} value={key} label={value.name} />
                ))}
            </Tabs>

            {/* Cartões */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                <Grid container spacing={3}>
                    {sortedData.map((item, index) => (
                        <Grid item xs={12} sm={6} lg={4} key={index}>
                            <SwipeableCard
                                onSwipeRight={() => handleNavigate(item)}
                                onSwipeLeft={() => {
                                    setSelectedItem(item);
                                    if (canExecuteActions(item)) handleCompleteProcess();
                                }}
                                onSwipeUp={() => handleItemClick(item)}
                            >
                                <OperationCard
                                    item={item}
                                    isUrgent={item.urgency === "1"}
                                    canAct={canExecuteActions(item)}
                                    isRamaisView={isRamaisView}
                                    onClick={() => handleItemClick(item)}
                                    onNavigate={handleNavigate}
                                    onCall={handleCall}
                                    getUserNameByPk={getUserNameByPk}
                                    getRemainingDaysColor={getRemainingDaysColor}
                                    getAddressString={(item) => `${item.address}, ${item.nut2}`}
                                    metaData={metaData}
                                />
                            </SwipeableCard>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* FAB */}
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

            {/* Modais */}
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