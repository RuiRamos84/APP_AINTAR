import React, { useState, useMemo } from 'react';
import {
    Box,
    Grid,
    Typography,
    Paper,
    Chip,
    alpha,
    useTheme,
    TablePagination,
    CircularProgress,
    Alert,
    Button,
    Tooltip
} from '@mui/material';
import {
    NotificationsActive as NotificationsActiveIcon,
    Assignment as AssignmentIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { useUI } from '../context/UIStateContext';
import DocumentCard from '../components/cards/DocumentCard';
import { notificationStyles } from '../../../styles/documentStyles';
import LateDocumentsAlert from '../components/LateDocumentsAlert';

const GridView = (props) => {
    const {
        documents = [],
        metaData,
        loading = false,
        error = null,
        onCreateDocument,
        onRefresh,
        showComprovativo = false,
        isAssignedToMe = false,
        isLateDocuments = false,
        onViewDetails,
        onAddStep,
        onAddAnnex,
        onReplicate,
        onDownloadComprovativo,
        density = 'standard',
    } = props;

    const theme = useTheme();
    const { searchTerm } = useUI();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedGroupId, setSelectedGroupId] = useState(null);

    const getStyleConfig = () => {
        switch (density) {
            case 'compact':
                return {
                    minHeight: 130,
                    fontSize: {
                        title: 'subtitle2',
                        entity: 'caption',
                        details: 'caption',
                        chip: { size: 'small', fontSize: '0.65rem' },
                    },
                    spacing: { content: 1, actions: 0.5 },
                };
            case 'comfortable':
                return {
                    minHeight: 220,
                    fontSize: {
                        title: 'h6',
                        entity: 'subtitle2',
                        details: 'body2',
                        chip: { size: 'medium', fontSize: '0.75rem' },
                    },
                    spacing: { content: 2, actions: 1 },
                };
            default:
                return {
                    minHeight: 180,
                    fontSize: {
                        title: 'subtitle1',
                        entity: 'body2',
                        details: 'caption',
                        chip: { size: 'small', fontSize: '0.7rem' },
                    },
                    spacing: { content: 1.5, actions: 0.75 },
                };
        }
    };

    const getStatusColor = (statusId) => {
        switch (parseInt(statusId)) {
            case -1: return theme.palette.grey[500];
            case 0: return theme.palette.success.main;
            case 1: return theme.palette.primary.main;
            case 2: return theme.palette.info.main;
            case 4: return theme.palette.warning.main;
            case 5: return theme.palette.secondary.main;
            case 6: return theme.palette.error.light;
            case 7: return theme.palette.primary.dark;
            case 8: return theme.palette.warning.dark;
            case 9: return theme.palette.info.dark;
            case 10: return theme.palette.success.dark;
            case 11: return theme.palette.secondary.dark;
            case 12: return theme.palette.error.main;
            case 13: return theme.palette.primary.light;
            case 100: return theme.palette.warning.light;
            default: return theme.palette.grey[400];
        }
    };

    const paginatedDocuments = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return documents.slice(start, start + itemsPerPage);
    }, [documents, currentPage, itemsPerPage]);

    const groupedDocuments = useMemo(() => {
        if (!isAssignedToMe || !metaData?.what || !Array.isArray(metaData.what)) {
            return null;
        }

        const groups = {};
        metaData.what.forEach((status) => {
            groups[status.pk] = {
                id: status.pk,
                title: status.step,
                items: [],
                color: getStatusColor(status.pk),
                hasNotifications: false,
                notificationCount: 0
            };
        });

        documents.forEach(doc => {
            const statusId = doc.what !== undefined ? doc.what : 1;
            if (groups[statusId]) {
                groups[statusId].items.push(doc);
                if (doc.notification === 1) {
                    groups[statusId].hasNotifications = true;
                    groups[statusId].notificationCount += 1;
                }
            }
        });

        const statusOrder = [1, 2, 4, 5, 6, 9, 11, 13, 8, 10, 7, 12, 100, 0, -1];
        const sortedGroups = Object.values(groups)
            .sort((a, b) => {
                const indexA = statusOrder.indexOf(parseInt(a.id));
                const indexB = statusOrder.indexOf(parseInt(b.id));
                return indexA - indexB;
            })
            .filter(group => group.items.length > 0);

        if (sortedGroups.length > 0 && selectedGroupId === null) {
            setSelectedGroupId(sortedGroups[0].id);
        }

        return sortedGroups;
    }, [documents, metaData, isAssignedToMe, selectedGroupId]);

    const handlePageChange = (event, newPage) => {
        setCurrentPage(newPage);
    };

    const handleItemsPerPageChange = (event) => {
        setItemsPerPage(parseInt(event.target.value, 10));
        setCurrentPage(0);
    };

    const handleChipClick = (groupId) => {
        setSelectedGroupId(groupId);
    };

    const getGridItemSize = () => {
        switch (density) {
            case 'compact': return { xs: 12, sm: 6, md: 4, lg: 3, xl: 2 };
            case 'comfortable': return { xs: 12, sm: 6, md: 4, lg: 3 };
            default: return { xs: 12, sm: 6, md: 4, lg: 3 };
        }
    };

    const getGridSpacing = () => {
        switch (density) {
            case 'compact': return 1;
            case 'comfortable': return 3;
            default: return 2;
        }
    };

    // CSS-in-JS para animações globais
    const globalKeyframes = {
        '@keyframes cardPulse': {
            '0%': {
                transform: 'scale(1.02)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.12)'
            },
            '50%': {
                transform: 'scale(1.03)',
                boxShadow: `0 8px 16px ${alpha(theme.palette.error.main, 0.3)}`
            },
            '100%': {
                transform: 'scale(1.02)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.12)'
            }
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                <Alert
                    severity="error"
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            onClick={onRefresh}
                            startIcon={<RefreshIcon />}
                        >
                            Tentar novamente
                        </Button>
                    }
                >
                    {error}
                </Alert>
            </Box>
        );
    }

    if (documents.length === 0) {
        return (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="300px">
                <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    Sem pedidos para mostrar
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Não existem pedidos disponíveis nesta vista.
                </Typography>
                <Button
                    variant="contained"
                    onClick={onCreateDocument}
                    startIcon={<AssignmentIcon />}
                >
                    Criar Novo Pedido
                </Button>
            </Box>
        );
    }

    // Visualização padrão (para todas as abas EXCETO "Para tratamento")
    if (!isAssignedToMe || !groupedDocuments) {
        return (
            <Box sx={globalKeyframes}>
                <Grid container spacing={getGridSpacing()}>
                    {paginatedDocuments.map((doc) => (
                        <Grid key={doc.pk} size={getGridItemSize()}>
                            <DocumentCard
                                document={doc}
                                metaData={metaData}
                                onViewDetails={onViewDetails}
                                onAddStep={onAddStep}
                                onAddAnnex={onAddAnnex}
                                onReplicate={onReplicate}
                                onDownloadComprovativo={onDownloadComprovativo}
                                density={density}
                                isAssignedToMe={isAssignedToMe}
                                showComprovativo={showComprovativo}
                            />
                        </Grid>
                    ))}
                </Grid>

                <Box sx={{ mt: 2 }}>
                    <TablePagination
                        component="div"
                        count={documents.length}
                        page={currentPage}
                        onPageChange={handlePageChange}
                        rowsPerPage={itemsPerPage}
                        onRowsPerPageChange={handleItemsPerPageChange}
                        rowsPerPageOptions={[5, 10, 25, 50, 100]}
                        labelRowsPerPage="Itens por página:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                    />
                </Box>
            </Box>
        );
    }

    // Secção para documentos em atraso
    if (isLateDocuments && !loading && !error && documents.length > 0) {
        const lateDocumentsWithDays = paginatedDocuments.filter(doc =>
            doc.days && parseInt(doc.days) > 0
        );

        const sortedDocuments = [...lateDocumentsWithDays].sort((a, b) => {
            const daysA = parseInt(a.days) || 0;
            const daysB = parseInt(b.days) || 0;
            return daysB - daysA;
        });

        return (
            <Box sx={globalKeyframes}>
                <LateDocumentsAlert documents={lateDocumentsWithDays} />

                <Grid container spacing={getGridSpacing()}>
                    {sortedDocuments.map((doc) => (
                        <Grid key={doc.pk} size={getGridItemSize()}>
                            <DocumentCard
                                document={doc}
                                metaData={metaData}
                                onViewDetails={onViewDetails}
                                onAddStep={onAddStep}
                                onAddAnnex={onAddAnnex}
                                onReplicate={onReplicate}
                                onDownloadComprovativo={onDownloadComprovativo}
                                density={density}
                                isAssignedToMe={false}
                                showComprovativo={showComprovativo}
                                isLateDocuments={true}
                                sx={{
                                    borderLeft: `6px solid ${parseInt(doc.days) > 365 ? theme.palette.error.dark :
                                        parseInt(doc.days) > 180 ? theme.palette.error.main :
                                            parseInt(doc.days) > 90 ? theme.palette.warning.main : theme.palette.info.main
                                        }`,
                                    transform: parseInt(doc.days) > 365 ? 'scale(1.02)' : 'scale(1)',
                                    boxShadow: parseInt(doc.days) > 365 ? 4 : 2,
                                    transition: 'all 0.3s ease',
                                    animation: parseInt(doc.days) > 700 ? 'cardPulse 3s ease-in-out infinite' : 'none',
                                    '&:hover': {
                                        transform: parseInt(doc.days) > 365
                                            ? 'scale(1.05) translateY(-8px)'
                                            : 'scale(1.02) translateY(-4px)',
                                        boxShadow: parseInt(doc.days) > 365 ? 8 : 6,
                                        borderLeftWidth: '8px'
                                    }
                                }}
                            />
                        </Grid>
                    ))}
                </Grid>

                {lateDocumentsWithDays.length === 0 && (
                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="300px">
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Não há documentos em atraso
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Todos os pedidos estão dentro do prazo.
                        </Typography>
                    </Box>
                )}

                <Box sx={{ mt: 2 }}>
                    <TablePagination
                        component="div"
                        count={lateDocumentsWithDays.length}
                        page={currentPage}
                        onPageChange={handlePageChange}
                        rowsPerPage={itemsPerPage}
                        onRowsPerPageChange={handleItemsPerPageChange}
                        rowsPerPageOptions={[5, 10, 25, 50, 100]}
                        labelRowsPerPage="Itens por página:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                    />
                </Box>
            </Box>
        );
    }

    // Encontrar o grupo selecionado
    const selectedGroup = groupedDocuments.find(group => group.id === selectedGroupId) || groupedDocuments[0];

    // Visualização agrupada com chips (APENAS para "Para tratamento")
    return (
        <Box sx={globalKeyframes}>
            {/* Chips com scroll horizontal */}
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
                {groupedDocuments.map(group => (
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
                            variant={selectedGroupId === group.id ? "filled" : "outlined"}
                            color={selectedGroupId === group.id ? "primary" : "default"}
                            sx={{
                                borderColor: group.color,
                                color: selectedGroupId === group.id ? undefined : group.color,
                                fontWeight: 'medium',
                                whiteSpace: 'nowrap',
                                '&:hover': {
                                    bgcolor: selectedGroupId === group.id ? undefined : alpha(group.color, 0.1)
                                },
                                bgcolor: selectedGroupId === group.id ? undefined : 'transparent'
                            }}
                            onClick={() => handleChipClick(group.id)}
                        />

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
                ))}
            </Box>

            {/* Mostra apenas o grupo selecionado */}
            {selectedGroup && (
                <Paper
                    sx={{
                        borderRadius: 1,
                        boxShadow: 2,
                        borderLeft: `4px solid ${selectedGroup.color}`,
                        overflow: 'hidden'
                    }}
                >
                    <Box
                        sx={{
                            p: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            bgcolor: alpha(selectedGroup.color, 0.08),
                            borderBottom: `1px solid ${alpha(selectedGroup.color, 0.2)}`,
                        }}
                    >
                        <Typography
                            variant="subtitle1"
                            fontWeight="bold"
                            sx={{ color: alpha(selectedGroup.color, 0.9) }}
                        >
                            {selectedGroup.title} - {selectedGroup.items.length} pedido{selectedGroup.items.length !== 1 ? 's' : ''}
                        </Typography>
                    </Box>

                    <Box sx={{ p: 2 }}>
                        <Grid container spacing={getGridSpacing()}>
                            {selectedGroup.items.map((doc) => (
                                <Grid key={`doc-${doc.pk}`} size={getGridItemSize()}>
                                    <DocumentCard
                                        document={doc}
                                        metaData={metaData}
                                        onViewDetails={onViewDetails}
                                        onAddStep={onAddStep}
                                        onAddAnnex={onAddAnnex}
                                        onReplicate={onReplicate}
                                        onDownloadComprovativo={onDownloadComprovativo}
                                        density={density}
                                        isAssignedToMe={isAssignedToMe}
                                        showComprovativo={showComprovativo}
                                        sx={{
                                            borderTop: `3px solid ${selectedGroup.color}`
                                        }}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </Paper>
            )}
        </Box>
    );
};

export default GridView;