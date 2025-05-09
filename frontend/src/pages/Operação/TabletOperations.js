import React, { useState, useEffect } from "react";
import {
    Box,
    Paper,
    Typography,
    Button,
    Grid,
    Fab,
    SwipeableDrawer,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    Divider,
    Card,
    CardContent,
    CardActions,
    Chip,
    Tooltip,
    ToggleButtonGroup,
    ToggleButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert
} from "@mui/material";
import {
    FilterList as FilterIcon,
    Send as SendIcon,
    Attachment as AttachmentIcon,
    Edit as EditIcon,
    Assignment as AssignmentIcon,
    LocationOn as LocationIcon,
    Phone as PhoneIcon,
    EventNote as EventIcon,
    AccessTime as TimeIcon,
    CheckCircle as CheckIcon,
    FileDownload as DownloadIcon,
    SwipeRight as SwipeIcon,
    Sort as SortIcon,
    ViewList as ListViewIcon,
    ViewModule as GridViewIcon,
    MyLocation as MyLocationIcon,
    DirectionsCar as CarIcon,
    Close as CloseIcon
} from "@mui/icons-material";
import CircularProgress from '@mui/material/CircularProgress';
import ParametersTab from '../ModernDocuments/modals/details/tabs/ParametersTab';
import AssociateFilter from "./AssociateFilter";
import ViewCards from "./ViewCards";
import OperationsTable from "./OperationsTable";
import { getColumnsForView, getRemainingDaysColor } from "./operationsHelpers";
import { exportToExcel } from "./exportService";
import { useOperationsData, useOperationsFiltering, useOperationsTable } from "../../hooks/useOperations";
import { getDocumentTypeParams, addDocumentStep } from "../../services/documentService";
import { notifySuccess, notifyError } from "../../components/common/Toaster/ThemedToaster";
import SimpleParametersEditor from './SimpleParametersEditor';
import { useMetaData } from '../../contexts/MetaDataContext';

const TabletOperations = () => {
    // Estados originais
    const { operationsData, loading, error, associates } = useOperationsData();
    const {
        selectedAssociate,
        selectedView,
        isFossaView,
        isRamaisView,
        filteredData,
        sortedViews,
        handleViewChange,
        handleAssociateChange
    } = useOperationsFiltering(operationsData);
    const {
        orderBy,
        order,
        expandedRows,
        sortedData,
        handleRequestSort,
        toggleRowExpand,
        getAddressString
    } = useOperationsTable(filteredData, selectedView);

    // Novos estados para interface tablet
    const [viewMode, setViewMode] = useState('grid');
    const [detailsDrawer, setDetailsDrawer] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [actionDrawer, setActionDrawer] = useState(false);

    // Estados para implementação de conclusão de fossas
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [paramsDialogOpen, setParamsDialogOpen] = useState(false);
    const [metaData, setMetaData] = useState(null);
    const [completionNote, setCompletionNote] = useState('');
    const [paramsLoading, setParamsLoading] = useState(false);

    const { metaData: globalMetaData } = useMetaData();

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
            // Buscar apenas os parâmetros específicos do documento
            const response = await getDocumentTypeParams(selectedItem.pk);

            // Usar os metadados globais já carregados
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

            await addDocumentStep(selectedItem.pk, stepData);
            notifySuccess("Pedido concluído com sucesso!");
            setCompleteDialogOpen(false);
            setDetailsDrawer(false);

            // Em vez de usar o hook, recarregue a página ou busque novamente os dados
            window.location.reload();
            // Ou implemente um método para recarregar os dados
        } catch (error) {
            notifyError("Erro ao concluir o pedido");
            console.error("Erro ao concluir pedido:", error);
        }
    };

    // Manipuladores para os novos estados
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
        console.log("Marcar como concluído:", selectedItem?.regnumber);
        setActionDrawer(false);
    };

    const handleNavigate = () => {
        console.log("Navegar para:", getAddressString(selectedItem));
        // Implementar abertura de app de navegação
        if (selectedItem?.latitude && selectedItem?.longitude) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedItem.latitude},${selectedItem.longitude}`);
        } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getAddressString(selectedItem))}`);
        }
    };

    const handleCall = () => {
        if (selectedItem?.phone) {
            window.location.href = `tel:${selectedItem.phone}`;
        }
    };

    // Renderização de cards para visualização em grelha
    const renderGridView = () => (
        <Grid container spacing={2}>
            {sortedData.map((item, index) => (
                <Grid item xs={12} sm={6} key={index}>
                    <Card
                        sx={{
                            cursor: 'pointer',
                            '&:hover': { boxShadow: 6 },
                            borderLeft: isRamaisView ? `4px solid ${getRemainingDaysColor(item.restdays)}` : undefined
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
                                <LocationIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                {getAddressString(item)}
                            </Typography>

                            <Typography variant="body2" gutterBottom>
                                <PhoneIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                {item.phone || "Sem contacto"}
                            </Typography>

                            <Typography variant="body2" gutterBottom>
                                <EventIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                {item.submission}
                            </Typography>

                            {isRamaisView && item.limitdate && (
                                <Typography variant="body2" gutterBottom>
                                    <TimeIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                    Limite: {item.limitdate}
                                </Typography>
                            )}
                        </CardContent>
                        <CardActions>
                            <Tooltip title="Ver detalhes">
                                <IconButton size="small" color="primary">
                                    <AssignmentIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Navegar até local">
                                <IconButton size="small" color="secondary">
                                    <MyLocationIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Ligar">
                                <IconButton size="small" color="success">
                                    <PhoneIcon />
                                </IconButton>
                            </Tooltip>
                            <Box flexGrow={1} />
                            <Tooltip title="Deslizar para ações">
                                <IconButton>
                                    <SwipeIcon />
                                </IconButton>
                            </Tooltip>
                        </CardActions>
                    </Card>
                </Grid>
            ))}
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
                                    <SendIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Navegar até local">
                                <IconButton color="secondary" onClick={handleNavigate}>
                                    <MyLocationIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Ligar">
                                <IconButton color="success" onClick={handleCall}>
                                    <PhoneIcon />
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
                                startIcon={<CheckIcon />}
                                onClick={handleCompleteProcess}
                                fullWidth
                            >
                                Concluir Serviço
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<SendIcon />}
                                    onClick={handleActionClick}
                                    fullWidth
                                    sx={{ mr: 1 }}
                                >
                                    Adicionar Passo
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="success"
                                    startIcon={<CheckIcon />}
                                    onClick={handleMarkComplete}
                                    fullWidth
                                    sx={{ ml: 1 }}
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
                    <ListItem component="button" onClick={handleAddStep}>
                        <ListItemIcon>
                            <SendIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText primary="Adicionar Passo" secondary="Atualiza o estado do pedido" />
                    </ListItem>
                    <ListItem component="button" onClick={handleAddAnnex}>
                        <ListItemIcon>
                            <AttachmentIcon color="secondary" />
                        </ListItemIcon>
                        <ListItemText primary="Adicionar Anexo" secondary="Fotos ou documentos" />
                    </ListItem>
                    <ListItem component="button" onClick={handleMarkComplete}>
                        <ListItemIcon>
                            <CheckIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary="Marcar Concluído" secondary="Finaliza o processo" />
                    </ListItem>
                    <ListItem component="button" onClick={handleNavigate}>
                        <ListItemIcon>
                            <CarIcon color="info" />
                        </ListItemIcon>
                        <ListItemText primary="Navegar até Local" secondary="Abre app de navegação" />
                    </ListItem>
                </List>
            </Box>
        </SwipeableDrawer>
    );

    return (
        <Box sx={{ p: 2, pb: 8 }}>
            {/* Filtros e seleção de vista */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <AssociateFilter
                            associates={associates}
                            selectedAssociate={selectedAssociate}
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
                                    <GridViewIcon />
                                </ToggleButton>
                                <ToggleButton value="list" aria-label="list view">
                                    <ListViewIcon />
                                </ToggleButton>
                            </ToggleButtonGroup>

                            <Tooltip title="Filtros avançados">
                                <IconButton>
                                    <FilterIcon />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Ordenar">
                                <IconButton>
                                    <SortIcon />
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
                            <DownloadIcon />
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
                            <EditIcon />
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
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">
                            Parâmetros do Serviço
                        </Typography>
                        <IconButton onClick={() => setParamsDialogOpen(false)}>
                            <CloseIcon />
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
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">
                            Concluir Serviço
                        </Typography>
                        <IconButton onClick={() => setCompleteDialogOpen(false)}>
                            <CloseIcon />
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
                    >
                        Confirmar Conclusão
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Drawers */}
            {renderDetailsDrawer()}
            {renderActionDrawer()}
        </Box>
    );
};

export default TabletOperations;