import React, { useState, useCallback, useMemo } from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemSecondaryAction,
    Avatar,
    Chip,
    Button,
    Divider,
    Tooltip,
    Badge,
    Paper,
    Stack,
    Alert,
    Fade,
    Collapse
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    Close as CloseIcon,
    MarkEmailRead as MarkReadIcon,
    Visibility as ViewIcon,
    Person as PersonIcon,
    Description as DocumentIcon,
    CheckCircle as CheckIcon,
    Schedule as TimeIcon,
    DoneAll as DoneAllIcon
} from '@mui/icons-material';
import { useDocumentNotifications } from '../../contexts/DocumentNotificationContext';

/**
 * Centro de notificações para documentos - Design elegante e funcional
 */
const DocumentNotificationCenter = ({
    open,
    onClose,
    anchor = 'right',
    width = 400
}) => {
    const {
        documentNotifications,
        unreadCount,
        markNotificationAsRead,
        markAllAsRead,
        handleViewDocument: openDocument,
        formatTimestamp
    } = useDocumentNotifications();

    const [filter, setFilter] = useState('all'); // 'all', 'unread', 'transfers', 'updates'
    const [expandedItem, setExpandedItem] = useState(null);

    // =========================================================================
    // FILTERING E SORTING
    // =========================================================================

    const filteredNotifications = useMemo(() => {
        let filtered = [...documentNotifications];

        switch (filter) {
            case 'unread':
                filtered = filtered.filter(notif => !notif.read);
                break;
            case 'transfers':
                filtered = filtered.filter(notif => notif.type === 'document_transfer');
                break;
            case 'updates':
                filtered = filtered.filter(notif => notif.type === 'document_status_update');
                break;
            case 'rejected':
                filtered = filtered.filter(notif => notif.type === 'document_rejected');
                break;
        }

        return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [documentNotifications, filter]);

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    const handleNotificationClick = useCallback((notification) => {
        // Marcar como lida se não estiver
        if (!notification.read) {
            markNotificationAsRead(notification.id);
        }

        // Expandir/colapsar detalhes
        setExpandedItem(expandedItem === notification.id ? null : notification.id);
    }, [markNotificationAsRead, expandedItem]);

    const handleViewDocument = useCallback((documentId, notification) => {
        markNotificationAsRead(notification.id);
        openDocument(documentId);
        onClose(); // Fechar painel
    }, [markNotificationAsRead, openDocument, onClose]);

    // =========================================================================
    // RENDER HELPERS
    // =========================================================================

    const getNotificationIcon = useCallback((notification) => {
        switch (notification.type) {
            case 'document_transfer':
                return notification.isReceiver ? '📬' : '📤';
            case 'document_status_update':
                return '📋';
            case 'document_rejected':
                return '🔄';
            default:
                return '📄';
        }
    }, []);

    const getNotificationColor = useCallback((notification) => {
        if (!notification.read) {
            switch (notification.priority) {
                case 'high': return 'error';
                case 'medium': return 'warning';
                default: return 'info';
            }
        }
        return 'default';
    }, []);

    const renderNotificationDetails = useCallback((notification) => {
        const isExpanded = expandedItem === notification.id;

        return (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Stack spacing={1}>
                        {notification.metadata?.memo && (
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Observações:
                                </Typography>
                                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                    "{notification.metadata.memo}"
                                </Typography>
                            </Box>
                        )}

                        {notification.metadata?.attachmentCount > 0 && (
                            <Chip
                                size="small"
                                icon={<DocumentIcon />}
                                label={`${notification.metadata.attachmentCount} anexo${notification.metadata.attachmentCount > 1 ? 's' : ''}`}
                                variant="outlined"
                                sx={{ alignSelf: 'flex-start' }}
                            />
                        )}

                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<ViewIcon />}
                                onClick={() => handleViewDocument(notification.documentId, notification)}
                            >
                                Ver Documento
                            </Button>

                            {!notification.read && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<MarkReadIcon />}
                                    onClick={() => markNotificationAsRead(notification.id)}
                                >
                                    Marcar como Lida
                                </Button>
                            )}
                        </Box>
                    </Stack>
                </Box>
            </Collapse>
        );
    }, [expandedItem, handleViewDocument, markNotificationAsRead]);

    const renderNotificationItem = useCallback((notification, index) => {
        const isExpanded = expandedItem === notification.id;

        return (
            <Fade in key={notification.id} timeout={300 + index * 100}>
                <Paper
                    elevation={notification.read ? 0 : 2}
                    sx={{
                        mb: 1,
                        bgcolor: notification.read ? 'background.paper' : 'primary.50',
                        border: notification.read ? '1px solid' : '2px solid',
                        borderColor: notification.read ? 'divider' : 'primary.200',
                        transition: 'all 0.3s ease',
                        '&:hover': { elevation: 4 }
                    }}
                >
                    <ListItem
                        button
                        onClick={() => handleNotificationClick(notification)}
                        sx={{
                            py: 2,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' }
                        }}
                    >
                        <ListItemAvatar>
                            <Avatar
                                sx={{
                                    bgcolor: getNotificationColor(notification) + '.main',
                                    color: 'white'
                                }}
                            >
                                {getNotificationIcon(notification)}
                            </Avatar>
                        </ListItemAvatar>

                        <ListItemText
                            primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography
                                        variant="subtitle2"
                                        sx={{
                                            fontWeight: notification.read ? 'normal' : 'bold',
                                            flex: 1
                                        }}
                                    >
                                        {notification.title}
                                    </Typography>
                                    {!notification.read && (
                                        <Badge
                                            variant="dot"
                                            color="primary"
                                            sx={{ '& .MuiBadge-dot': { height: 8, width: 8 } }}
                                        />
                                    )}
                                </Box>
                            }
                            secondary={
                                <Box>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 0.5 }}
                                    >
                                        {notification.message}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            size="small"
                                            label={`Doc. ${notification.documentNumber}`}
                                            variant="outlined"
                                        />
                                        <Typography variant="caption" color="text.disabled">
                                            {formatTimestamp(notification.timestamp)}
                                        </Typography>
                                    </Box>
                                </Box>
                            }
                        />

                        <ListItemSecondaryAction>
                            <IconButton
                                edge="end"
                                size="small"
                                sx={{
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.3s ease'
                                }}
                            >
                                <TimeIcon />
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>

                    {renderNotificationDetails(notification)}
                </Paper>
            </Fade>
        );
    }, [expandedItem, handleNotificationClick, getNotificationColor, getNotificationIcon, formatTimestamp, renderNotificationDetails]);

    // =========================================================================
    // RENDER FILTERS
    // =========================================================================

    const filterOptions = [
        { key: 'all', label: 'Todas', count: documentNotifications.length },
        { key: 'unread', label: 'Não lidas', count: unreadCount },
        { key: 'transfers', label: 'Transferências', count: documentNotifications.filter(n => n.type === 'document_transfer').length },
        { key: 'updates', label: 'Actualizações', count: documentNotifications.filter(n => n.type === 'document_status_update').length }
    ];

    // =========================================================================
    // MAIN RENDER
    // =========================================================================

    return (
        <Drawer
            anchor={anchor}
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: width,
                    bgcolor: 'background.default'
                }
            }}
        >
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box sx={{
                    p: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <NotificationsIcon />
                            <Typography variant="h6" fontWeight="bold">
                                Notificações de Documentos
                            </Typography>
                            {unreadCount > 0 && (
                                <Badge
                                    badgeContent={unreadCount}
                                    color="error"
                                    sx={{ '& .MuiBadge-badge': { bgcolor: 'error.light' } }}
                                />
                            )}
                        </Box>
                        <IconButton
                            onClick={onClose}
                            sx={{ color: 'inherit' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>

                {/* Action Bar */}
                {documentNotifications.length > 0 && (
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            {filterOptions.map(option => (
                                <Chip
                                    key={option.key}
                                    label={`${option.label} (${option.count})`}
                                    variant={filter === option.key ? 'filled' : 'outlined'}
                                    color={filter === option.key ? 'primary' : 'default'}
                                    size="small"
                                    clickable
                                    onClick={() => setFilter(option.key)}
                                />
                            ))}
                        </Stack>

                        {unreadCount > 0 && (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<DoneAllIcon />}
                                onClick={markAllAsRead}
                                fullWidth
                            >
                                Marcar Todas como Lidas ({unreadCount})
                            </Button>
                        )}
                    </Box>
                )}

                {/* Content */}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    {filteredNotifications.length === 0 ? (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            p: 3,
                            textAlign: 'center'
                        }}>
                            <NotificationsIcon
                                sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }}
                            />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                {filter === 'unread' ? 'Sem notificações não lidas' : 'Sem notificações'}
                            </Typography>
                            <Typography variant="body2" color="text.disabled">
                                {filter === 'unread'
                                    ? 'Todas as suas notificações foram lidas'
                                    : 'As notificações de documentos aparecerão aqui'
                                }
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
                            <List disablePadding>
                                {filteredNotifications.map((notification, index) =>
                                    renderNotificationItem(notification, index)
                                )}
                            </List>
                        </Box>
                    )}
                </Box>

                {/* Footer Info */}
                {documentNotifications.length > 0 && (
                    <Box sx={{
                        p: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'grey.50'
                    }}>
                        <Typography variant="caption" color="text.secondary" align="center" display="block">
                            {documentNotifications.length} notificação{documentNotifications.length !== 1 ? 'ões' : ''} •
                            Últimas 7 dias
                        </Typography>
                    </Box>
                )}
            </Box>
        </Drawer>
    );
};

export default DocumentNotificationCenter;