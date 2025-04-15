// ListView.js - Com chips para filtrar por estados
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    IconButton,
    CircularProgress,
    TextField,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TableSortLabel,
    Checkbox,
    useTheme,
    Alert,
    Chip,
    Stack,
    Divider,
    Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    FilterList as FilterIcon,
    Clear as ClearIcon,
    Add as AddIcon,
    NotificationsActive as NotificationsActiveIcon
} from '@mui/icons-material';

// Componentes importados
import DocumentListItem from '../components/cards/DocumentListItem';
import DocumentFilters from '../components/filters/DocumentFilters';
// import { getStatusColor, getStatusColorValue } from '../utils/statusUtils';
import { notificationStyles } from '../styles/documentStyles';

const ListView = ({
    documents = [],
    metaData,
    loading = false,
    error = null,
    searchTerm = '',
    onSearchChange,
    filters = {},
    onFilterChange,
    onCreateDocument,
    onRefresh,
    showComprovativo = false,
    isAssignedToMe = false,  // Importante: determina se estamos na aba "Para tratamento"
    onViewDetails,
    onAddStep,
    onAddAnnex,
    onReplicate,
    onDownloadComprovativo,
    density = 'standard',
    page = 0,
    rowsPerPage = 10,
    count,
    onPageChange,
    onRowsPerPageChange,
    sortBy = 'regnumber',
    sortDirection = 'desc',
    onSort
}) => {
    const theme = useTheme();

    // Estados locais (para quando não controlados externamente)
    const [localPage, setLocalPage] = useState(page);
    const [localRowsPerPage, setLocalRowsPerPage] = useState(rowsPerPage);
    const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm || '');
    const [localFilters, setLocalFilters] = useState(filters || {
        status: '',
        associate: '',
        type: ''
    });
    const [localSortBy, setLocalSortBy] = useState(sortBy);
    const [localSortDirection, setLocalSortDirection] = useState(sortDirection);
    const [filterOpen, setFilterOpen] = useState(false);
    const [selected, setSelected] = useState([]);

    // Estado para controlar qual grupo de estado está selecionado (apenas para "Para tratamento")
    const [selectedStateId, setSelectedStateId] = useState(null);

    const getStatusColor = (statusId) => {
        switch (parseInt(statusId)) {
            case -1: return theme.palette.grey[500];     // ANULADO
            case 0: return theme.palette.success.main;   // CONCLUIDO
            case 1: return theme.palette.primary.main;   // ENTRADA
            case 2: return theme.palette.info.main;      // PARA VALIDAÇÃO
            case 4: return theme.palette.warning.main;   // PARA TRATAMENTO
            case 5: return theme.palette.secondary.main; // ANÁLISE EXTERNA
            case 6: return theme.palette.error.light;    // PEDIDO DE ELEMENTOS
            case 7: return theme.palette.primary.dark;   // EMISSÃO DE OFÍCIO
            case 8: return theme.palette.warning.dark;   // PARA PAVIMENTAÇÃO
            case 9: return theme.palette.info.dark;      // PARA AVALIAÇÃO NO TERRENO
            case 10: return theme.palette.success.dark;  // PARA EXECUÇÃO
            case 11: return theme.palette.secondary.dark; // PARA ORÇAMENTAÇÃO
            case 12: return theme.palette.error.main;    // PARA COBRANÇA
            case 13: return theme.palette.primary.light; // PARA ACEITAÇÃO DE ORÇAMENTO
            case 100: return theme.palette.warning.light; // PARA PAGAMENTO DE PAVIMENTAÇÃO
            default: return theme.palette.grey[400];     // Outros casos
        }
    };

    // Agrupar documentos por estado (apenas para "Para tratamento")
    const groupedByState = useMemo(() => {
        if (!isAssignedToMe || !metaData?.what) return null;

        const groups = {};

        // Inicializar grupos com base nos metadados
        metaData.what.forEach(status => {
            groups[status.pk] = {
                id: status.pk,
                title: status.step,
                items: [],
                color: getStatusColor(status.pk),
                hasNotifications: false,
                notificationCount: 0
            };
        });

        // Preencher os grupos com os documentos
        documents.forEach(doc => {
            const statusId = doc.what !== undefined ? doc.what : 1;
            if (groups[statusId]) {
                groups[statusId].items.push(doc);
                // Verificar notificações
                if (doc.notification === 1) {
                    groups[statusId].hasNotifications = true;
                    groups[statusId].notificationCount += 1;
                }
            }
        });

        // Ordenar grupos por prioridade de processo
        const statusOrder = [1, 2, 4, 5, 6, 9, 11, 13, 8, 10, 7, 12, 100, 0, -1];

        const sortedGroups = Object.values(groups)
            .sort((a, b) => {
                const indexA = statusOrder.indexOf(parseInt(a.id));
                const indexB = statusOrder.indexOf(parseInt(b.id));
                return indexA - indexB;
            })
            .filter(group => group.items.length > 0);  // Mostrar apenas grupos não vazios

        // Selecionar o primeiro grupo por padrão se nenhum estiver selecionado
        if (sortedGroups.length > 0 && selectedStateId === null) {
            setSelectedStateId(sortedGroups[0].id);
        }

        return sortedGroups;
    }, [documents, metaData, isAssignedToMe, selectedStateId]);

    // Sincronizar com props externas
    useEffect(() => {
        setLocalSearchTerm(searchTerm);
    }, [searchTerm]);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    useEffect(() => {
        setLocalPage(page);
    }, [page]);

    useEffect(() => {
        setLocalRowsPerPage(rowsPerPage);
    }, [rowsPerPage]);

    useEffect(() => {
        setLocalSortBy(sortBy);
    }, [sortBy]);

    useEffect(() => {
        setLocalSortDirection(sortDirection);
    }, [sortDirection]);

    // Filtrar documentos baseado no estado selecionado (para "Para tratamento")
    const filteredDocs = useMemo(() => {
        if (!isAssignedToMe || !groupedByState || selectedStateId === null) {
            return documents;
        }

        const selectedGroup = groupedByState.find(group => group.id === selectedStateId);
        return selectedGroup ? selectedGroup.items : [];
    }, [documents, isAssignedToMe, groupedByState, selectedStateId]);

    // Verificar se o componente é controlado externamente
    const isControlled = {
        search: typeof onSearchChange === 'function',
        filter: typeof onFilterChange === 'function',
        pagination: typeof onPageChange === 'function' && typeof onRowsPerPageChange === 'function',
        sort: typeof onSort === 'function'
    };

    // Handlers
    const handleSearch = (e) => {
        const value = e.target.value;
        setLocalSearchTerm(value);

        if (isControlled.search) {
            onSearchChange(value);
        }

        // Resetar página
        resetPage();
    };

    const resetPage = () => {
        if (isControlled.pagination) {
            onPageChange(null, 0);
        } else {
            setLocalPage(0);
        }
    };

    const toggleFilters = () => {
        setFilterOpen(!filterOpen);
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const updatedFilters = {
            ...localFilters,
            [name]: value
        };

        setLocalFilters(updatedFilters);

        if (isControlled.filter) {
            onFilterChange(name, value);
        }

        resetPage();
    };

    const handleResetFilters = () => {
        const emptyFilters = {
            status: '',
            associate: '',
            type: ''
        };

        setLocalFilters(emptyFilters);
        setLocalSearchTerm('');

        if (isControlled.filter) {
            Object.keys(emptyFilters).forEach(key => {
                onFilterChange(key, '');
            });
        }

        if (isControlled.search) {
            onSearchChange('');
        }

        resetPage();
    };

    const handleSortRequest = (field) => {
        const newDirection =
            field === localSortBy
                ? localSortDirection === 'asc' ? 'desc' : 'asc'
                : 'asc';

        setLocalSortBy(field);
        setLocalSortDirection(newDirection);

        if (isControlled.sort) {
            onSort(field);
        }

        resetPage();
    };

    // Handler para selecionar um estado específico (apenas para "Para tratamento")
    const handleStateChipClick = (stateId) => {
        setSelectedStateId(stateId);
        resetPage();
    };

    // Handlers de paginação
    const handleChangePage = (event, newPage) => {
        if (isControlled.pagination) {
            onPageChange(event, newPage);
        } else {
            setLocalPage(newPage);
        }
    };

    const handleChangeRowsPerPage = (event) => {
        const newValue = parseInt(event.target.value, 10);

        if (isControlled.pagination) {
            onRowsPerPageChange(event);
        } else {
            setLocalRowsPerPage(newValue);
            setLocalPage(0);
        }
    };

    // Seleção de linhas
    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = filteredDocs.map(n => n.pk);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };

    const handleSelectClick = (event, id) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = [...selected, id];
        } else if (selectedIndex === 0) {
            newSelected = selected.slice(1);
        } else if (selectedIndex === selected.length - 1) {
            newSelected = selected.slice(0, -1);
        } else if (selectedIndex > 0) {
            newSelected = [
                ...selected.slice(0, selectedIndex),
                ...selected.slice(selectedIndex + 1),
            ];
        }

        setSelected(newSelected);
    };

    const isSelected = (id) => selected.indexOf(id) !== -1;

    // Aplicar paginação
    const effectivePage = isControlled.pagination ? page : localPage;
    const effectiveRowsPerPage = isControlled.pagination ? rowsPerPage : localRowsPerPage;

    // Calcular documentos paginados
    const paginatedDocs = filteredDocs.slice(
        effectivePage * effectiveRowsPerPage,
        effectivePage * effectiveRowsPerPage + effectiveRowsPerPage
    );

    // Apenas para compatibilidade com o resto do código
    const effectiveSearchTerm = isControlled.search ? searchTerm : localSearchTerm;
    const effectiveFilters = isControlled.filter ? filters : localFilters;
    const effectiveSortBy = isControlled.sort ? sortBy : localSortBy;
    const effectiveSortDirection = isControlled.sort ? sortDirection : localSortDirection;

    // Determinar o tamanho da tabela baseado na densidade
    const getTableSize = () => {
        switch (density) {
            case 'compact': return 'small';
            case 'comfortable': return 'medium';
            case 'standard':
            default: return 'medium';
        }
    };

    // Renderizar conteúdo principal
    const renderContent = () => {
        if (loading) {
            return (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            );
        }

        if (error) {
            return (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <Alert
                        severity="error"
                        variant="filled"
                        sx={{ maxWidth: 500 }}
                        action={
                            <Button color="inherit" size="small" onClick={onRefresh}>
                                Tentar novamente
                            </Button>
                        }
                    >
                        {error}
                    </Alert>
                </Box>
            );
        }

        if (filteredDocs.length === 0) {
            return (
                <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
                    <Box sx={{ mb: 2 }}>
                        <SearchIcon sx={{ fontSize: 60, color: theme.palette.action.disabled }} />
                    </Box>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Nenhum pedido encontrado
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {(effectiveSearchTerm || Object.values(effectiveFilters).some(v => v !== ''))
                            ? 'Tente ajustar os filtros ou a pesquisa'
                            : 'Adicione um novo pedido para começar'}
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={onCreateDocument}
                    >
                        Novo Pedido
                    </Button>
                </Box>
            );
        }

        return (
            <TableContainer>
                <Table size={getTableSize()}>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selected.length > 0 && selected.length < filteredDocs.length}
                                    checked={filteredDocs.length > 0 && selected.length === filteredDocs.length}
                                    onChange={handleSelectAllClick}
                                    inputProps={{ 'aria-label': 'selecionar todos' }}
                                />
                            </TableCell>
                            <TableCell sortDirection={effectiveSortBy === 'regnumber' ? effectiveSortDirection : false}>
                                <TableSortLabel
                                    active={effectiveSortBy === 'regnumber'}
                                    direction={effectiveSortBy === 'regnumber' ? effectiveSortDirection : 'asc'}
                                    onClick={() => handleSortRequest('regnumber')}
                                >
                                    Número
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Entidade</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell sortDirection={effectiveSortBy === 'submission' ? effectiveSortDirection : false}>
                                <TableSortLabel
                                    active={effectiveSortBy === 'submission'}
                                    direction={effectiveSortBy === 'submission' ? effectiveSortDirection : 'asc'}
                                    onClick={() => handleSortRequest('submission')}
                                >
                                    Data
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedDocs.map((doc) => {
                            const isItemSelected = isSelected(doc.pk);

                            return (
                                <DocumentListItem
                                    key={doc.pk}
                                    document={doc}
                                    metaData={metaData}
                                    isSelected={isItemSelected}
                                    onClick={(event) => handleSelectClick(event, doc.pk)}
                                    onViewDetails={onViewDetails}
                                    onAddStep={onAddStep}
                                    onAddAnnex={onAddAnnex}
                                    onReplicate={onReplicate}
                                    onDownloadComprovativo={onDownloadComprovativo}
                                    isAssignedToMe={isAssignedToMe}
                                    showComprovativo={showComprovativo}
                                />
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    return (
        <Box>
            {/* Chips de filtro por estado (fora do Paper principal) */}
            {isAssignedToMe && groupedByState && (
                <>
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2
                    }}>
                        {/* <Typography variant="subtitle1" color="text.secondary">
                            {documents.length} pedido{documents.length !== 1 ? 's' : ''} em {groupedByState.length} estado{groupedByState.length !== 1 ? 's' : ''}
                        </Typography> */}
                    </Box>

                    {/* Container com scroll horizontal para os chips */}
                    <Box
                        sx={{
                            mb: 3,
                            p: 1.5,
                            backgroundColor: alpha(theme.palette.background.paper, 0.6),
                            borderRadius: 1,
                            boxShadow: 1,
                            // Estilos para o scroll horizontal
                            display: 'flex',
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            flexWrap: 'nowrap',
                            // Altura fixa para evitar saltos no layout
                            minHeight: density === 'compact' ? 54 : 64,
                            // Estilização do scrollbar para ficar mais elegante
                            '&::-webkit-scrollbar': {
                                height: '6px',
                            },
                            '&::-webkit-scrollbar-track': {
                                backgroundColor: alpha(theme.palette.background.paper, 0.3),
                                borderRadius: '3px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                                borderRadius: '3px',
                                '&:hover': {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.4),
                                }
                            }
                        }}
                    >
                        {groupedByState.map((group) => {
                            // Obter o valor da cor como string ou usar um fallback
                            const colorValue = group.color || theme.palette.grey[500];

                            return (
                                <Box
                                    key={`chip-container-${group.id}`}
                                    sx={{
                                        position: 'relative',
                                        mr: 2,
                                        minWidth: 'fit-content',
                                        display: 'inline-block',
                                        flexShrink: 0
                                    }}
                                >
                                    <Chip
                                        label={`${group.title} (${group.items.length})`}
                                        size={density === 'compact' ? "small" : "medium"}
                                        variant={selectedStateId === group.id ? "filled" : "outlined"}
                                        color={selectedStateId === group.id ? "primary" : "default"}
                                        sx={{
                                            borderColor: colorValue,
                                            color: selectedStateId === group.id ? undefined : colorValue,
                                            fontWeight: 'medium',
                                            whiteSpace: 'nowrap',
                                            '&:hover': {
                                                bgcolor: selectedStateId === group.id ? undefined : alpha(colorValue, 0.1)
                                            },
                                            bgcolor: selectedStateId === group.id ? undefined : 'transparent'
                                        }}
                                        onClick={() => handleStateChipClick(group.id)}
                                    />

                                    {/* Sino animado COM TOOLTIP */}
                                    {group.hasNotifications && (
                                        <Tooltip
                                            title={`${group.notificationCount} ${group.notificationCount === 1 ? 'notificação' : 'notificações'} em "${group.title}"`}
                                            arrow
                                            placement="top"
                                        >
                                            <Box sx={notificationStyles.chipNotification}>
                                                <NotificationsActiveIcon sx={notificationStyles.bellIcon(true)} />
                                            </Box>
                                        </Tooltip>
                                    )}
                                </Box>
                            );
                        })}
                    </Box>
                </>
            )}

            {/* Paper com conteúdo principal */}
            <Paper
                sx={{
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 'calc(96vh - 280px)',
                    position: 'relative'
                }}
            >
                {/* Lista de documentos */}
                <Box sx={{ flexGrow: 1, overflowX: 'auto' }}>
                    {renderContent()}
                </Box>

                {/* Paginação */}
                {filteredDocs.length > 0 && (
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={isControlled.pagination && count !== undefined ? count : filteredDocs.length}
                        rowsPerPage={effectiveRowsPerPage}
                        page={effectivePage}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Linhas por página:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                    />
                )}
            </Paper>
        </Box>
    );
};

export default ListView;