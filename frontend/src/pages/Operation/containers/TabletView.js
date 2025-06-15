// frontend/src/pages/Operation/containers/TabletView.js - LINHA 42 CORRIGIDA
import React, { useEffect } from 'react';
import { Box, Paper, Typography, Grid, FormControlLabel, Checkbox, Chip, Tabs, Tab } from '@mui/material';

import { useAuth } from '../../../contexts/AuthContext';
import { useMetaData } from '../../../contexts/MetaDataContext';
import useOperationsStore from '../store/operationsStore';
import { useOperationsData } from '../hooks/useOperationsData';
import { useOperationsFilters } from '../hooks/useOperationsFilters';
import { useOfflineSync } from '../hooks/useOfflineSync';

import SearchBar from '../../../components/common/SearchBar/SearchBar';
import AssociateFilter from '../components/filters/AssociateFilter';
import OperationCard from '../components/cards/OperationCard';
import SwipeableCard from '../components/gestures/SwipeableCard';
import ConnectionStatus from '../components/offline/ConnectionStatus';
import PullToRefresh from '../components/offline/PullToRefresh';
import QuickActionsFab from '../components/navigation/QuickActionsFab';
import DetailsDrawer from '../components/modals/DetailsDrawer';
import CompletionModal from '../components/modals/CompletionModal';
import ParametersModal from '../components/modals/ParametersModal';

import { completeOperatorTask, validateTaskCompletion } from '../services/completionService';
import { getUserNameByPk, getRemainingDaysColor } from '../utils/helpers';
import { OPERATION_CONSTANTS } from '../utils/constants';

const TabletView = () => {
    const { user: currentUser } = useAuth();
    const { metaData } = useMetaData();

    // Store com fallbacks
    const store = useOperationsStore();
    const ui = store.ui || {};
    const filters = store.filters || {};  // <- FIX: fallback

    const {
        setSelectedItem = () => { },
        setDetailsDrawer = () => { },
        setCompleteDialogOpen = () => { },
        setParamsDialogOpen = () => { },
        setShowOnlyMyTasks = () => { },
        setSearchTerm = () => { },
        setCompletionNote = () => { },
        setCompletionLoading = () => { },
        setSelectedAssociate = () => { },
        setSelectedView = () => { },
        getFilteredOperations = () => [],
        closeAllModals = () => { }
    } = store;

    // Data
    const { operationsData, associates, refetchOperations } = useOperationsData();
    const { isFossaView, isRamaisView, filteredData, sortedViews } = useOperationsFilters(
        operationsData,
        filters.selectedAssociate  // <- Agora não crasha
    );

    // Offline
    const { isOnline, pendingActions, isSyncing, addAction, syncActions, clearPending } = useOfflineSync();

    // Dados computados
    const displayData = getFilteredOperations(currentUser?.user_id);
    const canExecuteActions = (item) => item && Number(item.who) === Number(currentUser?.user_id);

    // Handlers
    const handleItemClick = (item) => {
        setSelectedItem(item);
        setDetailsDrawer(true);
    };

    const handleCompleteProcess = () => {
        const validation = validateTaskCompletion(ui.selectedItem, currentUser);
        if (!validation.valid) return;

        if (isFossaView) {
            setParamsDialogOpen(true);
        } else {
            setCompleteDialogOpen(true);
        }
    };

    const handleFinalCompletion = async () => {
        if (!ui.selectedItem || !ui.completionNote.trim()) return;

        setCompletionLoading(true);

        try {
            if (isOnline) {
                await completeOperatorTask(ui.selectedItem.pk, ui.completionNote);
                await refetchOperations();
            } else {
                addAction('complete', {
                    documentId: ui.selectedItem.pk,
                    note: ui.completionNote
                });
            }

            closeAllModals();
            setCompletionNote('');

        } catch (error) {
            console.error('Erro:', error);
        } finally {
            setCompletionLoading(false);
        }
    };

    const handleNavigate = (item) => {
        const target = item || ui.selectedItem;
        if (!target) return;

        const address = `${target.address}, ${target.nut2}`;
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
    };

    const handleCall = (item) => {
        const target = item || ui.selectedItem;
        if (!target?.phone) return;
        window.location.href = `tel:${target.phone}`;
    };

    const handleSync = async () => {
        await syncActions({
            complete: (data) => completeOperatorTask(data.documentId, data.note)
        });
        await refetchOperations();
    };

    useEffect(() => {
        if (sortedViews.length > 0 && !filters.selectedView) {
            setSelectedView(sortedViews[0][0]);
        } else if (sortedViews.length === 0) {
            setSelectedView(null); // Reset se não há tabs
        }
    }, [sortedViews, setSelectedView]);

    // Limpar selectedView quando associado muda
    useEffect(() => {
        setSelectedView(null);
    }, [filters.selectedAssociate, setSelectedView]);

    console.log('DEBUG - sortedViews:', sortedViews.length);
    console.log('DEBUG - selectedAssociate:', filters.selectedAssociate);
    console.log('DEBUG - selectedView:', filters.selectedView);

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <ConnectionStatus
                isOnline={isOnline}
                pendingActions={pendingActions}
                isSyncing={isSyncing}
                onSync={handleSync}
                onDiscard={clearPending}
            />

            {/* Filtros */}
            <Paper sx={{ p: 2, m: 2, mb: 0, borderRadius: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                        <AssociateFilter
                            associates={associates || []}
                            selectedAssociate={filters.selectedAssociate}
                            onAssociateChange={setSelectedAssociate}
                        />
                    </Grid>
                    {/* Só mostra outros filtros se há associado seleccionado */}
                    {filters.selectedAssociate && (
                        <>
                            <Grid item xs={12} sm={4}>
                                <SearchBar
                                    searchTerm={ui.searchTerm}
                                    onSearch={setSearchTerm}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={ui.showOnlyMyTasks}
                                            onChange={(e) => setShowOnlyMyTasks(e.target.checked)}
                                        />
                                    }
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Typography variant="body2">Só os meus</Typography>
                                            <Chip
                                                size="small"
                                                label={displayData.filter(item =>
                                                    Number(item.who) === currentUser?.user_id
                                                ).length}
                                                color={ui.showOnlyMyTasks ? "primary" : "default"}
                                            />
                                        </Box>
                                    }
                                />
                            </Grid>
                        </>
                    )}
                </Grid>
            </Paper>

            {/* Tabs - só se há associado seleccionado E há dados */}
            {filters.selectedAssociate && sortedViews.length > 0 && (
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mx: 2, mt: 2 }}>
                    <Tabs
                        value={filters.selectedView || false}
                        onChange={(e, newValue) => setSelectedView(newValue)}
                        variant="scrollable"
                    >
                        {sortedViews.map(([key, value]) => (
                            <Tab
                                key={key}
                                value={key}
                                label={`${value.name} (${value.data?.length || 0})`}
                            />
                        ))}
                    </Tabs>
                </Box>
            )}

            {/* Conteúdo - só se há associado E tab seleccionada */}
            {filters.selectedAssociate && filters.selectedView ? (
                <PullToRefresh onRefresh={refetchOperations}>
                    <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                        <Grid container spacing={3}>
                            {displayData.map((item, index) => (
                                <Grid item xs={12} sm={6} lg={4} key={index}>
                                    <SwipeableCard
                                        onSwipeRight={() => handleNavigate(item)}
                                        onSwipeLeft={() => {
                                            setSelectedItem(item);
                                            return canExecuteActions(item) ? handleCompleteProcess() : null;
                                        }}
                                        onTap={() => handleItemClick(item)}
                                        threshold={OPERATION_CONSTANTS.UI.SWIPE_THRESHOLD}
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
                                            getAddressString={(row) => `${row.address}, ${row.nut2}`}
                                            metaData={metaData}
                                        />
                                    </SwipeableCard>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </PullToRefresh>
            ) : (
                // Mensagem quando não há dados
                <Box sx={{
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 4
                }}>
                    <Typography variant="h6" color="text.secondary">
                        {!filters.selectedAssociate
                            ? 'Seleccione um associado para ver os dados'
                            : 'Sem dados para mostrar'
                        }
                    </Typography>
                </Box>
            )}

            {/* FAB - só se há dados */}
            {filters.selectedAssociate && filters.selectedView && (
                <QuickActionsFab
                    selectedItem={ui.selectedItem}
                    onNavigate={handleNavigate}
                    onCall={handleCall}
                    onComplete={handleCompleteProcess}
                    onFilter={() => console.log('Filtros')}
                    currentUserPk={currentUser?.user_id}
                />
            )}

            {/* Modals - sempre disponíveis */}
            <DetailsDrawer
                open={ui.detailsDrawer}
                onClose={() => setDetailsDrawer(false)}
                item={ui.selectedItem}
                canExecuteActions={canExecuteActions(ui.selectedItem)}
                isRamaisView={isRamaisView}
                isFossaView={isFossaView}
                metaData={metaData}
                onComplete={handleCompleteProcess}
            />

            <ParametersModal
                open={ui.paramsDialogOpen}
                onClose={() => setParamsDialogOpen(false)}
                document={ui.selectedItem}
                onSave={() => {
                    setParamsDialogOpen(false);
                    setCompleteDialogOpen(true);
                }}
            />

            <CompletionModal
                open={ui.completeDialogOpen}
                onClose={() => setCompleteDialogOpen(false)}
                note={ui.completionNote || ''}
                onNoteChange={setCompletionNote}
                onConfirm={handleFinalCompletion}
                loading={ui.completionLoading}
                document={ui.selectedItem}
            />
        </Box>
    );
}

export default TabletView;