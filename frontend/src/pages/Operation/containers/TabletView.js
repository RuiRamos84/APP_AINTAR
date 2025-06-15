import React, { useState } from 'react';
import {
    Box, Paper, Typography, Grid, FormControlLabel,
    Checkbox, Chip, Tabs, Tab, SpeedDial, SpeedDialAction,
    ToggleButtonGroup, ToggleButton
} from '@mui/material';
import {
    FilterList, CheckCircle, MyLocation, Phone, GetApp,
    ViewModule, ViewList, Add
} from '@mui/icons-material';

// Hooks
import { useAuth } from '../../../contexts/AuthContext';
import { useMetaData } from '../../../contexts/MetaDataContext';
import { useOperationsData } from '../hooks/useOperationsData';
import { useOperationsFilters } from '../hooks/useOperationsFilters';
import useOfflineSync from '../hooks/useOfflineSync';

// Componentes
import SearchBar from '../../../components/common/SearchBar/SearchBar';
import AssociateFilter from '../components/filters/AssociateFilter';
import OperationCard from '../components/cards/OperationCard';
import SwipeableCard from '../components/gestures/SwipeableCard';
import ConnectionStatus from '../components/offline/ConnectionStatus';
import PullToRefresh from '../components/offline/PullToRefresh';
import DetailsDrawer from '../components/modals/DetailsDrawer';
import ActionDrawer from '../components/common/ActionDrawer';
import CompletionModal from '../components/modals/CompletionModal';
import ParametersModal from '../components/modals/ParametersModal';
import OperationsTable from '../components/table/OperationsTable';

// Serviços
import { completeOperatorTask, validateTaskCompletion } from '../services/completionService';
import { exportToExcel } from '../services/exportService';
import { getUserNameByPk, getRemainingDaysColor, getColumnsForView } from '../utils/helpers';
import { addDocumentAnnex } from '../../../services/documentService';
import { notifySuccess, notifyError, notifyInfo } from '../../../components/common/Toaster/ThemedToaster';

const TabletView = () => {
    const { user: currentUser } = useAuth();
    const { metaData } = useMetaData();
    const { operationsData, associates, refetchOperations } = useOperationsData();
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
    const [actionDrawer, setActionDrawer] = useState(false);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [paramsDialogOpen, setParamsDialogOpen] = useState(false);
    const [completionNote, setCompletionNote] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [completionLoading, setCompletionLoading] = useState(false);

    // Permissões
    const canExecuteActions = (item) => {
        if (!item || !currentUser) return false;
        return Number(item.who) === Number(currentUser?.user_id);
    };

    // Helpers
    const getAddressString = (row) => {
        const parts = [
            row.address,
            row.door && `Porta: ${row.door}`,
            row.nut4,
            row.nut3,
            row.nut2,
            row.nut1
        ].filter(Boolean);
        return parts.join(', ');
    };

    // Filtros
    const getFilteredData = () => {
        if (!selectedView || !filteredData[selectedView]?.data) return [];

        let data = [...filteredData[selectedView].data];

        // Filtrar por utilizador
        if (showOnlyMyTasks) {
            data = data.filter(item => Number(item.who) === Number(currentUser?.user_id));
        }

        // Filtrar por pesquisa
        if (searchTerm) {
            data = data.filter(item =>
                item.regnumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.ts_entity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.phone?.includes(searchTerm) ||
                getAddressString(item).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Ordenar urgentes primeiro
        return data.sort((a, b) => {
            if (a.urgency === "1" && b.urgency !== "1") return -1;
            if (b.urgency === "1" && a.urgency !== "1") return 1;
            return 0;
        });
    };

    const displayData = getFilteredData();

    // Handlers
    const handleItemClick = (item) => {
        setSelectedItem(item);
        setDetailsDrawer(true);
    };

    const handleCompleteProcess = () => {
        const validation = validateTaskCompletion(selectedItem, currentUser);
        if (!validation.valid) {
            alert(validation.reason);
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

        // Notificar início
        notifyInfo("A processar conclusão...");

        try {
            // 1. Upload anexo
            if (attachment) {
                const formData = new FormData();
                formData.append('tb_document', selectedItem.pk);
                formData.append('files', attachment);
                formData.append('descr', 'Anexo da conclusão');

                await addDocumentAnnex(formData);
            }

            // 2. Completar tarefa
            if (!isOnline) {
                addAction('complete', { documentId: selectedItem.pk, note: completionNote });
                notifySuccess("Tarefa guardada offline");
            } else {
                await completeOperatorTask(selectedItem.pk, completionNote);
                notifySuccess("Tarefa concluída com sucesso");
            }

            await refetchOperations();

            setCompleteDialogOpen(false);
            setDetailsDrawer(false);
            setSelectedItem(null);
            setCompletionNote('');

        } catch (error) {
            console.error('Erro:', error);
            notifyError("Erro ao concluir tarefa");
        } finally {
            setCompletionLoading(false);
        }
    };

    const handleNavigate = (item) => {
        const target = item || selectedItem;
        if (!target) return;

        const address = encodeURIComponent(`${target.address}, ${target.nut2}`);
        window.open(`https://www.google.com/maps/search/?api=1&query=${address}`);
    };

    const handleCall = (item) => {
        const target = item || selectedItem;
        if (!target?.phone) return;
        window.location.href = `tel:${target.phone}`;
    };

    const renderGridView = () => (
        <Grid container spacing={3}>
            {displayData.map((item, index) => {
                const canAct = canExecuteActions(item);

                return (
                    <Grid item xs={12} sm={6} lg={4} key={index}>
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
                                metaData={metaData}
                            />
                        </SwipeableCard>
                    </Grid>
                );
            })}
        </Grid>
    );

    const renderTableView = () => (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <OperationsTable
                data={displayData}
                columns={getColumnsForView(selectedView, metaData)}
                orderBy="restdays"
                order="asc"
                onRequestSort={() => { }}
                expandedRows={{}}
                toggleRowExpand={() => { }}
                isRamaisView={isRamaisView}
                getRemainingDaysColor={getRemainingDaysColor}
                getAddressString={getAddressString}
                renderCell={(column, row) => {
                    if (column.format) return column.format(row[column.id], metaData);
                    if (isRamaisView && column.id === 'restdays') {
                        return (
                            <Box sx={{ color: getRemainingDaysColor(row[column.id]), fontWeight: 'bold' }}>
                                {Math.floor(row[column.id])} dias
                            </Box>
                        );
                    }
                    return row[column.id || column];
                }}
                onRowClick={handleItemClick}
            />
        </Paper>
    );

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", bgcolor: 'background.default' }}>
            <ConnectionStatus
                isOnline={isOnline}
                pendingActions={pendingActions}
                onSync={() => syncActions({
                    complete: (data) => completeOperatorTask(data.documentId, data.note)
                })}
                onDiscard={() => { }}
            />

            {/* Filtros */}
            <Paper sx={{ p: 2, m: 2, mb: 0, borderRadius: 3, boxShadow: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                        <AssociateFilter
                            associates={associates || []}
                            selectedAssociate={selectedAssociate}
                            onAssociateChange={handleAssociateChange}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <SearchBar
                            searchTerm={searchTerm}
                            onSearch={setSearchTerm}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={showOnlyMyTasks}
                                        onChange={(e) => setShowOnlyMyTasks(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="body2">Só os meus</Typography>
                                        <Chip
                                            size="small"
                                            label={displayData.filter(item => Number(item.who) === currentUser?.user_id).length}
                                            color={showOnlyMyTasks ? "primary" : "default"}
                                        />
                                    </Box>
                                }
                            />

                            <ToggleButtonGroup
                                value={viewMode}
                                exclusive
                                onChange={(e, newMode) => newMode && setViewMode(newMode)}
                                size="small"
                            >
                                <ToggleButton value="grid">
                                    <ViewModule />
                                </ToggleButton>
                                <ToggleButton value="table">
                                    <ViewList />
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', mx: 2, borderRadius: '12px 12px 0 0', mt: 2 }}>
                <Tabs
                    value={selectedView || false}
                    onChange={(e, newValue) => handleViewChange(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
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
                                            {displayData.length} {displayData.length === 1 ? 'pedido' : 'pedidos'}
                                        </Typography>
                                    </Box>
                                </Box>
                            }
                        />
                    ))}
                </Tabs>
            </Box>

            {/* Conteúdo */}
            <PullToRefresh onRefresh={() => console.log("Refresh")}>
                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                    {viewMode === 'grid' ? renderGridView() : renderTableView()}
                </Box>
            </PullToRefresh>

            {/* SpeedDial */}
            <SpeedDial
                ariaLabel="Acções rápidas"
                sx={{ position: 'fixed', bottom: 24, right: 24 }}
                icon={<Add />}
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
                    onClick={() => console.log("Filtros")}
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

            {/* Modals */}
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
                loading={completionLoading}
                document={selectedItem}
            />
        </Box>
    );
};

export default TabletView;