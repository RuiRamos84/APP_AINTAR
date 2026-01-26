import React, { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    CircularProgress,
    Tabs,
    Tab,
    useTheme,
    TextField,
    InputAdornment,
    Fab
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operationService } from '../services/operationService';
import metadataService from '@/services/metadataService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import OperationCard from '../components/OperationCard';
import AssociateFilter from '../components/AssociateFilter';
import DetailsDrawer from '../components/DetailsDrawer';
import CompletionModal from '../components/CompletionModal';

const TasksPage = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    // State
    const [selectedAssociate, setSelectedAssociate] = useState('all');
    const [selectedView, setSelectedView] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // UI State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Queries
    const { data: operationsData, isLoading, error } = useQuery({
        queryKey: ['operationsData'],
        queryFn: async () => {
            const data = await operationService.fetchOperationsData();
            console.log('[TasksPage] Raw Operations Data:', data);
            return data;
        },
        staleTime: 1000 * 60 * 5 // 5 mins
    });

    const { data: metaData } = useQuery({
        queryKey: ['metadata'],
        queryFn: metadataService.fetchMetaData,
        staleTime: 1000 * 60 * 30
    });

    // Derived State
    const associates = useMemo(() => {
        if (!operationsData) return ['all'];
        const uniqueAssociates = new Set(['all']);
        Object.values(operationsData).forEach(item => {
            if (item.data) {
                item.data.forEach(d => {
                    if (d.ts_associate && typeof d.ts_associate === 'string' && isNaN(Number(d.ts_associate))) {
                        uniqueAssociates.add(d.ts_associate);
                    }
                });
            }
        });
        return Array.from(uniqueAssociates);
    }, [operationsData]);

    const filteredData = useMemo(() => {
        if (!operationsData) return {};
        
        // Logic ported from useOperationsFiltering
        const result = {};
        const specificViews = [
            "vbr_document_ramais01",
            "vbr_document_caixas01",
            "vbr_document_desobstrucao01",
            "vbr_document_pavimentacao01",
            "vbr_document_rede01",
        ];

        const municipalityFossaMap = {
            "Município de Carregal do Sal": "vbr_document_fossa02",
            "Município de Santa Comba Dão": "vbr_document_fossa03",
            "Município de Tábua": "vbr_document_fossa04",
            "Município de Tondela": "vbr_document_fossa05",
        };

        if (selectedAssociate === "all") {
            if (operationsData["vbr_document_fossa01"]) {
                result["vbr_document_fossa01"] = operationsData["vbr_document_fossa01"];
            }
            specificViews.forEach((view) => {
                if (operationsData[view]) {
                    result[view] = operationsData[view];
                }
            });
        } else {
            const fossaKey = municipalityFossaMap[selectedAssociate];
            if (fossaKey && operationsData[fossaKey]) {
                result[fossaKey] = operationsData[fossaKey];
            }

            specificViews.forEach((view) => {
                if (operationsData[view]) {
                    const filteredItems = operationsData[view].data.filter(
                        (item) => item.ts_associate === selectedAssociate
                    );
                    if (filteredItems.length > 0) {
                        result[view] = {
                            ...operationsData[view],
                            data: filteredItems,
                            total: filteredItems.length,
                        };
                    }
                }
            });
        }
        console.log('[TasksPage] Filtered Data:', result);
        return result;
    }, [operationsData, selectedAssociate]);

    const sortedViews = useMemo(() => {
        return Object.entries(filteredData).sort((a, b) => b[1].total - a[1].total);
    }, [filteredData]);

    // Auto-select view
    useEffect(() => {
        if ((!selectedView || !filteredData[selectedView]) && sortedViews.length > 0) {
            setSelectedView(sortedViews[0][0]);
        }
    }, [filteredData, selectedView, sortedViews]);

    // Items to display
    const displayItems = useMemo(() => {
        if (!selectedView || !filteredData[selectedView]) return [];
        let items = filteredData[selectedView].data;

        if (searchTerm) {
            const lowerInfo = searchTerm.toLowerCase();
            items = items.filter(item => 
                item.regnumber?.toLowerCase().includes(lowerInfo) ||
                item.ts_entity?.toLowerCase().includes(lowerInfo) ||
                (item.address && item.address.toLowerCase().includes(lowerInfo))
            );
        }

        return items;
    }, [selectedView, filteredData, searchTerm]);

    const getRemainingDaysColor = (days) => {
        if (days < 0) return theme.palette.error.main;
        if (days < 3) return theme.palette.warning.main;
        return theme.palette.success.main;
    };

    // Actions
    const handleOpenDetails = (item) => {
        setSelectedItem(item);
        setDrawerOpen(true);
    };

    const handleOpenCompletion = (item) => {
        setSelectedItem(item);
        setModalOpen(true);
        // Drawer might remain open or close, let's close it for focus
        setDrawerOpen(false); 
    };

    const handleNavigate = (item) => {
        const target = item || selectedItem;
        if (!target) return;
        if (target.latitude && target.longitude) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`);
        } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${target.address}, ${target.postal}`)}`);
        }
    };

    const handleCall = (item) => {
         const target = item || selectedItem;
         if (target?.phone) window.open(`tel:${target.phone}`);
    };

    // Mutation
    const completeTaskMutation = useMutation({
        mutationFn: (data) => operationService.completeOperation(selectedItem.pk, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['operationsData']);
            setModalOpen(false);
            setSelectedItem(null);
        },
        onError: (err) => {
            console.error(err);
            // Handle error toast
        }
    });

    const handleConfirmCompletion = ({ note, files }) => {
        const fd = new FormData();
        fd.append('notes', note); 
        // We might need 'step' or 'action' depending on backend requirement.
        // Assuming minimal payload is enough or backend handles it based on pk context.
        
        files.forEach(f => fd.append('files', f.file));
        
        completeTaskMutation.mutate(fd);
    };

    const canAct = (item) => {
        // user.id vs item.who (which is string or int)
        // Ensure to handle cases where user is null or item.who is null
        if (!user || !user.id || !item || !item.who) return false;
        return String(item.who) === String(user.id);
    };

    return (
        <ModulePage
            title="Minhas Tarefas"
            subtitle="Gestão de tarefas operacionais diárias"
            icon={AssignmentIcon}
            color="#2196f3"
            breadcrumbs={[
                { label: 'Operação', path: '/tasks' },
                { label: 'Minhas Tarefas', path: '/tasks' },
            ]}
            actions={
                <Fab 
                    color="primary" 
                    size="small" 
                    onClick={() => queryClient.invalidateQueries(['operationsData'])}
                >
                    <RefreshIcon />
                </Fab>
            }
        >
            {isLoading && (
                <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
            )}

            {error && (
                <Typography color="error">Erro ao carregar tarefas: {error.message}</Typography>
            )}

            {!isLoading && !error && Object.keys(filteredData).length === 0 && (
                <Box textAlign="center" py={8}>
                     <Typography variant="h6" color="text.secondary">Nenhuma tarefa disponível.</Typography>
                </Box>
            )}

            {!isLoading && !error && Object.keys(filteredData).length > 0 && (
                <>
                    {/* Filters */}
                    <Box sx={{ mb: 3 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, md: 8 }}>
                                <AssociateFilter 
                                    associates={associates}
                                    selectedAssociate={selectedAssociate}
                                    onAssociateChange={setSelectedAssociate}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField 
                                    fullWidth
                                    placeholder="Pesquisar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                                        sx: { bgcolor: 'background.paper' }
                                    }}
                                    size="small"
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Views Tabs */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                        <Tabs 
                            value={selectedView || false}
                            onChange={(e, val) => setSelectedView(val)}
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            {sortedViews.map(([key, value]) => (
                                <Tab 
                                    key={key} 
                                    value={key} 
                                    label={`${value.name} (${value.total})`}
                                />
                            ))}
                        </Tabs>
                    </Box>

                    {/* Grid */}
                    <Grid container spacing={3}>
                        {displayItems.map((item) => (
                            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={item.pk}>
                                <OperationCard
                                    item={item}
                                    isUrgent={item.urgency === "1"}
                                    canAct={canAct(item)}
                                    getRemainingDaysColor={getRemainingDaysColor}
                                    onClick={() => handleOpenDetails(item)}
                                    onNavigate={() => handleNavigate(item)}
                                    onCall={() => handleCall(item)}
                                    onComplete={() => handleOpenCompletion(item)}
                                    getAddressString={(i) => `${i.address || ''}, ${i.postal || ''}`}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}

            <DetailsDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                item={selectedItem}
                canExecuteActions={selectedItem && canAct(selectedItem)}
                onNavigate={handleNavigate}
                onCall={handleCall}
                onComplete={handleOpenCompletion}
                getAddressString={(i) => `${i.address || ''}, ${i.postal || ''}`}
            />

            <CompletionModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onConfirm={handleConfirmCompletion}
                loading={completeTaskMutation.isPending}
            />
        </ModulePage>
    );
};

export default TasksPage;
