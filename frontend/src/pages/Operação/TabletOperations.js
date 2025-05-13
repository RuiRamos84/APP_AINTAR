import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Box, Paper, Typography, Button, Grid, Fab,
    SwipeableDrawer, List, ListItem, ListItemButton, ListItemText,
    ListItemIcon, IconButton, Divider, Card, CardContent,
    CardActions, Chip, Tooltip, ToggleButtonGroup,
    ToggleButton, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Alert, Skeleton, Tabs, Tab, FormControlLabel, Checkbox, LinearProgress,
    Stack,
    SpeedDial,
    SpeedDialIcon,
    SpeedDialAction,
} from "@mui/material";
import {
    FilterList, Send, Attachment, Edit, Assignment,
    LocationOn, Phone, EventNote, AccessTime, CheckCircle,
    FileDownload, SwipeRight, Sort, ViewList, ViewModule,
    MyLocation, DirectionsCar, Close, Refresh,
    CloudOff, ChevronLeft, ChevronRight, Lock, LockOpen, CalendarToday,
    TouchApp,
    MoreVert,
} from "@mui/icons-material";
import CircularProgress from '@mui/material/CircularProgress';
import SimpleParametersEditor from './SimpleParametersEditor';
import AssociateFilter from "./AssociateFilter";
import OperationsTable from "./OperationsTable";
import { getColumnsForView, getRemainingDaysColor } from "./operationsHelpers";
import { exportToExcel } from "./exportService";
import { getDocumentTypeParams, addDocumentStep } from "../../services/documentService";
import { notifySuccess, notifyError } from "../../components/common/Toaster/ThemedToaster";
import { useMetaData } from '../../contexts/MetaDataContext';
import { useInView } from 'react-intersection-observer';
import { getUserNameByPk } from "./operationsHelpers";
import { useAuth } from '../../contexts/AuthContext';


// Componente para swipe com gestos aprimorado
const SwipeableCard = ({ children, onSwipeRight, onSwipeLeft, onSwipeUp, minDistance = 50 }) => {
    const [touchStart, setTouchStart] = useState(null);
    const [touchCurrent, setTouchCurrent] = useState(null);
    const [swiping, setSwiping] = useState(false);

    const onTouchStart = (e) => {
        setSwiping(false);
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchMove = (e) => {
        if (!touchStart) return;

        setTouchCurrent({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });

        const deltaX = Math.abs(e.targetTouches[0].clientX - touchStart.x);
        const deltaY = Math.abs(e.targetTouches[0].clientY - touchStart.y);

        // Se movimento horizontal é maior que vertical, permitir swipe
        if (deltaX > deltaY && deltaX > 10) {
            e.preventDefault();
            setSwiping(true);
        }
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchCurrent) return;

        const deltaX = touchStart.x - touchCurrent.x;
        const deltaY = touchStart.y - touchCurrent.y;
        const isLeftSwipe = deltaX > minDistance;
        const isRightSwipe = deltaX < -minDistance;
        const isUpSwipe = deltaY > minDistance;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (isRightSwipe && onSwipeRight) {
                onSwipeRight();
            } else if (isLeftSwipe && onSwipeLeft) {
                onSwipeLeft();
            }
        } else if (isUpSwipe && onSwipeUp) {
            onSwipeUp();
        }

        setTouchStart(null);
        setTouchCurrent(null);
        setSwiping(false);
    };

    return (
        <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
                transform: swiping && touchCurrent && touchStart
                    ? `translateX(${(touchCurrent.x - touchStart.x) * 0.5}px)`
                    : 'translateX(0px)',
                transition: swiping ? 'none' : 'transform 0.3s ease'
            }}
        >
            {children}
        </div>
    );
};

// Componente para Pull-to-Refresh
const PullToRefresh = ({ onRefresh, children }) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [touchStartY, setTouchStartY] = useState(0);
    const containerRef = useRef(null);

    const handleTouchStart = (e) => {
        if (containerRef.current?.scrollTop === 0) {
            setTouchStartY(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e) => {
        if (containerRef.current?.scrollTop === 0 && touchStartY) {
            const deltaY = e.touches[0].clientY - touchStartY;
            if (deltaY > 0) {
                e.preventDefault();
                setPullDistance(Math.min(deltaY, 100));
            }
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance > 50) {
            setRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setRefreshing(false);
            }
        }
        setPullDistance(0);
        setTouchStartY(0);
    };

    return (
        <Box
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            sx={{
                position: 'relative',
                overflow: 'auto',
                height: '100%'
            }}
        >
            {pullDistance > 0 && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transform: `translateX(-50%) translateY(${pullDistance - 40}px)`,
                        zIndex: 1
                    }}
                >
                    {refreshing ? (
                        <CircularProgress size={24} />
                    ) : (
                        <Refresh sx={{
                            transform: `rotate(${pullDistance * 3.6}deg)`,
                            transition: 'transform 0.1s'
                        }} />
                    )}
                </Box>
            )}
            <Box
                sx={{
                    transform: `translateY(${pullDistance > 0 ? pullDistance : 0}px)`,
                    transition: refreshing || pullDistance === 0 ? 'transform 0.3s ease' : 'none'
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

// Componente para FABs de ação rápida
const QuickActionsFab = ({ selectedItem, onNavigate, onCall, onComplete, onFilter, currentUserPk }) => (
    <Box sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
    }}>
        <Fab
            color="default"
            size="medium"
            onClick={onFilter}
            sx={{ boxShadow: 4 }}
        >
            <FilterList />
        </Fab>
        {selectedItem && (
            <>
                <Fab
                    color="secondary"
                    size="medium"
                    onClick={() => onNavigate(selectedItem)}
                    sx={{ boxShadow: 4 }}
                >
                    <MyLocation />
                </Fab>
                {selectedItem.phone && (
                    <Fab
                        color="info"
                        size="medium"
                        onClick={() => onCall(selectedItem)}
                        sx={{ boxShadow: 4 }}
                    >
                        <Phone />
                    </Fab>
                )}
                {/* Só mostra o FAB de conclusão se o pedido está atribuído ao utilizador atual */}
                {Number(selectedItem.who) === currentUserPk && (
                    <Fab
                        color="success"
                        size="medium"
                        onClick={() => onComplete(selectedItem)}
                        sx={{ boxShadow: 4 }}
                    >
                        <CheckCircle />
                    </Fab>
                )}
            </>
        )}
    </Box>
);

// Componente para status offline/online aprimorado
const ConnectionStatus = ({ isOnline, pendingActions, onSync, onDiscard }) => {
    if (!isOnline || pendingActions.length > 0) {
        return (
            <Box
                sx={{
                    position: 'sticky',
                    top: 0,
                    bgcolor: isOnline ? 'warning.main' : 'error.main',
                    color: isOnline ? 'warning.contrastText' : 'error.contrastText',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    zIndex: 100
                }}
            >
                <CloudOff fontSize="small" />
                <Typography variant="body2">
                    {isOnline
                        ? `${pendingActions.length} operações pendentes`
                        : "Modo Offline"}
                </Typography>
                {isOnline && (
                    <>
                        <Button
                            size="small"
                            variant="outlined"
                            sx={{ ml: 2, color: 'inherit', borderColor: 'inherit' }}
                            onClick={onSync}
                        >
                            Sincronizar
                        </Button>
                        <IconButton
                            size="small"
                            sx={{ color: 'inherit' }}
                            onClick={onDiscard}
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    </>
                )}
            </Box>
        );
    }
    return null;
};

const TabletOperations = ({
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
    getAddressString
}) => {
    // Estados para interface
    const [viewMode, setViewMode] = useState('grid');
    const [detailsDrawer, setDetailsDrawer] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [actionDrawer, setActionDrawer] = useState(false);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [paramsDialogOpen, setParamsDialogOpen] = useState(false);
    const [filterDrawer, setFilterDrawer] = useState(false);
    const [metaData, setMetaData] = useState(null);
    const [completionNote, setCompletionNote] = useState('');
    const [paramsLoading, setParamsLoading] = useState(false);
    const [cardSwiping, setCardSwiping] = useState({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [splitScreen, setSplitScreen] = useState(false);
    const [pendingActions, setPendingActions] = useState([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [searchValue, setSearchValue] = useState('');
    const firstViewKey = sortedViews[0]?.[0] || null;
    const currentView = selectedView || firstViewKey;
    const { user: currentUser } = useAuth(); 

    const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);

    // Filtrar dados baseado na checkbox
    const getFilteredByUser = () => {
        if (!showOnlyMyTasks) return sortedData;

        return sortedData.filter(item =>
            Number(item.who) === Number(currentUser?.user_id)
        );
    };

    const renderCell = (column, row) => {
        if (column.format) {
            return column.format(row[column.id], globalMetaData);
        }

        if (isRamaisView && column.id === 'restdays') {
            return (
                <Box sx={{
                    color: getRemainingDaysColor(row[column.id]),
                    fontWeight: 'bold'
                }}>
                    {Math.floor(row[column.id])} dias
                </Box>
            );
        }

        return row[column.id || column];
    };

    const displayData = getFilteredByUser();

    // Referência para o último elemento para lazy loading
    const { ref: lastItemRef, inView } = useInView({
        threshold: 0.1,
    });

    // Função para verificar se o utilizador pode executar ações
    const canExecuteActions = (item) => {
        console.log("Verificando ações para:", item.who);
        console.log("Utilizador atual:", currentUser?.user_id);
        return Number(item.who) === Number(currentUser?.user_id) || item.who === null;
    };

    const { metaData: globalMetaData } = useMetaData();

    // Detectar split screen
    useEffect(() => {
        const checkSplitScreen = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            if (width > height && width < 1024) {
                setSplitScreen(true);
            } else {
                setSplitScreen(false);
            }
        };

        window.addEventListener('resize', checkSplitScreen);
        checkSplitScreen();

        return () => window.removeEventListener('resize', checkSplitScreen);
    }, []);

    // Monitorar status da conexão
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Carregar ações pendentes
    useEffect(() => {
        const loadPendingActions = () => {
            try {
                const cached = localStorage.getItem('operations_pendingActions');
                if (cached) {
                    setPendingActions(JSON.parse(cached));
                }
            } catch (error) {
                console.error('Erro ao carregar ações pendentes:', error);
            }
        };

        loadPendingActions();
    }, []);

    // Carregar mais itens quando chegar ao final
    useEffect(() => {
        if (inView && !isRefreshing) {
            setIsRefreshing(true);
            // Simular carregamento adicional - substituir por API real
            setTimeout(() => {
                // TODO: Implementar carregamento de mais dados da API
                setIsRefreshing(false);
            }, 1000);
        }
    }, [inView]);

    // Carregar metadados quando um item de fossa é selecionado
    useEffect(() => {
        if (selectedItem && isFossaView) {
            fetchMetaData();
        }
    }, [selectedItem, isFossaView]);

    const fetchMetaData = async () => {
        if (!selectedItem?.pk) return;

        setParamsLoading(true);
        try {
            const response = await getDocumentTypeParams(selectedItem.pk);
            setMetaData({
                ...response,
                etar: globalMetaData?.etar || [],
                who: globalMetaData?.who || [],
                payment_method: globalMetaData?.payment_method || []
            });
        } catch (error) {
            console.error("Erro ao buscar metadados:", error);
            notifyError("Erro ao carregar informações do pedido");
        } finally {
            setParamsLoading(false);
        }
    };

    // Manipuladores de ações
    const handleCompleteProcess = () => {
        if (isFossaView && selectedItem) {
            setParamsDialogOpen(true);
        }
    };

    const handleParamsSaved = () => {
        setParamsDialogOpen(false);
        setCompleteDialogOpen(true);
    };

    const handleAddFinalStep = async () => {
        try {
            const stepData = {
                tb_document: selectedItem.pk,
                what: "4", // ID do estado de conclusão
                who: "81", // ID do usuário administrativo
                memo: completionNote || "Serviço concluído pelo operador de terreno"
            };

            // Tentar executar online, ou guardar para sincronização posterior
            try {
                await addDocumentStep(selectedItem.pk, stepData);
                notifySuccess("Pedido concluído com sucesso!");
            } catch (error) {
                // Guardar para sincronização offline
                const newPendingAction = {
                    action: 'addDocumentStep',
                    params: { documentId: selectedItem.pk, stepData },
                    timestamp: Date.now(),
                    id: Date.now() + Math.random().toString(36).substring(2, 9)
                };

                const updatedPendingActions = [...pendingActions, newPendingAction];
                setPendingActions(updatedPendingActions);
                localStorage.setItem('operations_pendingActions', JSON.stringify(updatedPendingActions));

                notifySuccess("Pedido guardado para sincronização posterior");
            }

            setCompleteDialogOpen(false);
            setDetailsDrawer(false);
        } catch (error) {
            notifyError("Erro ao concluir o pedido");
            console.error("Erro ao concluir pedido:", error);
        }
    };

    // Manipuladores de UI
    const handleViewModeChange = (event, newViewMode) => {
        if (newViewMode !== null) {
            setViewMode(newViewMode);
        }
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
        setDetailsDrawer(true);
    };

    const handleActionClick = () => {
        setActionDrawer(true);
    };

    const handleAddStep = () => {
        console.log("Adicionar passo para:", selectedItem?.regnumber);
        setActionDrawer(false);
    };

    const handleAddAnnex = () => {
        console.log("Adicionar anexo para:", selectedItem?.regnumber);
        setActionDrawer(false);
    };

    const handleMarkComplete = () => {
        handleCompleteProcess();
        setActionDrawer(false);
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
        if (!target) return;

        if (target.phone) {
            window.location.href = `tel:${target.phone}`;
        }
    };

    // Manipuladores de swipe
    const handleSwipeRight = (index) => {
        setCardSwiping(prev => ({ ...prev, [index]: 'right' }));
        setTimeout(() => {
            setCardSwiping(prev => ({ ...prev, [index]: null }));
            handleNavigate(sortedData[index]);
        }, 300);
    };

    const handleSwipeLeft = (index) => {
        setCardSwiping(prev => ({ ...prev, [index]: 'left' }));
        setTimeout(() => {
            setCardSwiping(prev => ({ ...prev, [index]: null }));
            if (isFossaView) {
                setSelectedItem(sortedData[index]);
                handleCompleteProcess();
            }
        }, 300);
    };

    const handleSwipeUp = (index) => {
        setSelectedItem(sortedData[index]);
        setDetailsDrawer(true);
    };

    // Sincronização offline
    const handleSyncPendingActions = async () => {
        if (!isOnline || pendingActions.length === 0) return;

        let successCount = 0;
        const remainingActions = [];

        for (const action of pendingActions) {
            try {
                if (action.action === 'addDocumentStep') {
                    await addDocumentStep(
                        action.params.documentId,
                        action.params.stepData
                    );
                    successCount++;
                }
            } catch (error) {
                console.error("Erro ao sincronizar ação:", error);
                remainingActions.push(action);
            }
        }

        setPendingActions(remainingActions);
        localStorage.setItem('operations_pendingActions', JSON.stringify(remainingActions));

        if (successCount > 0) {
            notifySuccess(`${successCount} ações sincronizadas com sucesso`);
            // Recarregar dados
            window.location.reload();
        }
    };

    const handleDiscardPendingActions = () => {
        setPendingActions([]);
        localStorage.setItem('operations_pendingActions', JSON.stringify([]));
        notifySuccess("Alterações pendentes descartadas");
    };

    // Pull to refresh
    const handleRefresh = async () => {
        // Implementar refresh de dados
        console.log("Refreshing data...");
        // TODO: Chamar API para recarregar dados
    };

    // Renderização de cards para visualização em grelha
    const renderGridView = () => (
        <Grid container spacing={2}>
            {displayData.map((item, index) => {
                const canAct = canExecuteActions(item);

                return (
                    <Grid item xs={12} sm={6} key={index}>
                        <SwipeableCard
                            onSwipeRight={() => handleSwipeRight(index)}
                            onSwipeLeft={() => canAct ? handleSwipeLeft(index) : null} // Só permite swipe se tem permissão
                            onSwipeUp={() => handleSwipeUp(index)}
                        >
                            <Card
                                sx={{
                                    cursor: 'pointer',
                                    '&:hover': { boxShadow: 6 },
                                    borderLeft: isRamaisView ? `4px solid ${getRemainingDaysColor(item.restdays)}` : undefined,
                                    borderRight: canAct ? '4px solid #4caf50' : '4px solid #9e9e9e',
                                    transform: cardSwiping[index] === 'right' ? 'translateX(100px)' :
                                        cardSwiping[index] === 'left' ? 'translateX(-100px)' : 'translateX(0)',
                                    transition: 'transform 0.3s ease',
                                    minHeight: 160,
                                    position: 'relative',
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        right: 8,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: 4,
                                        height: 24,
                                        bgcolor: 'primary.main',
                                        borderRadius: 2,
                                        opacity: 0.5
                                    }
                                }}
                                onClick={() => handleItemClick(item)}
                            >
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            {item.regnumber}
                                        </Typography>

                                        <Box display="flex" alignItems="center" gap={1}>
                                            {item.who && (
                                                <Typography variant="body2" color="text.secondary">
                                                    {getUserNameByPk(item.who, globalMetaData)}
                                                </Typography>
                                            )}
                                            {canAct ? (
                                                <LockOpen fontSize="small" color="success" />
                                            ) : (
                                                <Lock fontSize="small" color="disabled" />
                                            )}
                                        </Box>
                                    </Box>

                                    {isRamaisView && (
                                        <Chip
                                            label={`${Math.floor(item.restdays)} dias`}
                                            color={item.restdays <= 0 ? "error" : item.restdays <= 15 ? "warning" : "success"}
                                            size="small"
                                            sx={{ mb: 1 }}
                                        />
                                    )}

                                    <Typography variant="body2" gutterBottom noWrap>
                                        <LocationOn fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                        {getAddressString(item)}
                                    </Typography>

                                    <Typography variant="body2" gutterBottom>
                                        <Phone fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                        {item.phone || "Sem contacto"}
                                    </Typography>

                                    <Typography variant="body2" gutterBottom>
                                        <EventNote fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                        {item.submission}
                                    </Typography>

                                    {isRamaisView && item.limitdate && (
                                        <Typography variant="body2" gutterBottom>
                                            <AccessTime fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                            Limite: {item.limitdate}
                                        </Typography>
                                    )}

                                    {/* Indicador de swipe */}
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: 8,
                                            right: 8,
                                            display: 'flex',
                                            gap: 0.5,
                                            opacity: 0.6
                                        }}
                                    >
                                        <ChevronLeft fontSize="small" />
                                        <ChevronRight fontSize="small" />
                                    </Box>
                                </CardContent>
                                <CardActions>
                                    <Tooltip title="Ver detalhes">
                                        <IconButton size="small" color="primary">
                                            <Assignment />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Navegar até local">
                                        <IconButton
                                            size="small"
                                            color="secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleNavigate(item);
                                            }}
                                        >
                                            <MyLocation />
                                        </IconButton>
                                    </Tooltip>
                                    {item.phone && (
                                        <Tooltip title="Ligar">
                                            <IconButton
                                                size="small"
                                                color="success"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCall(item);
                                                }}
                                            >
                                                <Phone />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Box flexGrow={1} />
                                    <Tooltip title={isFossaView ? "Deslize para concluir" : "Deslize para navegação"}>
                                        <IconButton size="small">
                                            <SwipeRight />
                                        </IconButton>
                                    </Tooltip>
                                </CardActions>
                            </Card>
                        </SwipeableCard>
                    </Grid>
                );
            })}

            {/* Indicador de carregamento */}
            {isRefreshing && (
                <Grid item xs={12} sm={6}>
                    <Card>
                        <CardContent>
                            <Skeleton variant="text" width="60%" height={30} />
                            <Skeleton variant="text" width="100%" />
                            <Skeleton variant="text" width="40%" />
                            <Skeleton variant="text" width="70%" />
                        </CardContent>
                        <CardActions>
                            <Skeleton variant="circular" width={30} height={30} sx={{ mr: 1 }} />
                            <Skeleton variant="circular" width={30} height={30} sx={{ mr: 1 }} />
                            <Skeleton variant="circular" width={30} height={30} />
                        </CardActions>
                    </Card>
                </Grid>
            )}
        </Grid>
    );

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", bgcolor: 'background.default' }}>
            {/* Status de conexão */}
            <ConnectionStatus
                isOnline={isOnline}
                pendingActions={pendingActions}
                onSync={handleSyncPendingActions}
                onDiscard={handleDiscardPendingActions}
            />

            {/* Filtros principais - otimizado para toque */}
            <Paper sx={{
                p: 2,
                m: 2,
                mb: 0,
                borderRadius: 3,
                boxShadow: 3
            }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={5} md={4}>
                        <AssociateFilter
                            associates={associates || []}
                            selectedAssociate={selectedAssociate}
                            onAssociateChange={handleAssociateChange}
                        />
                    </Grid>
                    <Grid item xs={8} sm={4} md={3}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={showOnlyMyTasks}
                                    onChange={(e) => setShowOnlyMyTasks(e.target.checked)}
                                    color="primary"
                                    sx={{ transform: 'scale(1.2)' }} // Maior para tablets
                                />
                            }
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="body1">Meus pedidos</Typography>
                                    <Chip
                                        size="small"
                                        label={sortedData.filter(item => Number(item.who) === currentUser?.user_id).length} // Mudar pk para user_id
                                        color={showOnlyMyTasks ? "primary" : "default"}
                                        sx={{ height: 24, minWidth: 32 }}
                                    />
                                </Box>
                            }
                            sx={{ ml: 0, mr: 'auto' }}
                        />
                    </Grid>
                    <Grid item xs={4} sm={3} md={5}>
                        <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
                            <ToggleButtonGroup
                                value={viewMode}
                                exclusive
                                onChange={handleViewModeChange}
                                size="medium" // Maior para tablets
                                sx={{
                                    '& .MuiToggleButton-root': {
                                        minWidth: 48,
                                        minHeight: 48,
                                        px: 2
                                    }
                                }}
                            >
                                <ToggleButton value="grid" aria-label="vista grelha">
                                    <ViewModule fontSize="medium" />
                                </ToggleButton>
                                <ToggleButton value="list" aria-label="vista lista">
                                    <ViewList fontSize="medium" />
                                </ToggleButton>
                            </ToggleButtonGroup>
                            <IconButton
                                size="large"
                                onClick={() => setFilterDrawer(true)}
                                sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                            >
                                <FilterList />
                            </IconButton>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabs otimizadas para toque */}
            <Box sx={{
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                mx: 2,
                borderRadius: '12px 12px 0 0',
                mt: 2
            }}>
                <Tabs
                    value={currentView || false}
                    onChange={(e, newValue) => handleViewChange(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTab-root': {
                            minHeight: 64,
                            minWidth: 120,
                            fontSize: '1.1rem',
                            fontWeight: 500,
                            px: 3,
                            transition: 'all 0.3s',
                            '&:hover': {
                                backgroundColor: 'action.hover'
                            }
                        },
                        '& .MuiTabs-indicator': {
                            height: 3,
                            borderRadius: '3px 3px 0 0'
                        }
                    }}
                >
                    {sortedViews.map(([key, value]) => (
                        <Tab
                            key={key}
                            value={key}
                            label={
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    py: 1
                                }}>
                                    <Box>
                                        <Typography variant="body1">{value.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {value.total || 0} {value.total === 1 ? 'pedido' : 'pedidos'}
                                        </Typography>
                                    </Box>
                                    {value.total > 0 && (
                                        <Box
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                bgcolor: 'error.main',
                                                animation: 'pulse 2s infinite'
                                            }}
                                        />
                                    )}
                                </Box>
                            }
                        />
                    ))}
                </Tabs>
            </Box>

            {/* Área de conteúdo com scroll suave */}
            <PullToRefresh onRefresh={handleRefresh}>
                <Box sx={{
                    flexGrow: 1,
                    overflow: 'auto',
                    p: 2,
                    px: { xs: 2, sm: 3 },
                    WebkitOverflowScrolling: 'touch',
                    scrollBehavior: 'smooth'
                }}>
                    {selectedView && filteredData[selectedView] && (
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 3,
                            px: 1
                        }}>
                            <Typography variant="h6" fontWeight="medium">
                                {displayData.length} {displayData.length === 1 ? 'registo' : 'registos'}
                            </Typography>
                            {isOnline && (
                                <Typography variant="caption" color="text.secondary">
                                    Última atualização: {new Date().toLocaleTimeString('pt-PT', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Typography>
                            )}
                        </Box>
                    )}

                    {/* Conteúdo principal */}
                    {viewMode === 'grid' ? (
                        <Grid container spacing={3}>
                            {displayData.map((item, index) => {
                                const canAct = Number(item.who) === Number(currentUser?.user_id);
                                const isLastItem = index === displayData.length - 1;
                                const refProps = isLastItem ? { ref: lastItemRef } : {};

                                return (
                                    <Grid item xs={12} sm={6} lg={4} key={index} {...refProps}>
                                        <SwipeableCard
                                            onSwipeRight={() => handleSwipeRight(index)}
                                            onSwipeLeft={() => canAct ? handleSwipeLeft(index) : null}
                                            onSwipeUp={() => handleSwipeUp(index)}
                                        >
                                            <Card
                                                sx={{
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    minHeight: 200,
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-4px)',
                                                        boxShadow: 6
                                                    },
                                                    borderLeft: isRamaisView ?
                                                        `6px solid ${getRemainingDaysColor(item.restdays)}` :
                                                        undefined,
                                                    borderRadius: 3,
                                                    overflow: 'hidden'
                                                }}
                                                onClick={() => handleItemClick(item)}
                                            >
                                                <CardContent sx={{ p: 3 }}>
                                                    {/* Cabeçalho */}
                                                    <Box display="flex" justifyContent="space-between" mb={2}>
                                                        <Typography
                                                            variant="h6"
                                                            fontWeight="bold"
                                                            sx={{ fontSize: '1.2rem' }}
                                                        >
                                                            {item.regnumber}
                                                        </Typography>

                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            {item.who && (
                                                                <Chip
                                                                    size="small"
                                                                    label={getUserNameByPk(item.who, globalMetaData)}
                                                                    color={canAct ? "primary" : "default"}
                                                                    sx={{ maxWidth: 150 }}
                                                                />
                                                            )}
                                                            {canAct ? (
                                                                <LockOpen fontSize="small" color="success" />
                                                            ) : (
                                                                <Lock fontSize="small" color="disabled" />
                                                            )}
                                                        </Box>
                                                    </Box>

                                                    {/* Status para ramais */}
                                                    {isRamaisView && (
                                                        <Box mb={2}>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={Math.max(0, Math.min(100, (item.restdays / 30) * 100))}
                                                                sx={{
                                                                    height: 8,
                                                                    borderRadius: 4,
                                                                    bgcolor: 'grey.200',
                                                                    '& .MuiLinearProgress-bar': {
                                                                        bgcolor: getRemainingDaysColor(item.restdays),
                                                                        borderRadius: 4
                                                                    }
                                                                }}
                                                            />
                                                            <Typography
                                                                variant="caption"
                                                                color={getRemainingDaysColor(item.restdays)}
                                                                sx={{ mt: 0.5, display: 'block' }}
                                                            >
                                                                {Math.floor(item.restdays)} dias restantes
                                                            </Typography>
                                                        </Box>
                                                    )}

                                                    {/* Informações */}
                                                    <Stack spacing={1.5}>
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <LocationOn fontSize="small" color="action" />
                                                            <Typography variant="body2" noWrap>
                                                                {getAddressString(item)}
                                                            </Typography>
                                                        </Box>

                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <Phone fontSize="small" color="action" />
                                                            <Typography variant="body2">
                                                                {item.phone || "Sem contacto"}
                                                            </Typography>
                                                        </Box>

                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <CalendarToday fontSize="small" color="action" />
                                                            <Typography variant="body2">
                                                                {item.submission}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>

                                                    {/* Indicadores de ação */}
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            bottom: 12,
                                                            right: 12,
                                                            display: 'flex',
                                                            gap: 0.5,
                                                            opacity: 0.7
                                                        }}
                                                    >
                                                        <TouchApp fontSize="small" />
                                                    </Box>
                                                </CardContent>

                                                {/* Ações rápidas no hover */}
                                                <CardActions
                                                    sx={{
                                                        justifyContent: 'space-around',
                                                        p: 1.5,
                                                        bgcolor: 'action.hover',
                                                        borderTop: 1,
                                                        borderColor: 'divider'
                                                    }}
                                                >
                                                    <Tooltip title="Navegar">
                                                        <IconButton
                                                            size="large"
                                                            color="primary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleNavigate(item);
                                                            }}
                                                        >
                                                            <MyLocation />
                                                        </IconButton>
                                                    </Tooltip>
                                                    {item.phone && (
                                                        <Tooltip title="Ligar">
                                                            <IconButton
                                                                size="large"
                                                                color="success"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCall(item);
                                                                }}
                                                            >
                                                                <Phone />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    {canAct && (
                                                        <Tooltip title="Ações">
                                                            <IconButton
                                                                size="large"
                                                                color="secondary"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedItem(item);
                                                                    setActionDrawer(true);
                                                                }}
                                                            >
                                                                <MoreVert />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </CardActions>
                                            </Card>
                                        </SwipeableCard>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    ) : (
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
                                sx={{
                                    '& .MuiTableRow-root': {
                                        minHeight: 72,
                                        cursor: 'pointer',
                                        '&:hover': {
                                            backgroundColor: 'action.hover'
                                        }
                                    }
                                }}
                            />
                        </Paper>
                    )}

                    {/* Loading mais itens */}
                    {isRefreshing && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}
                </Box>
            </PullToRefresh>

            {/* FABs flutuantes */}
            <SpeedDial
                ariaLabel="Ações rápidas"
                sx={{ position: 'fixed', bottom: 24, right: 24 }}
                icon={<SpeedDialIcon />}
                direction="up"
            >
                <SpeedDialAction
                    icon={<FilterList />}
                    tooltipTitle="Filtros"
                    onClick={() => setFilterDrawer(true)}
                />
                {selectedItem && Number(selectedItem.who) === Number(currentUser?.user_id) && (
                    <SpeedDialAction
                        icon={<CheckCircle />}
                        tooltipTitle="Concluir"
                        onClick={() => handleMarkComplete()}
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

            {/* Drawer de filtros */}
            <SwipeableDrawer
                anchor="bottom"
                open={filterDrawer}
                onClose={() => setFilterDrawer(false)}
                onOpen={() => setFilterDrawer(true)}
                disableSwipeToOpen
                disableBackdropTransition // Adiciona isto
                disableDiscovery // Adiciona isto
                ModalProps={{
                    keepMounted: false
                }}
                PaperProps={{
                    sx: {
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        maxHeight: '60vh',
                        pt: 1
                    }
                }}
            >
                <Box sx={{ p: 3 }}>
                    <Box sx={{
                        width: 60,
                        height: 4,
                        bgcolor: 'grey.300',
                        borderRadius: 2,
                        mx: 'auto',
                        mb: 3
                    }} />

                    <Typography variant="h6" gutterBottom>
                        Filtros
                    </Typography>

                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <AssociateFilter
                                associates={associates || []}
                                selectedAssociate={selectedAssociate || ''}
                                onAssociateChange={handleAssociateChange}
                            />
                        </Grid>
                        {/* Adicionar mais filtros conforme necessário */}
                        <Grid item xs={12}>
                            <TextField
                                label="Pesquisar"
                                value={searchValue} 
                                onChange={(e) => setSearchValue(e.target.value)}
                                fullWidth
                                variant="outlined"
                                sx={{ mb: 3 }}
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => setFilterDrawer(false)}>
                            Fechar
                        </Button>
                    </Box>
                </Box>
            </SwipeableDrawer>

            {/* Diálogo de parâmetros */}
            <Dialog
                open={paramsDialogOpen}
                onClose={() => setParamsDialogOpen(false)}
                fullWidth
                maxWidth="md"
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">
                            Parâmetros do Serviço
                        </Typography>
                        <IconButton onClick={() => setParamsDialogOpen(false)}>
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Preencha todos os parâmetros necessários para concluir o serviço.
                    </Alert>
                    {paramsLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <SimpleParametersEditor
                            document={selectedItem}
                            metaData={metaData}
                            onSave={handleParamsSaved}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Diálogo de conclusão */}
            <Dialog
                open={completeDialogOpen}
                onClose={() => setCompleteDialogOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">
                            Concluir Serviço
                        </Typography>
                        <IconButton onClick={() => setCompleteDialogOpen(false)}>
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Observações finais (opcional)"
                        fullWidth
                        multiline
                        rows={4}
                        variant="outlined"
                        value={completionNote}
                        onChange={(e) => setCompletionNote(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCompleteDialogOpen(false)}>Cancelar</Button>
                    <Button
                        onClick={handleAddFinalStep}
                        variant="contained"
                        color="success"
                        sx={{ px: 4, py: 1 }}
                    >
                        Confirmar Conclusão
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Drawer com detalhes do item */}
            <SwipeableDrawer
                anchor="bottom"
                open={detailsDrawer}
                onClose={() => setDetailsDrawer(false)}
                onOpen={() => setDetailsDrawer(true)}
                disableSwipeToOpen
                disableBackdropTransition // Adiciona isto
                disableDiscovery // Adiciona isto
                ModalProps={{
                    keepMounted: false
                }}
                PaperProps={{
                    sx: {
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        height: '70%',
                        pt: 1
                    }
                }}
            >
                {selectedItem && (
                    <Box sx={{ p: 2 }}>
                        <Box sx={{ width: '100px', height: '4px', bgcolor: 'grey.300', borderRadius: '2px', mx: 'auto', mb: 2 }} />

                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">{selectedItem.regnumber}</Typography>

                            {Number(selectedItem.who) === Number(currentUser?.user_id) ? (
                                // Mostra botões se tem permissão
                                <Box>
                                    <Tooltip title="Adicionar passo">
                                        <IconButton color="primary" onClick={handleActionClick}>
                                            <Send />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Navegar até local">
                                        <IconButton color="secondary" onClick={() => handleNavigate(selectedItem)}>
                                            <MyLocation />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Ligar">
                                        <IconButton
                                            color="success"
                                            onClick={() => handleCall(selectedItem)}
                                            disabled={!selectedItem.phone}
                                        >
                                            <Phone />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            ) : (
                                // Apenas navegação e telefone se não tem permissão
                                <Box>
                                    <Tooltip title="Navegar até local">
                                        <IconButton color="secondary" onClick={() => handleNavigate(selectedItem)}>
                                            <MyLocation />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Ligar">
                                        <IconButton
                                            color="success"
                                            onClick={() => handleCall(selectedItem)}
                                            disabled={!selectedItem.phone}
                                        >
                                            <Phone />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            )}
                        </Box>

                        <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2, mb: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">Requerente</Typography>
                                    <Typography variant="body1">{selectedItem.ts_entity}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">Contacto</Typography>
                                    <Typography variant="body1">{selectedItem.phone || "Não definido"}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">Data Submissão</Typography>
                                    <Typography variant="body1">{selectedItem.submission}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">Morada</Typography>
                                    <Typography variant="body1">{getAddressString(selectedItem)}</Typography>
                                </Grid>
                                {isRamaisView && (
                                    <>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">Data Execução</Typography>
                                            <Typography variant="body1">{selectedItem.execution || "Não definida"}</Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">Data Limite</Typography>
                                            <Typography variant="body1" sx={{ color: getRemainingDaysColor(selectedItem.restdays) }}>
                                                {selectedItem.limitdate} ({Math.floor(selectedItem.restdays)} dias)
                                            </Typography>
                                        </Grid>
                                    </>
                                )}
                                {isFossaView && (
                                    <>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">Nº Cisternas</Typography>
                                            <Typography variant="body1">{selectedItem.n_cisternas || "Não definido"}</Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">Local Descarga</Typography>
                                            <Typography variant="body1">{selectedItem.local_descarga || "Não definido"}</Typography>
                                        </Grid>
                                    </>
                                )}
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">Observações</Typography>
                                    <Typography variant="body1">{selectedItem.memo || "Sem observações"}</Typography>
                                </Grid>
                            </Grid>
                        </Paper>

                        <Box display="flex" justifyContent="space-around" mt={3}>
                            {/* Verificar se o pedido está atribuído ao utilizador atual */}
                            {Number(selectedItem.who) === Number(currentUser?.user_id) ? (
                                // Mostrar botões de ações se atribuído ao utilizador
                                isFossaView ? (
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<CheckCircle />}
                                        onClick={handleCompleteProcess}
                                        fullWidth
                                        sx={{ py: 1.5 }}
                                    >
                                        Concluir Serviço
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<Send />}
                                            onClick={handleActionClick}
                                            fullWidth
                                            sx={{ mr: 1, py: 1.5 }}
                                        >
                                            Adicionar Passo
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="success"
                                            startIcon={<CheckCircle />}
                                            onClick={handleMarkComplete}
                                            fullWidth
                                            sx={{ ml: 1, py: 1.5 }}
                                        >
                                            Marcar Concluído
                                        </Button>
                                    </>
                                )
                            ) : (
                                // Mostrar mensagem se não atribuído ao utilizador
                                <Alert severity="info" sx={{ width: '100%' }}>
                                    Este pedido está atribuído a {getUserNameByPk(selectedItem.who, globalMetaData)}.
                                    Não tem permissões para executar ações neste pedido.
                                </Alert>
                            )}
                        </Box>
                    </Box>
                )}
            </SwipeableDrawer>

            {/* Drawer com ações rápidas */}
            <SwipeableDrawer
                anchor="bottom"
                open={actionDrawer}
                onClose={() => setActionDrawer(false)}
                onOpen={() => setActionDrawer(true)}
                disableSwipeToOpen
                disableBackdropTransition // Adiciona isto
                disableDiscovery // Adiciona isto
                ModalProps={{
                    keepMounted: false
                }}
                PaperProps={{
                    sx: {
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        maxHeight: '50%',
                        pt: 1
                    }
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom align="center">
                        Ações para {selectedItem?.regnumber || ""}
                    </Typography>

                    <List>
                        <ListItemButton
                            onClick={handleAddStep}
                            sx={{ borderRadius: 2, mb: 1 }}
                        >
                            <ListItemIcon>
                                <Send color="primary" />
                            </ListItemIcon>
                            <ListItemText primary="Adicionar Passo" secondary="Atualiza o estado do pedido" />
                        </ListItemButton>

                        <ListItemButton
                            onClick={handleAddAnnex}
                            sx={{ borderRadius: 2, mb: 1 }}
                        >
                            <ListItemIcon>
                                <Attachment color="secondary" />
                            </ListItemIcon>
                            <ListItemText primary="Adicionar Anexo" secondary="Fotos ou documentos" />
                        </ListItemButton>

                        <ListItemButton
                            onClick={handleMarkComplete}
                            sx={{ borderRadius: 2, mb: 1 }}
                        >
                            <ListItemIcon>
                                <CheckCircle color="success" />
                            </ListItemIcon>
                            <ListItemText primary="Marcar Concluído" secondary="Finaliza o processo" />
                        </ListItemButton>

                        <ListItemButton
                            onClick={() => handleNavigate(selectedItem)}
                            sx={{ borderRadius: 2 }}
                        >
                            <ListItemIcon>
                                <DirectionsCar color="info" />
                            </ListItemIcon>
                            <ListItemText primary="Navegar até Local" secondary="Abre app de navegação" />
                        </ListItemButton>
                    </List>
                </Box>
            </SwipeableDrawer>
        </Box>
    );
};

export default TabletOperations;