import React from 'react';
import {
    SwipeableDrawer, Box, Typography, List, ListItemButton,
    ListItemIcon, ListItemText
} from '@mui/material';
import { Send, Attachment, CheckCircle, DirectionsCar } from '@mui/icons-material';

const ActionDrawer = ({ open, onClose, item, onNavigate, onComplete }) => {
    if (!item) return null;

    const actions = [
        {
            icon: <Send color="primary" />,
            primary: "Adicionar Passo",
            secondary: "Atualiza o estado do pedido",
            onClick: () => {
                console.log("Adicionar passo para:", item.regnumber);
                onClose();
            }
        },
        {
            icon: <Attachment color="secondary" />,
            primary: "Adicionar Anexo",
            secondary: "Fotos ou documentos",
            onClick: () => {
                console.log("Adicionar anexo para:", item.regnumber);
                onClose();
            }
        },
        {
            icon: <CheckCircle color="success" />,
            primary: "Marcar Concluído",
            secondary: "Finaliza o processo",
            onClick: () => {
                onComplete();
            }
        },
        {
            icon: <DirectionsCar color="info" />,
            primary: "Navegar até Local",
            secondary: "Abre app de navegação",
            onClick: () => {
                onNavigate(item);
                onClose();
            }
        }
    ];

    return (
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            onOpen={() => { }}
            disableSwipeToOpen
            disableBackdropTransition
            disableDiscovery
            ModalProps={{ keepMounted: false }}
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
                <Box sx={{
                    width: '60px',
                    height: '4px',
                    bgcolor: 'grey.300',
                    borderRadius: '2px',
                    mx: 'auto',
                    mb: 3
                }} />

                <Typography variant="h6" gutterBottom align="center">
                    Ações para {item.regnumber}
                </Typography>

                <List>
                    {actions.map((action, index) => (
                        <ListItemButton
                            key={index}
                            onClick={action.onClick}
                            sx={{ borderRadius: 2, mb: 1 }}
                        >
                            <ListItemIcon>{action.icon}</ListItemIcon>
                            <ListItemText
                                primary={action.primary}
                                secondary={action.secondary}
                            />
                        </ListItemButton>
                    ))}
                </List>
            </Box>
        </SwipeableDrawer>
    );
};

export default ActionDrawer;