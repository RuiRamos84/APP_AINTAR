// frontend/src/pages/Operation/containers/TabletView.js
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, Grid, FormControlLabel, Checkbox, Chip, Tabs, Tab } from '@mui/material';

import { useOperationsData, useOperationsFilters } from '../hooks';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useAuth } from '../../../contexts/AuthContext';
import { useMetaData } from '../../../contexts/MetaDataContext';
import useOperationsStore from '../store/operationsStore';

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

import { completeOperation, validateTaskCompletion } from '../services/api';
import { getUserNameByPk, getRemainingDaysColor } from '../utils/formatters';
import { OPERATION_CONSTANTS } from '../utils/constants';

const TabletView = () => {
    const { user: currentUser } = useAuth();
    const { metaData } = useMetaData();

    const store = useOperationsStore();
    const ui = store.ui || {};
    const filters = store.filters || {};

    // Filtros QuickActions
    const [quickFilters, setQuickFilters] = useState({
        urgency: false,
        today: false,
        nearby: false,
        sortBy: 'urgency'
    });

    // Geolocalização e raio
    const [userLocation, setUserLocation] = useState(null);
    const [radiusKm, setRadiusKm] = useState(10);
    const [geocodeCache] = useState(new Map());

    // Geocoding OpenStreetMap
    const geocodeAddress = async (address) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=pt&limit=1`
            );
            const data = await response.json();
            return data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
        } catch (error) {
            console.warn('Geocoding falhou:', error);
            return null;
        }
    };

    // Cache coordenadas
    const getItemCoordinates = async (item) => {
        const key = `${item.address}, ${item.nut3}, ${item.nut2}`;

        if (geocodeCache.has(key)) {
            return geocodeCache.get(key);
        }

        const coords = await geocodeAddress(key);
        geocodeCache.set(key, coords);
        return coords;
    };

    // Estado para dados geocodificados
    const [geocodedData, setGeocodedData] = useState([]);
    const [isGeocoding, setIsGeocoding] = useState(false);



    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => console.warn('Geolocalização indisponível:', error)
            );
        }
    }, []);

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
        closeAllModals = () => { }
    } = store;

    // Data
    const { operationsData, associates, refetchOperations } = useOperationsData();
    const { isFossaView, isRamaisView, filteredData, sortedViews } = useOperationsFilters(
        operationsData,
        filters.selectedAssociate
    );

    // Offline
    const { isOnline, pendingActions, isSyncing, addAction, syncActions, clearPending } = useOfflineSync();

    // Função para verificar se é hoje
    const isToday = (dateString) => {
        const today = new Date();
        const itemDate = new Date(dateString);
        return today.toDateString() === itemDate.toDateString();
    };

    // Função para calcular distância (Haversine)
    const calculateDistance = (pos1, pos2) => {
        if (!pos1 || !pos2) return Infinity;

        const R = 6371; // Raio da Terra em km
        const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
        const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Função para verificar proximidade geográfica por níveis
    const isNearbyGeographic = (item, userProfile) => {
        if (!userProfile) return false;

        // Níveis de proximidade (ordem de prioridade)
        if (userProfile.nut4 && item.nut4 === userProfile.nut4) return true; // Localidade
        if (userProfile.nut3 && item.nut3 === userProfile.nut3) return true; // Freguesia  
        if (userProfile.nut2 && item.nut2 === userProfile.nut2) return true; // Concelho
        if (userProfile.nut1 && item.nut1 === userProfile.nut1) return true; // Distrito

        return false;
    };

    // Hook para geocodificar quando filtro nearby activado
    useEffect(() => {
        if (!quickFilters.nearby || !filteredData[filters.selectedView]?.data) {
            setGeocodedData([]);
            return;
        }

        const geocodeNearbyData = async () => {
            setIsGeocoding(true);
            const data = filteredData[filters.selectedView].data;

            const processed = await Promise.all(
                data.map(async (item) => {
                    // Geografia administrativa primeiro
                    if (isNearbyGeographic(item, currentUser)) {
                        return { ...item, _nearby: true, _source: 'admin' };
                    }

                    // Geolocalização
                    if (userLocation) {
                        const coords = await getItemCoordinates(item);
                        if (coords) {
                            const distance = calculateDistance(userLocation, coords);
                            if (distance <= radiusKm) {
                                return { ...item, _nearby: true, _distance: distance, _source: 'gps' };
                            }
                        }
                    }

                    return { ...item, _nearby: false };
                })
            );

            setGeocodedData(processed.filter(item => item._nearby));
            setIsGeocoding(false);
        };

        geocodeNearbyData();
    }, [quickFilters.nearby, filteredData, filters.selectedView, userLocation, radiusKm, currentUser]);

    // DADOS COM FILTROS APLICADOS
    const displayData = useMemo(() => {
        if (!filters.selectedView || !filteredData[filters.selectedView]?.data) {
            return [];
        }

        // Usar dados geocodificados se filtro nearby activo
        let data = quickFilters.nearby ? geocodedData : filteredData[filters.selectedView].data;

        // Filtro: só os meus
        if (ui.showOnlyMyTasks && currentUser?.user_id) {
            data = data.filter(item => Number(item.who) === Number(currentUser.user_id));
        }

        // Filtro: pesquisa
        if (ui.searchTerm) {
            const term = ui.searchTerm.toLowerCase();
            data = data.filter(item =>
                item.regnumber?.toLowerCase().includes(term) ||
                item.ts_entity?.toLowerCase().includes(term) ||
                item.phone?.includes(ui.searchTerm) ||
                item.address?.toLowerCase().includes(term)
            );
        }

        // QUICK FILTERS

        // Filtro: só urgentes
        if (quickFilters.urgency) {
            data = data.filter(item => item.urgency === "1");
        }

        // Filtro: só hoje
        if (quickFilters.today) {
            data = data.filter(item =>
                item.ts_created && isToday(item.ts_created)
            );
        }

        // Filtro: próximos - removido (agora tratado no useEffect)

        // ORDENAÇÃO
        return [...data].sort((a, b) => {
            // Urgentes sempre primeiro
            if (a.urgency === "1" && b.urgency !== "1") return -1;
            if (b.urgency === "1" && a.urgency !== "1") return 1;

            // Ordenação secundária
            if (quickFilters.sortBy === 'date') {
                return new Date(b.ts_created || 0) - new Date(a.ts_created || 0);
            }

            return 0; // manter ordem urgência
        });
    }, [
        filteredData,
        filters.selectedView,
        ui.showOnlyMyTasks,
        ui.searchTerm,
        currentUser?.user_id,
        quickFilters
    ]);

    const canExecuteActions = (item) => item && Number(item.who) === Number(currentUser?.user_id);

    // Handler dos filtros rápidos
    const handleQuickFilterChange = (filterType, value) => {
        if (filterType === 'clear') {
            setQuickFilters({
                urgency: false,
                today: false,
                nearby: false,
                sortBy: 'urgency'
            });
            return;
        }

        setQuickFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    // Handlers existentes
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
                await completeOperation(ui.selectedItem.pk, ui.completionNote);
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
            complete: (data) => completeOperation(data.documentId, data.note)
        });
        await refetchOperations();
    };

    useEffect(() => {
        if (sortedViews.length > 0 && !filters.selectedView) {
            setSelectedView(sortedViews[0][0]);
        } else if (sortedViews.length === 0) {
            setSelectedView(null);
        }
    }, [sortedViews, setSelectedView]);

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <ConnectionStatus
                isOnline={isOnline}
                pendingActions={pendingActions}
                isSyncing={isSyncing}
                onSync={handleSync}
                onDiscard={clearPending}
            />

            <Paper sx={{ p: 2, m: 2, mb: 0, borderRadius: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                        <AssociateFilter
                            associates={associates || []}
                            selectedAssociate={filters.selectedAssociate}
                            onAssociateChange={setSelectedAssociate}
                        />
                    </Grid>
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

            {filters.selectedAssociate && filters.selectedView ? (
                <PullToRefresh onRefresh={refetchOperations}>
                    <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                        <Grid container spacing={3}>
                            {displayData.map((item, index) => (
                                <Grid item xs={12} sm={6} lg={4} key={item.pk || index}>
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

            {filters.selectedAssociate && filters.selectedView && (
                <QuickActionsFab
                    filters={quickFilters}
                    onFilterChange={handleQuickFilterChange}
                    radiusKm={radiusKm}
                    onRadiusChange={setRadiusKm}
                    onRefresh={refetchOperations}
                />
            )}

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