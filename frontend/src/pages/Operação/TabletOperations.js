import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Box, Paper, Typography, Button, Grid, Fab,
    SwipeableDrawer, List, ListItem, ListItemButton, ListItemText,
    ListItemIcon, IconButton, Divider, Card, CardContent,
    CardActions, Chip, Tooltip, ToggleButtonGroup,
    ToggleButton, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Alert, Skeleton
} from "@mui/material";
import {
    FilterList, Send, Attachment, Edit, Assignment,
    LocationOn, Phone, EventNote, AccessTime, CheckCircle,
    FileDownload, SwipeRight, Sort, ViewList, ViewModule,
    MyLocation, DirectionsCar, Close, Refresh
} from "@mui/icons-material";
import CircularProgress from '@mui/material/CircularProgress';
import SimpleParametersEditor from './SimpleParametersEditor';
import AssociateFilter from "./AssociateFilter";
import ViewCards from "./ViewCards";
import OperationsTable from "./OperationsTable";
import { getColumnsForView, getRemainingDaysColor } from "./operationsHelpers";
import { exportToExcel } from "./exportService";
import { getDocumentTypeParams, addDocumentStep } from "../../services/documentService";
import { notifySuccess, notifyError } from "../../components/common/Toaster/ThemedToaster";
import { useMetaData } from '../../contexts/MetaDataContext';
import { useInView } from 'react-intersection-observer'; // Adicionar esta dependência para lazy loading

// Componente para swipe com gestos
const SwipeableCard = ({ children, onSwipeRight, onSwipeLeft, minDistance = 50 }) => {
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    // Capturar eventos de toque
    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minDistance;
        const isRightSwipe = distance < -minDistance;

        if (isRightSwipe && onSwipeRight) {
            onSwipeRight();
        }

        if (isLeftSwipe && onSwipeLeft) {
            onSwipeLeft();
        }
    };

    return (
        <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {children}
        </div>
    );
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
    const [metaData, setMetaData] = useState(null);
    const [completionNote, setCompletionNote] = useState('');
    const [paramsLoading, setParamsLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cardSwiping, setCardSwiping] = useState({}); // Rastrear cards sendo deslizados

    // Referência para o último elemento para lazy loading
    const { ref: lastItemRef, inView } = useInView({
        threshold: 0.1,
    });

    const { metaData: globalMetaData } = useMetaData();

    // Carregar mais itens quando chegar ao final
    useEffect(() => {
        if (inView && !loadingMore) {
            setLoadingMore(true);
            // Simular carregamento adicional - substituir por API real
            setTimeout(() => {
                // TODO: Implementar carregamento de mais dados da API
                setLoadingMore(false);
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

    // Cache para offline - usar localStorage como fallback básico
    const saveToLocalCache = useCallback((key, data) => {
        try {
            localStorage.setItem(`operations_${key}`, JSON.stringify({
                timestamp: Date.now(),
                data
            }));
        } catch (error) {
            console.error("Erro ao salvar em cache:", error);
        }
    }, []);

    const loadFromLocalCache = useCallback((key) => {
        try {
            const cached = localStorage.getItem(`operations_${key}`);
            if (cached) {
                const parsedCache = JSON.parse(cached);
                // Verificar se o cache está expirado (1 hora)
                if (Date.now() - parsedCache.timestamp < 3600000) {
                    return parsedCache.data;
                }
            }
            return null;
        } catch (error) {
            console.error("Erro ao carregar do cache:", error);
            return null;
        }
    }, []);

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
                const pendingActions = loadFromLocalCache('pendingActions') || [];
                pendingActions.push({
                    action: 'addDocumentStep',
                    params: { documentId: selectedItem.pk, stepData },
                    timestamp: Date.now()
                });
                saveToLocalCache('pendingActions', pendingActions);
                notifySuccess("Pedido guardado para sincronização posterior");
            }

            setCompleteDialogOpen(false);
            setDetailsDrawer(false);

            // Atualizar UI localmente
            // Implementar lógica para atualizar dados localmente sem recarregar
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

    // Renderização de cards para visualização em grelha
    const renderGridView = () => (
        <Grid container spacing={2}>
            {sortedData.map((item, index) => {
                const isLastItem = index === sortedData.length - 1;
                const refProps = isLastItem ? { ref: lastItemRef } : {};

                return (
                    <Grid item xs={12} sm={6} key={index} {...refProps}>
                        <SwipeableCard
                            onSwipeRight={() => handleSwipeRight(index)}
                            onSwipeLeft={() => handleSwipeLeft(index)}
                        >
                            <Card
                                sx={{
                                    cursor: 'pointer',
                                    '&:hover': { boxShadow: 6 },
                                    borderLeft: isRamaisView ? `4px solid ${getRemainingDaysColor(item.restdays)}` : undefined,
                                    transform: cardSwiping[index] === 'right' ? 'translateX(100px)' :
                                        cardSwiping[index] === 'left' ? 'translateX(-100px)' : 'translateX(0)',
                                    transition: 'transform 0.3s ease',
                                }}
                                onClick={() => handleItemClick(item)}
                            >
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            {item.regnumber}
                                        </Typography>
                                        {isRamaisView && (
                                            <Chip
                                                label={`${Math.floor(item.restdays)} dias`}
                                                color={item.restdays <= 0 ? "error" : item.restdays <= 15 ? "warning" : "success"}
                                                size="small"
                                            />
                                        )}
                                    </Box>

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
            {loadingMore && (
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

    // Drawer com detalhes do item
    const renderDetailsDrawer = () => (
        <SwipeableDrawer
            anchor="bottom"
            open={detailsDrawer}
            onClose={() => setDetailsDrawer(false)}
            onOpen={() => setDetailsDrawer(true)}
            disableSwipeToOpen
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
                        {isFossaView ? (
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircle />}
                                onClick={handleCompleteProcess}
                                fullWidth
                                sx={{ py: 1.5 }} // Botão maior para toque mais fácil
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
                        )}
                    </Box>
                </Box>
            )}
        </SwipeableDrawer>
    );

    // Drawer com ações rápidas
    const renderActionDrawer = () => (
        <SwipeableDrawer
            anchor="bottom"
            open={actionDrawer}
            onClose={() => setActionDrawer(false)}
            onOpen={() => setActionDrawer(true)}
            disableSwipeToOpen
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
                <Box sx={{ width: '100px', height: '4px', bgcolor: 'grey.300', borderRadius: '2px', mx: 'auto', mb: 2 }} />

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

                    <ListItem
                        button
                        onClick={handleAddAnnex}
                        sx={{ borderRadius: 2, mb: 1 }}
                    >
                        <ListItemIcon>
                            <Attachment color="secondary" />
                        </ListItemIcon>
                        <ListItemText primary="Adicionar Anexo" secondary="Fotos ou documentos" />
                    </ListItem>

                    <ListItem
                        button
                        onClick={handleMarkComplete}
                        sx={{ borderRadius: 2, mb: 1 }}
                    >
                        <ListItemIcon>
                            <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText primary="Marcar Concluído" secondary="Finaliza o processo" />
                    </ListItem>

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
    );

    // Componente para status de conexão
    const ConnectionStatus = () => {
        const [isOnline, setIsOnline] = useState(navigator.onLine);
        const [hasPendingActions, setHasPendingActions] = useState(false);
        const [pendingActions, setPendingActions] = useState([]);

        useEffect(() => {
            const handleOnline = () => setIsOnline(true);
            const handleOffline = () => setIsOnline(false);

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            // Verificar ações pendentes no início
            const pendingActionsFromCache = loadFromLocalCache('pendingActions') || [];
            setPendingActions(pendingActionsFromCache);
            setHasPendingActions(pendingActionsFromCache.length > 0);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }, [loadFromLocalCache]);

        const handleSync = useCallback(async () => {
            if (!isOnline) return;

            const pendingActionsFromCache = loadFromLocalCache('pendingActions') || [];
            if (pendingActionsFromCache.length === 0) return;

            // Processar ações pendentes
            let successCount = 0;
            for (const action of pendingActionsFromCache) {
                try {
                    if (action.action === 'addDocumentStep') {
                        await addDocumentStep(
                            action.params.documentId,
                            action.params.stepData
                        );
                        successCount++;
                    }
                    // Adicionar outros tipos de ações aqui
                } catch (error) {
                    console.error("Erro ao sincronizar ação:", error);
                }
            }

            if (successCount > 0) {
                notifySuccess(`${successCount} ações sincronizadas com sucesso`);
                // Limpar ações bem-sucedidas
                saveToLocalCache('pendingActions', []);
                setPendingActions([]);
                setHasPendingActions(false);
                // Recarregar dados
                window.location.reload();
            }
        }, [isOnline, loadFromLocalCache, saveToLocalCache]);

        const handleDiscardPendingChanges = useCallback(() => {
            // Limpar todas as ações pendentes
            saveToLocalCache('pendingActions', []);
            setPendingActions([]);
            setHasPendingActions(false);
            notifySuccess("Alterações pendentes descartadas");
        }, [saveToLocalCache]);

        // Tentar sincronizar quando voltar online
        useEffect(() => {
            if (isOnline && hasPendingActions) {
                handleSync();
            }
        }, [isOnline, hasPendingActions, handleSync]);

        if (!isOnline || hasPendingActions) {
            return (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 80,  // Acima dos FABs
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            bgcolor: isOnline ? 'warning.light' : 'error.light',
                            color: isOnline ? 'warning.contrastText' : 'error.contrastText',
                            borderRadius: 2,
                            py: 1,
                            px: 2,
                            maxWidth: '90%'
                        }}
                    >
                        <Typography variant="body2" sx={{ mr: 1 }}>
                            {isOnline
                                ? `${pendingActions.length} operações pendentes de sincronização`
                                : "Offline - As alterações serão guardadas localmente"}
                        </Typography>
                        {isOnline && (
                            <>
                                <IconButton
                                    size="small"
                                    onClick={handleSync}
                                    sx={{ color: 'inherit' }}
                                    title="Sincronizar"
                                >
                                    <Refresh fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={handleDiscardPendingChanges}
                                    sx={{ color: 'inherit' }}
                                    title="Descartar"
                                >
                                    <Close fontSize="small" />
                                </IconButton>
                            </>
                        )}
                    </Paper>
                </Box>
            );
        }

        return null;
    };

    return (
        <Box sx={{ p: 2, pb: 8 }}>
            {/* Filtros e seleção de vista */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <AssociateFilter
                            associates={associates || []}
                            selectedAssociate={selectedAssociate || ''}
                            onAssociateChange={handleAssociateChange}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Box display="flex" justifyContent="flex-end" alignItems="center">
                            <ToggleButtonGroup
                                value={viewMode}
                                exclusive
                                onChange={handleViewModeChange}
                                size="small"
                                sx={{ mr: 1 }}
                            >
                                <ToggleButton value="grid" aria-label="grid view">
                                    <ViewModule />
                                </ToggleButton>
                                <ToggleButton value="list" aria-label="list view">
                                    <ViewList />
                                </ToggleButton>
                            </ToggleButtonGroup>

                            <Tooltip title="Filtros avançados">
                                <IconButton>
                                    <FilterList />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Ordenar">
                                <IconButton>
                                    <Sort />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Cards das vistas */}
            <Box sx={{ mb: 3, mt: 2 }}>
                <ViewCards
                    views={sortedViews}
                    selectedView={selectedView}
                    onViewClick={handleViewChange}
                />
            </Box>

            {/* Conteúdo principal - Alternar entre grid e list */}
            {selectedView && filteredData[selectedView] && filteredData[selectedView].data.length > 0 && (
                <Box mt={2} sx={{ pb: 10 }}>
                    <Typography variant="h6" gutterBottom>
                        {filteredData[selectedView].name} - {filteredData[selectedView].data.length} registos
                    </Typography>

                    {viewMode === 'grid' ? (
                        renderGridView()
                    ) : (
                        <OperationsTable
                            data={sortedData}
                            columns={getColumnsForView(selectedView)}
                            orderBy={orderBy}
                            order={order}
                            onRequestSort={handleRequestSort}
                            expandedRows={expandedRows}
                            toggleRowExpand={toggleRowExpand}
                            isRamaisView={isRamaisView}
                            getRemainingDaysColor={getRemainingDaysColor}
                            getAddressString={getAddressString}
                            renderCell={(column, row) => {
                                if (column.format) {
                                    return column.format(row[column.id]);
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
                            }}
                            onRowClick={handleItemClick}
                            sx={{ '& .MuiTableCell-root': { fontSize: '1rem', py: 1.5 } }} // Células maiores para toque
                        />
                    )}
                </Box>
            )}

            {/* FAB para ações rápidas e exportação */}
            <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 2 }}>
                {isFossaView && (
                    <Tooltip title="Exportar para Excel">
                        <Fab
                            color="default"
                            aria-label="export"
                            size="medium"
                            sx={{ mb: 1, mr: 1 }}
                            onClick={() => exportToExcel(filteredData, selectedView)}
                        >
                            <FileDownload />
                        </Fab>
                    </Tooltip>
                )}

                {selectedItem && (
                    <Tooltip title="Ações rápidas">
                        <Fab
                            color="primary"
                            aria-label="actions"
                            onClick={handleActionClick}
                        >
                            <Edit />
                        </Fab>
                    </Tooltip>
                )}
            </Box>

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
                        sx={{ px: 4, py: 1 }} // Botão maior para toque
                    >
                        Confirmar Conclusão
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Componente de estado de conexão */}
            <ConnectionStatus />

            {/* Drawers */}
            {renderDetailsDrawer()}
            {renderActionDrawer()}
        </Box>
    );
};

export default TabletOperations;