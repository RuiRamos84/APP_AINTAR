import React, { useState } from 'react';
import {
    Box, Paper, Typography, Grid, FormControlLabel,
    Checkbox, Chip, Tabs, Tab, Alert
} from '@mui/material';
import { useAuth } from '../../../contexts/AuthContext';
import { useMetaData } from '../../../contexts/MetaDataContext';
import SearchBar from '../../../components/common/SearchBar/SearchBar';
import ConnectionStatus from '../components/common/ConnectionStatus';
import PullToRefresh from '../components/common/PullToRefresh';
import AssociateFilter from '../components/AssociateFilter/AssociateFilter';
import OperationCard from '../components/OperationCard/OperationCard';
import OperationsTable from '../components/OperationsTable/OperationsTable';
import SwipeableCard from '../components/SwipeableCard/SwipeableCard';
import ViewCards from '../components/ViewCards/ViewCards';
import DetailsDrawer from './DetailsDrawer/DetailsDrawer';
import ActionDrawer from './ActionDrawer/ActionDrawer';
import CompletionModal from '../modals/CompletionModal/CompletionModal';
import ParametersModal from '../modals/ParametersModal/ParametersModal';
import { completeOperatorTask, validateTaskCompletion } from '../services/completionService';
import { getColumnsForView, getRemainingDaysColor, getUserNameByPk } from '../utils/operationsHelpers';
import { SpeedDial, SpeedDialIcon, SpeedDialAction } from '@mui/material';
import { FilterList, CheckCircle, MyLocation, Phone } from '@mui/icons-material';
import { exportToExcel } from '../services/exportService';
import { GetApp } from '@mui/icons-material';
import { notification } from '../../../components/common/Toaster/ThemedToaster';

const TabletOperationsContainer = ({
    operationsData,
    associates,
    selectedAssociate,
    selectedView,
    isFossaView,
    isRamaisView,
    filteredData,
    sortedViews,
    orderBy,
    order,
    expandedRows,
    sortedData,
    handleViewChange,
    handleAssociateChange,
    handleRequestSort,
    toggleRowExpand,
    getAddressString,
    onTaskCompleted 
}) => {
    const { user: currentUser } = useAuth();
    const { metaData: globalMetaData } = useMetaData();

    // UI State
    const [viewMode, setViewMode] = useState('grid');
    const [detailsDrawer, setDetailsDrawer] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [actionDrawer, setActionDrawer] = useState(false);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [paramsDialogOpen, setParamsDialogOpen] = useState(false);
    const [filterDrawer, setFilterDrawer] = useState(false);
    const [completionNote, setCompletionNote] = useState('');
    const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Offline state
    const [pendingActions, setPendingActions] = useState([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const firstViewKey = sortedViews[0]?.[0] || null;
    const currentView = selectedView || firstViewKey;

    const [completionLoading, setCompletionLoading] = useState(false);
    const [savedParams, setSavedParams] = useState(null);

    const handleCompleteProcess = () => {
        const validation = validateTaskCompletion(selectedItem, currentUser);
        if (!validation.valid) {
            notification.error(validation.reason);
            return;
        }

        if (isFossaView) {
            setParamsDialogOpen(true);
        } else {
            setCompleteDialogOpen(true);
        }
    };

    const handleFinalCompletion = async (attachment = null) => {
        if (!selectedItem || !completionNote.trim()) return;

        setCompletionLoading(true);
        try {
            await completeOperatorTask(selectedItem.pk, completionNote);

            // Sucesso: actualizar lista e fechar modais
            if (onTaskCompleted) {
                // notification.info('A actualizar lista de pedidos...');
                // notification.success('Tarefa concluída com sucesso!');
                onTaskCompleted(selectedItem.pk);
            }

            setCompleteDialogOpen(false);
            setDetailsDrawer(false);
            setSelectedItem(null);
            setCompletionNote('');
            setSavedParams(null);

        } catch (error) {
            console.error('Erro:', error);
        } finally {
            setCompletionLoading(false);
        }
    };

    const canExecuteActions = (item) => {
        if (!item) return false;
        return Number(item.who) === Number(currentUser?.user_id) || item.who === null;
    };

    const getFilteredByUser = () => {
        if (!showOnlyMyTasks && !searchTerm) return sortedData;

        let filtered = sortedData;

        // Filtrar por utilizador
        if (showOnlyMyTasks) {
            filtered = filtered.filter(item => Number(item.who) === Number(currentUser?.user_id));
        }

        // Filtrar por pesquisa
        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.regnumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.ts_entity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.phone?.includes(searchTerm) ||
                getAddressString(item).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Ordenar urgentes primeiro
        return filtered.sort((a, b) => {
            if (a.urgency === "1" && b.urgency !== "1") return -1;
            if (b.urgency === "1" && a.urgency !== "1") return 1;
            return 0;
        });
    };

    const displayData = getFilteredByUser();

    const renderCell = (column, row) => {
        if (column.format) {
            return column.format(row[column.id], globalMetaData);
        }

        if (isRamaisView && column.id === 'restdays') {
            return (
                <Box sx={{ color: getRemainingDaysColor(row[column.id]), fontWeight: 'bold' }}>
                    {Math.floor(row[column.id])} dias
                </Box>
            );
        }

        return row[column.id || column];
    };

    // Handlers
    const handleItemClick = (item) => {
        setSelectedItem(item);
        setDetailsDrawer(true);
    };

    const handleNavigate = (item) => {
        const target = item || selectedItem;
        if (!target) return;

        if (target.latitude && target.longitude) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`);
        } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getAddressString(target))}`);
        }
    };

    const handleCall = (item) => {
        const target = item || selectedItem;
        if (!target?.phone) return;
        window.location.href = `tel:${target.phone}`;
    };

    const handleParamsSaved = (params) => {
        setSavedParams(params);
        setParamsDialogOpen(false);
        setCompleteDialogOpen(true);
    };

    const handleRefresh = async () => {
        // Implementar refresh
        console.log("Refreshing data...");
    };

    const renderGridView = () => (
        <Grid container spacing={3}>
            {displayData.map((item, index) => {
                const canAct = canExecuteActions(item);

                return (
                    <Grid size={{ xs: 12, sm: 6 }} lg={4} key={index}>
                        <SwipeableCard
                            onSwipeRight={() => handleNavigate(item)}
                            onSwipeLeft={() => {
                                setSelectedItem(item);
                                return canAct ? handleCompleteProcess() : null;
                            }}
                            onSwipeUp={() => handleItemClick(item)}
                        >
                            <OperationCard
                                item={item}
                                isUrgent={item.urgency === "1"}
                                canAct={canAct}
                                isRamaisView={isRamaisView}
                                onClick={() => handleItemClick(item)}
                                onNavigate={handleNavigate}
                                onCall={handleCall}
                                getUserNameByPk={getUserNameByPk}
                                getRemainingDaysColor={getRemainingDaysColor}
                                getAddressString={getAddressString}
                                metaData={globalMetaData}
                            />
                        </SwipeableCard>
                    </Grid>
                );
            })}
        </Grid>
    );

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", bgcolor: 'background.default' }}>
            <ConnectionStatus
                isOnline={isOnline}
                pendingActions={pendingActions}
                onSync={() => { }}
                onDiscard={() => setPendingActions([])}
            />

            <Paper sx={{ p: 2, m: 2, mb: 0, borderRadius: 3, boxShadow: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <AssociateFilter
                            associates={associates || []}
                            selectedAssociate={selectedAssociate}
                            onAssociateChange={handleAssociateChange}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <SearchBar
                            searchTerm={searchTerm}
                            onSearch={setSearchTerm}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Box display="flex" justifyContent="flex-end">
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={showOnlyMyTasks}
                                        onChange={(e) => setShowOnlyMyTasks(e.target.checked)}
                                        color="primary"
                                        sx={{ transform: 'scale(1.2)' }}
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="body1">Só os meus pedidos</Typography>
                                        <Chip
                                            size="small"
                                            label={sortedData.filter(item => Number(item.who) === currentUser?.user_id).length}
                                            color={showOnlyMyTasks ? "primary" : "default"}
                                            sx={{ height: 24, minWidth: 32 }}
                                        />
                                    </Box>
                                }
                            />
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', mx: 2, borderRadius: '12px 12px 0 0', mt: 2 }}>
                <Tabs
                    value={currentView || false}
                    onChange={(e, newValue) => handleViewChange(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ '& .MuiTab-root': { minHeight: 64, minWidth: 120, fontSize: '1.1rem' } }}
                >
                    {sortedViews.map(([key, value]) => (
                        <Tab
                            key={key}
                            value={key}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                                    <Box>
                                        <Typography variant="body1">{value.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {value.total || 0} {value.total === 1 ? 'pedido' : 'pedidos'}
                                        </Typography>
                                    </Box>
                                </Box>
                            }
                        />
                    ))}
                </Tabs>
            </Box>

            <PullToRefresh onRefresh={handleRefresh}>
                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, px: { xs: 2, sm: 3 } }}>
                    {selectedView && filteredData[selectedView] && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, px: 1 }}>
                            <Typography variant="h6" fontWeight="medium">
                                {displayData.length} {displayData.length === 1 ? 'registo' : 'registos'}
                            </Typography>
                        </Box>
                    )}

                    {viewMode === 'grid' ? renderGridView() : (
                        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                            <OperationsTable
                                data={displayData}
                                columns={getColumnsForView(selectedView, globalMetaData)}
                                orderBy={orderBy}
                                order={order}
                                onRequestSort={handleRequestSort}
                                expandedRows={expandedRows}
                                toggleRowExpand={toggleRowExpand}
                                isRamaisView={isRamaisView}
                                getRemainingDaysColor={getRemainingDaysColor}
                                getAddressString={getAddressString}
                                renderCell={renderCell}
                                onRowClick={handleItemClick}
                            />
                        </Paper>
                    )}
                </Box>
            </PullToRefresh>

            <SpeedDial
                ariaLabel="Ações rápidas"
                sx={{ position: 'fixed', bottom: 24, right: 24 }}
                icon={<SpeedDialIcon />}
                direction="up"
            >
                <SpeedDialAction
                    icon={<GetApp />}
                    tooltipTitle="Exportar"
                    onClick={() => exportToExcel(filteredData, selectedView)}
                />
                <SpeedDialAction
                    icon={<FilterList />}
                    tooltipTitle="Filtros"
                    onClick={() => setFilterDrawer(true)}
                />
                {selectedItem && Number(selectedItem.who) === Number(currentUser?.user_id) && (
                    <SpeedDialAction
                        icon={<CheckCircle />}
                        tooltipTitle="Finalizar"
                        onClick={handleCompleteProcess}
                    />
                )}
                {selectedItem && (
                    <SpeedDialAction
                        icon={<MyLocation />}
                        tooltipTitle="Navegar"
                        onClick={() => handleNavigate(selectedItem)}
                    />
                )}
                {selectedItem?.phone && (
                    <SpeedDialAction
                        icon={<Phone />}
                        tooltipTitle="Ligar"
                        onClick={() => handleCall(selectedItem)}
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
                getAddressString={getAddressString}
                getUserNameByPk={getUserNameByPk}
                metaData={globalMetaData}
                onNavigate={handleNavigate}
                onCall={handleCall}
                onComplete={handleCompleteProcess}
            />

            <ActionDrawer
                open={actionDrawer}
                onClose={() => setActionDrawer(false)}
                item={selectedItem}
                onNavigate={handleNavigate}
                onComplete={() => {
                    setActionDrawer(false);
                    setCompleteDialogOpen(true);
                }}
            />

            <ParametersModal
                open={paramsDialogOpen}
                onClose={() => setParamsDialogOpen(false)}
                document={selectedItem}
                onSave={handleParamsSaved}
            />

            <CompletionModal
                open={completeDialogOpen}
                onClose={() => setCompleteDialogOpen(false)}
                note={completionNote}
                onNoteChange={setCompletionNote}
                onConfirm={handleFinalCompletion}
                loading={completionLoading}
                document={selectedItem}
            />
        </Box>
    );
};

export default TabletOperationsContainer;