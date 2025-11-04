// ListView.js - Corrigido e otimizado
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    CircularProgress,
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
    Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Search as SearchIcon,
    Add as AddIcon,
    NotificationsActive as NotificationsActiveIcon
} from '@mui/icons-material';

// Componentes importados
import DocumentListItem from '../components/cards/DocumentListItem';
import { notificationStyles } from '../styles/documentStyles';

// Mover funções utilitárias para fora do componente
const getStatusColor = (statusId, theme) => {
    const statusIdNum = parseInt(statusId);
    switch (statusIdNum) {
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

// Componente para os chips de estado
const StatusChips = React.memo(({
    groupedByState,
    selectedStateId,
    onChipClick,
    density,
    theme
}) => {
    if (!groupedByState || groupedByState.length === 0) return null;

    return (
        <Box
            sx={{
                mb: 3,
                p: 1.5,
                backgroundColor: alpha(theme.palette.background.paper, 0.6),
                borderRadius: 1,
                boxShadow: 1,
                display: 'flex',
                overflowX: 'auto',
                overflowY: 'hidden',
                flexWrap: 'nowrap',
                minHeight: density === 'compact' ? 54 : 64,
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
                            onClick={() => onChipClick(group.id)}
                        />

                        {/* Sino de notificação com Tooltip estável */}
                        {group.hasNotifications && (
                            <NotificationBadge
                                count={group.notificationCount}
                                title={group.title}
                            />
                        )}
                    </Box>
                );
            })}
        </Box>
    );
});

// Componente separado para o badge de notificação
const NotificationBadge = React.memo(({ count, title }) => (
    <Tooltip
        title={`${count} ${count === 1 ? 'notificação' : 'notificações'} em "${title}"`}
        arrow
        placement="top"
    >
        <div style={{ position: 'absolute', top: -8, right: -8 }}>
            <NotificationsActiveIcon sx={notificationStyles.tableNotification} />
        </div>
    </Tooltip>
));

// Componente principal
const ListView = (props) => {
    const {
        documents = [],
        metaData,
        loading = false,
        error = null,
        searchTerm = '',
        filters = {},
        onCreateDocument,
        onRefresh,
        showComprovativo = false,
        isAssignedToMe = false,
        isLateDocuments = false,
        onViewDetails,
        onAddStep,
        onAddAnnex,
        onReplicate,
        onCreateEmission,
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
    } = props;

    const theme = useTheme();
    const [selected, setSelected] = useState([]);
    const [selectedStateId, setSelectedStateId] = useState(null);
    const initialStateIdSet = useRef(false);

    // Adicionar estados locais para paginação interna 
    const [currentPage, setCurrentPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Usar memoização para props controladas e estados locais
    const isControlled = useMemo(() => ({
        pagination: typeof onPageChange === 'function' && typeof onRowsPerPageChange === 'function',
        sort: typeof onSort === 'function'
    }), [onPageChange, onRowsPerPageChange, onSort]);

    // Agrupar documentos por estado (apenas para "Para tratamento")
    // IMPORTANTE: Declarar antes das funções que usam esta variável
    const groupedByState = useMemo(() => {
        if (!isAssignedToMe || !metaData?.what) return null;

        const groups = {};

        // Inicializar grupos com base nos metadados
        metaData.what.forEach(status => {
            groups[status.pk] = {
                id: status.pk,
                title: status.step,
                items: [],
                color: getStatusColor(status.pk, theme),
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

        return Object.values(groups)
            .sort((a, b) => {
                const indexA = statusOrder.indexOf(parseInt(a.id));
                const indexB = statusOrder.indexOf(parseInt(b.id));
                return indexA - indexB;
            })
            .filter(group => group.items.length > 0);
    }, [documents, metaData, isAssignedToMe, theme]);

    // Corrigir a lógica de inicialização do estado selecionado
    useEffect(() => {
        // Executar apenas quando os grupos estiverem disponíveis
        if (!initialStateIdSet.current && groupedByState && groupedByState.length > 0) {
            initialStateIdSet.current = true;
            setSelectedStateId(groupedByState[0].id);
        }
    }, [groupedByState]);

    // Filtrar documentos baseado no estado selecionado (para "Para tratamento")
    // IMPORTANTE: Declarar antes das funções que dependem dela
    const filteredDocs = useMemo(() => {
        if (!isAssignedToMe || !groupedByState) {
            return documents;
        }

        // Se selectedStateId for null, retorna todos os documentos
        if (selectedStateId === null) {
            return documents;
        }

        const selectedGroup = groupedByState.find(group => group.id === selectedStateId);
        return selectedGroup ? selectedGroup.items : documents;
    }, [documents, isAssignedToMe, groupedByState, selectedStateId]);

    // IMPORTANTE: Funções agora estão depois de filteredDocs
    // Handlers seguros, passam a referência a documentos atuais
    const handleSelectAllClick = useCallback((event) => {
        if (event.target.checked) {
            const allIds = filteredDocs.map(doc => doc.pk);
            setSelected(allIds);
        } else {
            setSelected([]);
        }
    }, [filteredDocs]);

    const handleSelectClick = useCallback((event, id) => {
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
    }, [selected]);

    // Aplicar paginação
    const paginatedDocs = useMemo(() => {
        // Se a paginação é controlada externamente, usar as props fornecidas
        if (isControlled.pagination) {
            return filteredDocs.slice(
                page * rowsPerPage,
                page * rowsPerPage + rowsPerPage
            );
        }
        // Caso contrário, usar o estado local
        else {
            return filteredDocs.slice(
                currentPage * itemsPerPage,
                currentPage * itemsPerPage + itemsPerPage
            );
        }
    }, [filteredDocs, isControlled.pagination, page, rowsPerPage, currentPage, itemsPerPage]);

    // Tratadores de eventos memoizados
    const handleSortRequest = useCallback((field) => {
        const newDirection = field === sortBy
            ? sortDirection === 'asc' ? 'desc' : 'asc'
            : 'asc';

        if (isControlled.sort && onSort) {
            onSort(field, newDirection);
        }
    }, [sortBy, sortDirection, isControlled.sort, onSort]);

    const handleStateChipClick = useCallback((stateId) => {
        setSelectedStateId(stateId);

        // Resetar paginação
        if (isControlled.pagination && onPageChange) {
            onPageChange(null, 0);
        }
    }, [isControlled.pagination, onPageChange]);

    const handleChangePage = useCallback((event, newPage) => {
        if (isControlled.pagination && onPageChange) {
            onPageChange(event, newPage);
        }
    }, [isControlled.pagination, onPageChange]);

    const handleChangeRowsPerPage = useCallback((event) => {
        const newValue = parseInt(event.target.value, 10);

        if (isControlled.pagination && onRowsPerPageChange) {
            onRowsPerPageChange(event);

            // Resetar para primeira página
            if (onPageChange) {
                onPageChange(null, 0);
            }
        }
    }, [isControlled.pagination, onRowsPerPageChange, onPageChange]);

    // Determinar o tamanho da tabela baseado na densidade
    const getTableSize = useCallback(() => {
        switch (density) {
            case 'compact': return 'small';
            case 'comfortable': return 'medium';
            default: return 'medium';
        }
    }, [density]);

    // Verificar se um item está selecionado
    const isSelected = useCallback((id) => selected.indexOf(id) !== -1, [selected]);

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
                        {(searchTerm || Object.values(filters).some(v => v !== ''))
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
                            <TableCell sortDirection={sortBy === 'regnumber' ? sortDirection : false}>
                                <TableSortLabel
                                    active={sortBy === 'regnumber'}
                                    direction={sortBy === 'regnumber' ? sortDirection : 'asc'}
                                    onClick={() => handleSortRequest('regnumber')}
                                >
                                    Número
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Entidade</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell sortDirection={sortBy === 'submission' ? sortDirection : false}>
                                <TableSortLabel
                                    active={sortBy === 'submission'}
                                    direction={sortBy === 'submission' ? sortDirection : 'asc'}
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
                        {paginatedDocs.map((doc) => (
                            <DocumentListItem
                                key={doc.pk}
                                document={doc}
                                metaData={metaData}
                                isSelected={isSelected(doc.pk)}
                                onClick={(event) => handleSelectClick(event, doc.pk)}
                                onViewDetails={onViewDetails}
                                onAddStep={onAddStep}
                                onAddAnnex={onAddAnnex}
                                onReplicate={onReplicate}
                                onCreateEmission={onCreateEmission}
                                onDownloadComprovativo={onDownloadComprovativo}
                                isAssignedToMe={isAssignedToMe}
                                showComprovativo={showComprovativo}
                                isLateDocuments={isLateDocuments}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    return (
        <Box>
            {/* Chips de filtro por estado (apenas para "Para tratamento") */}
            {isAssignedToMe && groupedByState && groupedByState.length > 0 && (
                <StatusChips
                    groupedByState={groupedByState}
                    selectedStateId={selectedStateId}
                    onChipClick={handleStateChipClick}
                    density={density}
                    theme={theme}
                />
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
                        rowsPerPageOptions={[10, 25, 50]}
                        component="div"
                        count={isControlled.pagination && count !== undefined ? count : filteredDocs.length}
                        rowsPerPage={isControlled.pagination ? rowsPerPage : itemsPerPage}
                        page={isControlled.pagination ? page : currentPage}
                        onPageChange={isControlled.pagination ? handleChangePage : (e, newPage) => setCurrentPage(newPage)}
                        onRowsPerPageChange={isControlled.pagination ? handleChangeRowsPerPage : (e) => {
                            const newValue = parseInt(e.target.value, 10);
                            setItemsPerPage(newValue);
                            setCurrentPage(0); // Resetar para a primeira página (0-indexed)
                        }}
                        labelRowsPerPage="Linhas por página:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                    />
                )}
            </Paper>
        </Box>
    );
};

export default ListView;