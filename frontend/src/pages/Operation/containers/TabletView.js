// frontend/src/pages/Operation/containers/TabletView.js
import React, { useEffect, useMemo, useState } from 'react';
import {
    Box, Paper, Typography, Grid, Tabs, Tab, Fab,
    ToggleButtonGroup, ToggleButton, Chip
} from '@mui/material';
import { FilterList, Refresh, GridView, ViewList } from '@mui/icons-material';

import { useOperationsData, useOperationsFilters, useScrollCompact } from '../hooks';
import { useAuth } from '../../../contexts/AuthContext';
import { useMetaData } from '../../../contexts/MetaDataContext';
import useOperationsStore from '../store/operationsStore';

import SearchBar from '../../../components/common/SearchBar/SearchBar';
import AssociateFilter from '../components/filters/AssociateFilter';
import OperationCard from '../components/cards/OperationCard';
import OperationListItem from '../components/list/OperationListItem';
import EmptyState from '../components/common/EmptyState';
import StatsBar from '../components/common/StatsBar';
import AdvancedFilterPanel from '../components/filters/AdvancedFilterPanel';
import FilterChips from '../components/filters/FilterChips';
import SortGroupSelectors from '../components/filters/SortGroupSelectors';
import GroupedContent from '../components/layout/GroupedContent';
import DetailsDrawer from '../components/modals/DetailsDrawer';
import CompletionModal from '../components/modals/CompletionModal';
import ParametersModal from '../components/modals/ParametersModal';

import { completeOperation, validateTaskCompletion } from '../services/api';
import { getUserNameByPk, getRemainingDaysColor } from '../utils/formatters';
import useFiltersStore from '../store/filtersStore';

const TabletView = () => {
    const { user: currentUser } = useAuth();
    const { metaData } = useMetaData();

    const store = useOperationsStore();
    const ui = store.getUI();
    const filters = store.getFilters();

    // Store de filtros avançados
    const filtersStore = useFiltersStore();
    const {
        filters: advancedFilters,
        panelOpen,
        setPanelOpen,
        getFilteredData,
        getActiveFiltersCount: getAdvancedFiltersCount
    } = filtersStore;

    // Estados locais
    const [activeFilters, setActiveFilters] = useState({
        urgency: false,
        today: false,
        myTasks: false
    });

    // Hook para scroll compacto
    const { isScrolled, handleScroll, resetScroll } = useScrollCompact(30);

    // Actions do store
    const {
        setSelectedItem,
        setDetailsDrawer,
        setCompleteDialogOpen,
        setParamsDialogOpen,
        setSearchTerm,
        setCompletionNote,
        setCompletionLoading,
        setSelectedAssociate,
        setSelectedView,
        setViewMode,
        closeAllModals
    } = store;

    // Hooks de dados
    const { operationsData, associates, refetchOperations } = useOperationsData();
    const { isFossaView, isRamaisView, filteredData, sortedViews } = useOperationsFilters(
        operationsData,
        filters.selectedAssociate
    );

    // Função para verificar se é hoje
    const isToday = (dateString) => {
        if (!dateString) return false;
        const today = new Date();
        const itemDate = new Date(dateString);
        return today.toDateString() === itemDate.toDateString();
    };

    // Dados filtrados - agora usando o store de filtros avançados
    const displayData = useMemo(() => {
        if (!filters.selectedView || !filteredData[filters.selectedView]?.data) {
            return [];
        }

        let data = [...filteredData[filters.selectedView].data];

        // Aplicar filtros do store de filtros avançados
        data = getFilteredData(data, currentUser?.user_id);

        // Filtro: pesquisa local (mantido do TabletView)
        if (ui.searchTerm) {
            const term = ui.searchTerm.toLowerCase();
            data = data.filter(item =>
                item.regnumber?.toLowerCase().includes(term) ||
                item.ts_entity?.toLowerCase().includes(term) ||
                item.phone?.includes(ui.searchTerm) ||
                item.address?.toLowerCase().includes(term)
            );
        }

        // Filtros rápidos locais (mantidos para compatibilidade)
        if (activeFilters.urgency) {
            data = data.filter(item => item.urgency === "1");
        }

        if (activeFilters.today) {
            data = data.filter(item => isToday(item.ts_created));
        }

        if (activeFilters.myTasks && currentUser?.user_id) {
            data = data.filter(item =>
                Number(item.who) === Number(currentUser.user_id)
            );
        }

        return data;
    }, [
        filteredData,
        filters.selectedView,
        ui.searchTerm,
        filtersStore.sortBy,    // ← Adicionar
        filtersStore.groupBy,   // ← Adicionar
        activeFilters,
        currentUser?.user_id,
        getFilteredData,
        advancedFilters
    ]);

    const groupedData = useMemo(() => {
        return filtersStore.getGroupedData(displayData, metaData);
    }, [displayData, metaData, filtersStore.groupBy]);

    // Helper functions
    const canExecuteActions = (item) =>
        item && Number(item.who) === Number(currentUser?.user_id);

    const getActiveFilterCount = () =>
        Object.values(activeFilters).filter(Boolean).length + getAdvancedFiltersCount();

    // Event handlers
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
        if (!ui.selectedItem || !ui.completionNote?.trim()) return;

        setCompletionLoading(true);
        try {
            await completeOperation(ui.selectedItem.pk, ui.completionNote);
            await refetchOperations();
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

    const handleFilterChange = (filterType, value) => {
        setActiveFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const handleClearFilters = () => {
        setActiveFilters({ urgency: false, today: false, myTasks: false });
        setSearchTerm('');
    };

    const handleViewModeChange = (event, newMode) => {
        if (newMode) {
            setViewMode(newMode);
        }
    };

    // Auto-select primeira vista e reset scroll
    useEffect(() => {
        if (sortedViews.length > 0 && !filters.selectedView) {
            setSelectedView(sortedViews[0][0]);
        }
        resetScroll();
    }, [sortedViews, filters.selectedView, setSelectedView, resetScroll]);

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Cabeçalho com filtros - COMPACTO EM SCROLL */}
            <Paper
                sx={{
                    p: isScrolled ? 1 : 2,
                    m: isScrolled ? 1 : 2,
                    mb: 0,
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    zIndex: 10,
                    boxShadow: isScrolled ? 4 : 1
                }}
            >
                <Grid container spacing={isScrolled ? 1 : 2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                        <AssociateFilter
                            associates={associates || []}
                            selectedAssociate={filters.selectedAssociate}
                            onAssociateChange={setSelectedAssociate}
                        />
                    </Grid>
                    {filters.selectedAssociate && (
                        <>
                            <Grid item xs={12} sm={5}>
                                <SearchBar
                                    searchTerm={ui.searchTerm}
                                    onSearch={setSearchTerm}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Box display="flex" alignItems="center" gap={1} justifyContent="flex-end">
                                    {/* Ordenação/Agrupamento compacto */}
                                    <SortGroupSelectors compact={true} />

                                    {/* Toggle vista */}
                                    <ToggleButtonGroup
                                        value={ui.viewMode}
                                        exclusive
                                        onChange={handleViewModeChange}
                                        size={isScrolled ? "small" : "medium"}
                                    >
                                        <ToggleButton value="cards">
                                            <GridView fontSize={isScrolled ? "small" : "medium"} />
                                        </ToggleButton>
                                        <ToggleButton value="list">
                                            <ViewList fontSize={isScrolled ? "small" : "medium"} />
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>
                            </Grid>
                        </>
                    )}
                </Grid>
            </Paper>

            {/* Tabs das vistas - COMPACTAS EM SCROLL */}
            {filters.selectedAssociate && sortedViews.length > 0 && (
                <Box sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    mx: isScrolled ? 1 : 2,
                    mt: isScrolled ? 0.5 : 2,
                    transition: 'all 0.3s ease'
                }}>
                    <Tabs
                        value={filters.selectedView || false}
                        onChange={(e, newValue) => setSelectedView(newValue)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            '& .MuiTab-root': {
                                minHeight: isScrolled ? 40 : 48,
                                fontSize: isScrolled ? '0.8rem' : '0.875rem',
                                py: isScrolled ? 0.5 : 1,
                                transition: 'all 0.3s ease'
                            }
                        }}
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

            {/* Stats Bar - MAIS COMPACTA EM SCROLL */}
            {filters.selectedAssociate && filters.selectedView && displayData.length > 0 && (
                <StatsBar
                    data={displayData}
                    activeFilters={activeFilters}
                    currentUserId={currentUser?.user_id}
                    viewMode={ui.viewMode}
                    isCompact={isScrolled}
                />
            )}

            {/* Conteúdo principal - COM SCROLL HANDLER */}
            {filters.selectedAssociate && filters.selectedView ? (
                <Box
                    sx={{ flexGrow: 1, overflow: 'auto', p: isScrolled ? 1 : 2 }}
                    onScroll={handleScroll}
                >
                    {displayData.length > 0 ? (
                        <GroupedContent
                            data={groupedData}
                            viewMode={ui.viewMode}
                            metaData={metaData}
                            onItemClick={handleItemClick}
                            onNavigate={handleNavigate}
                            onCall={handleCall}
                            getUserNameByPk={getUserNameByPk}
                            getRemainingDaysColor={getRemainingDaysColor}
                            getAddressString={(row) => `${row.address}, ${row.nut2}`}
                            canExecuteActions={canExecuteActions}
                            isRamaisView={isRamaisView}
                        />
                    ) : (
                        <EmptyState
                            type="no-results"
                            hasFilters={getActiveFilterCount() > 0 || ui.searchTerm}
                            onClearFilters={handleClearFilters}
                            onRefresh={refetchOperations}
                        />
                    )}
                </Box>
            ) : (
                <Box sx={{
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 4
                }}>
                    <EmptyState
                        type="no-filters"
                        onRefresh={refetchOperations}
                    />
                </Box>
            )}

            {/* FABs fixos */}
            <Box sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                zIndex: 1000
            }}>
                {/* Refrescar */}
                <Fab
                    color="primary"
                    onClick={refetchOperations}
                    sx={{ boxShadow: 4 }}
                >
                    <Refresh />
                </Fab>

                {/* Filtros */}
                <Fab
                    color={getActiveFilterCount() > 0 ? "secondary" : "default"}
                    onClick={() => setPanelOpen(true)}
                    sx={{ boxShadow: 4, position: 'relative' }}
                >
                    <FilterList />
                    {getActiveFilterCount() > 0 && (
                        <Chip
                            size="small"
                            label={getActiveFilterCount()}
                            color="error"
                            sx={{
                                position: 'absolute',
                                top: -8,
                                right: -8,
                                minWidth: 20,
                                height: 20
                            }}
                        />
                    )}
                </Fab>
            </Box>

            {/* Modais */}
            <AdvancedFilterPanel
                open={panelOpen}
                onClose={() => setPanelOpen(false)}
                associates={associates}
                users={metaData?.who || []}
                serviceTypes={[...new Set(
                    Object.values(operationsData)
                        .flatMap(view => view?.data || [])
                        .map(item => item.tipo)
                        .filter(Boolean)
                )]}
                locations={{
                    districts: [...new Set(
                        Object.values(operationsData)
                            .flatMap(view => view?.data || [])
                            .map(item => item.nut1)
                            .filter(Boolean)
                    )],
                    municipalities: [...new Set(
                        Object.values(operationsData)
                            .flatMap(view => view?.data || [])
                            .map(item => item.nut2)
                            .filter(Boolean)
                    )],
                    parishes: [...new Set(
                        Object.values(operationsData)
                            .flatMap(view => view?.data || [])
                            .map(item => item.nut3)
                            .filter(Boolean)
                    )]
                }}
            />

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
};

export default TabletView;