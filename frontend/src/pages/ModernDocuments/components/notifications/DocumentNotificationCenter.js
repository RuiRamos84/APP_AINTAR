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
import { useMetaData } from '../../../../contexts/MetaDataContext';

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

    const { metaData } = useMetaData();


    const [filter, setFilter] = useState('all'); // 'all', 'unread', 'transfers', 'updates'
    const [expandedItem, setExpandedItem] = useState(null);

    // =========================================================================
    // METADATA MAPPING HELPERS
    // =========================================================================

    const getNotificationMappings = useCallback((notification) => {
        if (!metaData || !notification.metadata) return {};

        const mappings = {};
        const flags = notification.metadata.requires_mapping || {};

        // Mapear entidade
        if (flags.entity && notification.metadata.entity_mapping_id) {
            mappings.entity = metaData.ee?.find(e =>
                e.pk === notification.metadata.entity_mapping_id
            );
        }

        // Mapear associado
        if (flags.associate && notification.metadata.associate_mapping_id) {
            mappings.associate = metaData.associates?.find(a =>
                a.pk === notification.metadata.associate_mapping_id
            );
        }

        // Mapear tipo de documento
        if (flags.document_type && notification.metadata.document_type_mapping_id) {
            mappings.documentType = metaData.param_doctype?.find(dt =>
                dt.pk === notification.metadata.document_type_mapping_id
            );
        }

        // Mapear ação/passo
        if (flags.step_what && notification.metadata.step_what_id) {
            mappings.stepAction = metaData.what?.find(w =>
                w.pk === notification.metadata.step_what_id
            );
        }

        // Mapear responsável
        if (flags.step_who && notification.metadata.step_who_id) {
            mappings.stepResponsible = metaData.who?.find(w =>
                w.pk === notification.metadata.step_who_id
            );
        }

        // Mapear representante
        if (flags.representative && notification.metadata.representative_mapping_id) {
            mappings.representative = metaData.who?.find(w =>
                w.pk === notification.metadata.representative_mapping_id
            );
        }

        // Mapear apresentação
        if (flags.presentation && notification.metadata.presentation_mapping_id) {
            mappings.presentation = metaData.presentation?.find(p =>
                p.pk === notification.metadata.presentation_mapping_id
            );
        }

        return mappings;
    }, [metaData]);

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
        const mappings = getNotificationMappings(notification);

        return (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Stack spacing={2}>
                        {/* Informações da Entidade/Empresa */}
                        {mappings.entity && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                    🏢 Entidade:
                                </Typography>
                                <Typography variant="body2" sx={{ ml: 1 }}>
                                    {mappings.entity.name}
                                </Typography>
                            </Box>
                        )}

                        {/* Tipo de Documento */}
                        {mappings.documentType && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                    📋 Tipo de Documento:
                                </Typography>
                                <Typography variant="body2" sx={{ ml: 1 }}>
                                    {mappings.documentType.name}
                                </Typography>
                            </Box>
                        )}

                        {/* Ação/Passo */}
                        {mappings.stepAction && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                    ⚡ Ação:
                                </Typography>
                                <Typography variant="body2" sx={{ ml: 1 }}>
                                    {mappings.stepAction.name}
                                </Typography>
                            </Box>
                        )}

                        {/* Responsável */}
                        {mappings.stepResponsible && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                    👤 Responsável:
                                </Typography>
                                <Typography variant="body2" sx={{ ml: 1 }}>
                                    {mappings.stepResponsible.name}
                                </Typography>
                            </Box>
                        )}

                        {/* Associado */}
                        {mappings.associate && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                    🤝 Associado:
                                </Typography>
                                <Typography variant="body2" sx={{ ml: 1 }}>
                                    {mappings.associate.name}
                                </Typography>
                            </Box>
                        )}

                        {/* Representante */}
                        {mappings.representative && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                    👨‍💼 Representante:
                                </Typography>
                                <Typography variant="body2" sx={{ ml: 1 }}>
                                    {mappings.representative.name}
                                </Typography>
                            </Box>
                        )}

                        {/* Observações */}
                        {notification.metadata?.memo && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                    💬 Observações:
                                </Typography>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', ml: 1 }}>
                                    "{notification.metadata.memo}"
                                </Typography>
                            </Box>
                        )}

                        {/* Informações Técnicas */}
                        {notification.metadata && (
                            <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 'bold' }}>
                                    ℹ️ Detalhes Técnicos:
                                </Typography>
                                <Box sx={{ ml: 1, mt: 0.5 }}>
                                    <Typography variant="caption" color="text.disabled" display="block">
                                        • ID do Documento: {notification.metadata.document_pk}
                                    </Typography>
                                    {notification.metadata.workflow_action && (
                                        <Typography variant="caption" color="text.disabled" display="block">
                                            • Tipo de Ação: {notification.metadata.workflow_action}
                                        </Typography>
                                    )}
                                    {notification.metadata.notification_source && (
                                        <Typography variant="caption" color="text.disabled" display="block">
                                            • Origem: {notification.metadata.notification_source}
                                        </Typography>
                                    )}
                                </Box>
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

                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<ViewIcon />}
                                onClick={() => handleViewDocument(notification.documentId, notification)}
                            >
                                Ver Documento
                            </Button>

                            {mappings.entity && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        // Navegar para a entidade (implementar conforme necessário)
                                    }}
                                >
                                    Ver Entidade
                                </Button>
                            )}

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
    }, [expandedItem, handleViewDocument, markNotificationAsRead, getNotificationMappings]);

    const renderNotificationItem = useCallback((notification, index) => {
        const isExpanded = expandedItem === notification.id;
        const mappings = getNotificationMappings(notification);

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

                                    {/* Chips com informações mapeadas */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                                        <Chip
                                            size="small"
                                            label={`Doc. ${notification.documentNumber}`}
                                            variant="outlined"
                                            color="primary"
                                        />

                                        {mappings.documentType && (
                                            <Chip
                                                size="small"
                                                label={mappings.documentType.name}
                                                variant="outlined"
                                                color="default"
                                            />
                                        )}

                                        {mappings.stepAction && (
                                            <Chip
                                                size="small"
                                                label={mappings.stepAction.name}
                                                variant="outlined"
                                                color="secondary"
                                            />
                                        )}
                                    </Box>

                                    {/* Linha com entidade e timestamp */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        {mappings.entity && (
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                                🏢 {mappings.entity.name}
                                            </Typography>
                                        )}
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
    }, [expandedItem, handleNotificationClick, getNotificationColor, getNotificationIcon, formatTimestamp, renderNotificationDetails, getNotificationMappings]);

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