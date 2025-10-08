import React, { useState } from 'react';
import { IconButton, Badge, Drawer, Box, Typography, List, ListItem, ListItemText, Button } from '@mui/material';
import { Notifications as NotificationsIcon, Close as CloseIcon } from '@mui/icons-material';
import { useDocumentNotifications } from '../../contexts/DocumentNotificationContext';

/**
 * Botão funcional simples para notificações de documentos
 */
const TestNotificationButton = () => {
    const [open, setOpen] = useState(false);
    const { documentNotifications, unreadCount, markAllAsRead } = useDocumentNotifications();

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    return (
        <>
            <IconButton color="primary" onClick={handleOpen}>
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon />
                </Badge>
            </IconButton>

            <Drawer anchor="right" open={open} onClose={handleClose}>
                <Box sx={{ width: 400, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            Notificações ({documentNotifications.length})
                        </Typography>
                        <IconButton onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {unreadCount > 0 && (
                        <Button onClick={markAllAsRead} variant="outlined" fullWidth sx={{ mb: 2 }}>
                            Marcar todas como lidas ({unreadCount})
                        </Button>
                    )}

                    <List>
                        {documentNotifications.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" align="center">
                                Sem notificações
                            </Typography>
                        ) : (
                            documentNotifications.map((notification) => (
                                <ListItem key={notification.id} divider>
                                    <ListItemText
                                        primary={notification.title}
                                        secondary={notification.message}
                                    />
                                </ListItem>
                            ))
                        )}
                    </List>
                </Box>
            </Drawer>
        </>
    );
};

export default TestNotificationButton;