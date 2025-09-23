import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    InputAdornment,
    IconButton,
    Chip,
    CircularProgress,
    Alert,
    useTheme,
    useMediaQuery,
    alpha
} from '@mui/material';
import {
    Search as SearchIcon,
    Clear as ClearIcon,
    Info as InfoIcon
} from '@mui/icons-material';

// Drag and Drop
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Componentes
import KanbanCard from '../components/cards/KanbanCard';
import EmptyState from '../components/common/EmptyState';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * Vista Kanban moderna com funcionalidade drag-and-drop
 */
const DocumentKanbanView = ({
    documents = [],
    virtualProps = {},
    loading = false,
    error = null,
    metaData = {},
    searchTerm = '',
    onSearchChange,
    onRefresh,
    onViewDetails,
    onAddStep,
    density = 'standard'
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [kanbanData, setKanbanData] = useState({});
    const [isInfoOpen, setIsInfoOpen] = useState(true);

    // Agrupar documentos por status
    useEffect(() => {
        if (metaData?.what && documents.length > 0) {
            // Criar colunas a partir dos metadados
            const columns = {};

            metaData.what.forEach((status, index) => {
                columns[status.pk] = {
                    id: status.pk,
                    title: status.step,
                    items: documents.filter(doc => doc.what === status.pk),
                    order: index,
                    color: getStatusColor(status.pk, theme)
                };
            });

            setKanbanData(columns);
        }
    }, [documents, metaData, theme]);

    // Função para obter a cor baseada no status
    const getStatusColor = (statusId, theme) => {
        // Mapear cores baseadas no ID do status
        switch (parseInt(statusId)) {
            case 0: return theme.palette.success.main; // Concluído
            case 1: return theme.palette.warning.main; // Em progresso
            case 2: return theme.palette.primary.main; // Novo
            case 3: return theme.palette.error.main;   // Bloqueado
            case 4: return theme.palette.info.main;    // Em revisão
            default: return theme.palette.grey[500];   // Outro
        }
    };

    // Filtrar colunas Kanban
    const filteredKanbanData = kanbanData;

    // Manipulador de arrastar e soltar
    const handleDragEnd = (result) => {
        const { source, destination } = result;

        // Se não houver destino válido
        if (!destination) return;

        // Se arrastar para o mesmo lugar
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) return;

        // Obter coluna de origem e destino
        const sourceColumn = kanbanData[source.droppableId];
        const destColumn = kanbanData[destination.droppableId];

        // Mover dentro da mesma coluna
        if (source.droppableId === destination.droppableId) {
            const newItems = [...sourceColumn.items];
            const [removed] = newItems.splice(source.index, 1);
            newItems.splice(destination.index, 0, removed);

            setKanbanData({
                ...kanbanData,
                [source.droppableId]: {
                    ...sourceColumn,
                    items: newItems
                }
            });
        }
        // Mover entre colunas
        else {
            const sourceItems = [...sourceColumn.items];
            const destItems = [...destColumn.items];
            const [removed] = sourceItems.splice(source.index, 1);

            // Aqui pode adicionar lógica para atualizar o status do documento no backend
            const updatedItem = {
                ...removed,
                what: parseInt(destination.droppableId)
            };

            destItems.splice(destination.index, 0, updatedItem);

            setKanbanData({
                ...kanbanData,
                [source.droppableId]: {
                    ...sourceColumn,
                    items: sourceItems
                },
                [destination.droppableId]: {
                    ...destColumn,
                    items: destItems
                }
            });

            // Exemplo: atualizar no backend
            // updateDocumentStatus(removed.pk, destination.droppableId);
        }
    };

    // Configurações baseadas na densidade
    const getColumnConfig = () => {
        switch (density) {
            case 'compact':
                return {
                    width: 260,
                    padding: 1,
                    gap: 1
                };
            case 'comfortable':
                return {
                    width: 340,
                    padding: 2,
                    gap: 2
                };
            case 'standard':
            default:
                return {
                    width: 300,
                    padding: 2,
                    gap: 1.5
                };
        }
    };

    const columnConfig = getColumnConfig();

    // Renderizar estado de carregamento
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
            </Box>
        );
    }

    // Renderizar estado de erro
    if (error) {
        return (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                <Alert
                    severity="error"
                    action={
                        <IconButton
                            color="inherit"
                            size="small"
                            onClick={onRefresh}
                        >
                            <RefreshIcon />
                        </IconButton>
                    }
                >
                    {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Barra superior */}
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Campo de pesquisa */}
                {/* <TextField
                    fullWidth
                    variant="outlined"
                    size={isMobile ? "small" : "medium"}
                    placeholder="Pesquisar em todas as colunas..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                        endAdornment: searchTerm && (
                            <InputAdornment position="end">
                                <IconButton
                                    edge="end"
                                    onClick={() => onSearchChange('')}
                                    size="small"
                                >
                                    <ClearIcon />
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                /> */}

                {/* Dica informativa */}
                {isInfoOpen && (
                    <Alert
                        severity="info"
                        icon={<InfoIcon />}
                        onClose={() => setIsInfoOpen(false)}
                        sx={{
                            '& .MuiAlert-message': {
                                display: 'flex',
                                alignItems: 'center'
                            }
                        }}
                    >
                        <Typography variant="body2">
                            Arraste os pedidos entre colunas para atualizar o seu estado.
                        </Typography>
                    </Alert>
                )}
            </Box>

            {/* Área do Kanban */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <Box
                    sx={{
                        display: 'flex',
                        flexGrow: 1,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        p: 1,
                        '&::-webkit-scrollbar': {
                            height: 8,
                            width: 8
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.2),
                            borderRadius: 4
                        }
                    }}
                >
                    {Object.entries(filteredKanbanData)
                        .sort(([, a], [, b]) => a.order - b.order)
                        .map(([columnId, column]) => (
                            <Box
                                key={columnId}
                                sx={{
                                    minWidth: columnConfig.width,
                                    maxWidth: columnConfig.width,
                                    mx: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%'
                                }}
                            >
                                <Paper
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%',
                                        bgcolor: alpha(column.color, 0.05),
                                        borderTop: `3px solid ${column.color}`,
                                        borderRadius: 1,
                                        overflow: 'hidden'
                                    }}
                                    elevation={1}
                                >
                                    {/* Cabeçalho da coluna */}
                                    <Box
                                        sx={{
                                            p: columnConfig.padding,
                                            pb: 1,
                                            borderBottom: `1px solid ${theme.palette.divider}`,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            bgcolor: alpha(column.color, 0.08)
                                        }}
                                    >
                                        <Typography
                                            variant={isMobile ? "subtitle2" : "subtitle1"}
                                            fontWeight="bold"
                                            noWrap
                                        >
                                            {column.title}
                                        </Typography>
                                        <Chip
                                            label={column.items.length}
                                            size="small"
                                            sx={{
                                                bgcolor: alpha(column.color, 0.2),
                                                color: column.color,
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    </Box>

                                    {/* Lista de cartões */}
                                    <Droppable droppableId={columnId}>
                                        {(provided, snapshot) => (
                                            <Box
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                sx={{
                                                    p: 1,
                                                    flexGrow: 1,
                                                    minHeight: '100px',
                                                    overflowY: 'auto',
                                                    overflowX: 'hidden',
                                                    bgcolor: snapshot.isDraggingOver
                                                        ? alpha(column.color, 0.1)
                                                        : 'transparent',
                                                    transition: 'background-color 0.2s ease',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: columnConfig.gap,
                                                    '&::-webkit-scrollbar': {
                                                        width: 6
                                                    },
                                                    '&::-webkit-scrollbar-thumb': {
                                                        backgroundColor: alpha(column.color, 0.3),
                                                        borderRadius: 3
                                                    }
                                                }}
                                            >
                                                {column.items.map((item, index) => (
                                                    <Draggable
                                                        key={item.pk}
                                                        draggableId={item.pk.toString()}
                                                        index={index}
                                                    >
                                                        {(provided, snapshot) => (
                                                            <Box
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                sx={{
                                                                    userSelect: 'none'
                                                                }}
                                                            >
                                                                <KanbanCard
                                                                    document={item}
                                                                    metaData={metaData}
                                                                    onViewDetails={onViewDetails}
                                                                    onAddStep={onAddStep ? () => onAddStep(item) : null}
                                                                    isDragging={snapshot.isDragging}
                                                                    density={density}
                                                                />
                                                            </Box>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}

                                                {/* Estado vazio para a coluna */}
                                                {column.items.length === 0 && (
                                                    <Box
                                                        sx={{
                                                            height: 100,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: `1px dashed ${alpha(column.color, 0.3)}`,
                                                            borderRadius: 1,
                                                            my: 1
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{ fontStyle: 'italic' }}
                                                        >
                                                            Sem pedidos
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        )}
                                    </Droppable>
                                </Paper>
                            </Box>
                        ))}
                </Box>
            </DragDropContext>
        </Box>
    );
};

export default DocumentKanbanView;