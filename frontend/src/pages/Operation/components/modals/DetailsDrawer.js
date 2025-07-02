import React from 'react';
import {
    SwipeableDrawer, Box, Typography, Grid, Button,
    Alert, IconButton, Chip, Stack
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

    const getUserNameByPk = (pk) => {
        if (!metaData?.who || !pk) return 'Desconhecido';
        const user = metaData.who.find(user => Number(user.pk) === Number(pk));
        return user ? user.name : `User ${pk}`;
    };

    const getTypeColor = (tipo) => {
        if (tipo?.includes('ETAR')) return 'primary';
        if (tipo?.includes('EE')) return 'secondary';
        if (tipo?.includes('Ramal')) return 'success';
        return 'default';
    };

    const handleNavigate = () => {
        if (!item) return;

        const addressParts = [
            item.address,
            item.door,
            item.nut4,
            item.nut2
        ].filter(Boolean);

        const address = encodeURIComponent(addressParts.join(', '));
        window.open(`https://www.google.com/maps/search/?api=1&query=${address}`);
    };

    const handleCall = () => {
        if (!item?.phone) return;
        window.location.href = `tel:${item.phone}`;
    };

    return (
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            onOpen={() => { }}
            disableSwipeToOpen
            ModalProps={{ keepMounted: false }}
            PaperProps={{
                sx: {
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    height: 'auto',
                    maxHeight: '60vh',
                    pt: 1
                }
            }}
        >
            <Box sx={{ px: 3, py: 2 }}>
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
                    <Box display="flex" alignItems="center" gap={1}>
                        <Box>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.3rem' }}>
                                    {item.regnumber} - 
                                </Typography>
                                <Chip label={item.tipo} color={getTypeColor(item.tipo)} size="small" />
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', ml: 1, fontStyle: 'italic' }}>
                                via {item.ts_associate}
                            </Typography>
                        </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={0.5}>
                        {item.urgency === "1" && (
                            <Chip icon={<PriorityHigh fontSize="small" />} label="URGENTE" color="error" size="small" />
                        )}
                        {item.who && !canExecuteActions && (
                            <Chip
                                label={getUserNameByPk(item.who)}
                                color="primary"
                                size="small"
                            />
                        )}
                        <IconButton onClick={onClose} size="small">
                            <Close />
                        </IconButton>
                    </Box>
                </Box>

                {/* Grid principal 2 colunas */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    {/* Coluna esquerda */}
                    <Grid size={{ xs: 6 }}>
                        {/* Entidade */}
                        <Box sx={{ mb: 1.5 }}>
                            <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                <Person fontSize="small" color="action" />
                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                                    Entidade
                                </Typography>
                            </Box>
                            <Box sx={{ ml: 3 }}>
                                <Typography variant="body1" fontWeight="medium" sx={{ lineHeight: 1.2 }}>
                                    {item.ts_entity}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Contacto - clicável */}
                        <Box sx={{ mb: 1.5 }}>
                            <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                <Phone fontSize="small" color="action" />
                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                                    Contacto
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    ml: 3,
                                    cursor: item.phone ? 'pointer' : 'default',
                                    '&:hover': item.phone ? {
                                        bgcolor: 'action.hover',
                                        borderRadius: 1,
                                        transform: 'scale(1.02)'
                                    } : {},
                                    transition: 'all 0.2s',
                                    p: 0.5,
                                    borderRadius: 1
                                }}
                                onClick={item.phone ? handleCall : undefined}
                            >
                                <Typography variant="body2" fontWeight="medium" color={item.phone ? "primary.main" : "text.primary"}>
                                    {item.phone || "Não disponível"}
                                </Typography>
                            </Box>
                        </Box>

                        {/* Submissão */}
                        <Box>
                            <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                <CalendarToday fontSize="small" color="action" />
                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                                    Submissão
                                </Typography>
                            </Box>
                            <Box sx={{ ml: 3 }}>
                                <Typography variant="body2" fontWeight="medium">
                                    {item.submission}
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>

                    {/* Coluna direita */}
                    <Grid size={{ xs: 6 }}>
                        {/* Morada - clicável */}
                        <Box sx={{ mb: 1.5 }}>
                            <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                <LocationOn fontSize="small" color="action" />
                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                                    Morada
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    ml: 3,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                        borderRadius: 1,
                                        transform: 'scale(1.02)'
                                    },
                                    transition: 'all 0.2s',
                                    p: 0.5,
                                    borderRadius: 1
                                }}
                                onClick={handleNavigate}
                            >
                                <Typography variant="body2" fontWeight="medium" color="secondary.main" sx={{ lineHeight: 1.3 }}>
                                    {item.address}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {item.door && `Porta ${item.door}`}
                                    {item.floor && ` • ${item.floor}`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {item.postal} {item.nut4}
                                </Typography>

                                {/* Chips geográficos */}
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                                    {item.nut3 && (
                                        <Chip
                                            icon={<LocationOn fontSize="small" />}
                                            label={item.nut3}
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                        />
                                    )}
                                    {item.nut2 && (
                                        <Chip
                                            label={item.nut2}
                                            size="small"
                                            variant="outlined"
                                            color="secondary"
                                        />
                                    )}
                                    {item.nut1 && (
                                        <Chip
                                            label={item.nut1}
                                            size="small"
                                            variant="outlined"
                                            color="default"
                                        />
                                    )}
                                </Stack>
                            </Box>
                        </Box>

                        {/* Observações - destacadas */}
                        {item.memo && (
                            <Box
                                sx={{
                                    bgcolor: 'grey.50',
                                    border: 1,
                                    borderColor: 'warning.main',
                                    borderRadius: 1,
                                    p: 1,
                                    borderLeft: 4,
                                    borderLeftColor: 'warning.main'
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        textTransform: 'uppercase',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Observações
                                </Typography>
                                <Typography
                                    variant="body2"
                                    fontWeight="medium"
                                    sx={{ mt: 0.5 }}
                                >
                                    {item.memo}
                                </Typography>
                            </Box>
                        )}
                    </Grid>
                </Grid>

                {/* Acção ou aviso */}
                {canExecuteActions ? (
                    <Button
                        variant="contained"
                        startIcon={<Send />}
                        onClick={onComplete}
                        fullWidth
                        sx={{ py: 1, fontWeight: 'bold' }}
                    >
                        {isFossaView ? "Concluir Serviço" : "Adicionar Passo"}
                    </Button>
                ) : (
                    <Alert severity="warning" sx={{ borderRadius: 2, textAlign: 'center' }}>
                        Pedido atribuído a <strong>{getUserNameByPk(item.who)}</strong>.
                        Não tem permissões para finalizar este pedido.
                    </Alert>
                )}
            </Box>
        </SwipeableDrawer>
    );
};

export default DetailsDrawer;