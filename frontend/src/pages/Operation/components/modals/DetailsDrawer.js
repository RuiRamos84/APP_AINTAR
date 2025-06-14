import React from 'react';
import {
    SwipeableDrawer, Box, Typography, Grid, Button,
    Alert, IconButton, Chip
} from '@mui/material';
import {
    Send, MyLocation, Phone, Close, Person,
    LocationOn, CalendarToday, PriorityHigh
} from '@mui/icons-material';

const DetailsDrawer = ({
    open,
    onClose,
    item,
    canExecuteActions,
    isRamaisView,
    isFossaView,
    metaData,
    onComplete
}) => {
    if (!item) return null;

    const handleNavigate = () => {
        const address = encodeURIComponent(`${item.address}, ${item.nut2}`);
        window.open(`https://www.google.com/maps/search/?api=1&query=${address}`);
    };

    const handleCall = () => {
        if (item.phone) window.location.href = `tel:${item.phone}`;
    };

    return (
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            onOpen={() => { }}
            disableSwipeToOpen
            PaperProps={{
                sx: {
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    maxHeight: '60vh',
                    pt: 1
                }
            }}
        >
            <Box sx={{ p: 2 }}>
                {/* Handle */}
                <Box sx={{
                    width: '40px',
                    height: '3px',
                    bgcolor: 'grey.300',
                    borderRadius: '2px',
                    mx: 'auto',
                    mb: 1.5
                }} />

                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                        {item.regnumber}
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <Close />
                    </IconButton>
                </Box>

                {/* Info Grid */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                        <Box sx={{ mb: 1.5 }}>
                            <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                <Person fontSize="small" color="action" />
                                <Typography variant="caption" color="text.secondary">
                                    ENTIDADE
                                </Typography>
                            </Box>
                            <Typography variant="body2" fontWeight="medium">
                                {item.ts_entity}
                            </Typography>
                        </Box>

                        <Box sx={{ mb: 1.5 }}>
                            <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                <Phone fontSize="small" color="action" />
                                <Typography variant="caption" color="text.secondary">
                                    CONTACTO
                                </Typography>
                            </Box>
                            <Typography
                                variant="body2"
                                color={item.phone ? "primary.main" : "text.secondary"}
                                sx={{ cursor: item.phone ? 'pointer' : 'default' }}
                                onClick={item.phone ? handleCall : undefined}
                            >
                                {item.phone || "Não disponível"}
                            </Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={6}>
                        <Box sx={{ mb: 1.5 }}>
                            <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                <LocationOn fontSize="small" color="action" />
                                <Typography variant="caption" color="text.secondary">
                                    MORADA
                                </Typography>
                            </Box>
                            <Typography
                                variant="body2"
                                color="secondary.main"
                                sx={{ cursor: 'pointer' }}
                                onClick={handleNavigate}
                            >
                                {item.address}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {item.nut2}
                            </Typography>
                        </Box>

                        <Box>
                            <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                <CalendarToday fontSize="small" color="action" />
                                <Typography variant="caption" color="text.secondary">
                                    SUBMISSÃO
                                </Typography>
                            </Box>
                            <Typography variant="body2">
                                {item.submission}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                {/* Observações */}
                {item.memo && (
                    <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            OBSERVAÇÕES
                        </Typography>
                        <Typography variant="body2">
                            {item.memo}
                        </Typography>
                    </Box>
                )}

                {/* Acção */}
                {canExecuteActions ? (
                    <Button
                        variant="contained"
                        startIcon={<Send />}
                        onClick={onComplete}
                        fullWidth
                        sx={{ py: 1.5 }}
                    >
                        {isFossaView ? "Concluir Serviço" : "Adicionar Passo"}
                    </Button>
                ) : (
                    <Alert severity="warning">
                        Sem permissões para finalizar este pedido.
                    </Alert>
                )}
            </Box>
        </SwipeableDrawer>
    );
};

export default DetailsDrawer;