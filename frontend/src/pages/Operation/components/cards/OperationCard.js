// frontend/src/pages/Operation/components/cards/OperationCard.js - MELHORADO
import React, { memo } from 'react';
import {
    Card, CardContent, CardActions, Box, Typography, Chip,
    IconButton, Tooltip, LinearProgress, Stack, Button, Divider
} from '@mui/material';
import {
    Assignment, MyLocation, Phone, LocationOn, CalendarToday,
    TouchApp, LockOpen, Lock, Person, PriorityHigh, Send
} from '@mui/icons-material';
import { useOperationCardStyles } from './OperationCard.styles';

const OperationCard = memo(({
    item,
    isUrgent,
    canAct,
    isRamaisView,
    isFossaView,
    onClick,
    onNavigate,
    onCall,
    onComplete,
    getUserNameByPk,
    getRemainingDaysColor,
    getAddressString,
    metaData,
    isSwiping = false
}) => {
    const styles = useOperationCardStyles();

    const handleNavigate = (e) => {
        e.stopPropagation();
        onNavigate(item);
    };

    const handleCall = (e) => {
        e.stopPropagation();
        onCall(item);
    };

    const handleComplete = (e) => {
        e.stopPropagation();
        onComplete?.();
    };

    const handleDetails = (e) => {
        e.stopPropagation();
        onClick();
    };

    return (
        <Card
            sx={{
                ...styles.card,
                borderLeft: isRamaisView ?
                    `6px solid ${getRemainingDaysColor(item.restdays)}` :
                    isUrgent ? '6px solid #f44336' : 'none',
                bgcolor: isUrgent ? 'rgba(244, 67, 54, 0.05)' : 'background.paper',
                transform: isSwiping ? 'scale(0.98)' : 'scale(1)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                    transform: isSwiping ? 'scale(0.98)' : 'scale(1.02)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                }
            }}
            onClick={onClick}
        >
            <CardContent sx={{ ...styles.cardContent, pb: 1 }}>
                {/* Header - Título e Status */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box flex={1}>
                        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.2rem', mb: 0.1 }}>
                            {item.regnumber}
                        </Typography>
                        <Chip
                            label={item.tipo}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                    </Box>

                    {/* Status chips horizontais */}
                    <Box display="flex" alignItems="center" gap={0.5}>
                        {isUrgent && (
                            <Chip
                                icon={<PriorityHigh fontSize="small" />}
                                label="URGENTE"
                                color="error"
                                size="small"
                                sx={{ fontSize: '0.7rem', height: 22 }}
                            />
                        )}
                        {item.who && (
                            <Chip
                                size="small"
                                label={getUserNameByPk(item.who, metaData)}
                                color={canAct ? "primary" : "default"}
                                icon={canAct ? <LockOpen fontSize="small" /> : <Lock fontSize="small" />}
                                sx={{
                                    maxWidth: 120,
                                    fontSize: '0.7rem',
                                    height: 22
                                }}
                            />
                        )}
                    </Box>
                </Box>

                {/* Progress Bar para Ramais */}
                {isRamaisView && (
                    <Box mb={2}>
                        <LinearProgress
                            variant="determinate"
                            value={Math.max(0, Math.min(100, (item.restdays / 30) * 100))}
                            sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                    bgcolor: getRemainingDaysColor(item.restdays),
                                    borderRadius: 3
                                }
                            }}
                        />
                        <Typography
                            variant="caption"
                            color={getRemainingDaysColor(item.restdays)}
                            sx={{ mt: 0.5, display: 'block', fontWeight: 'medium' }}
                        >
                            {Math.floor(item.restdays)} dias restantes
                        </Typography>
                    </Box>
                )}

                {/* Entidade em destaque */}
                <Typography
                    variant="body1"
                    fontWeight="medium"
                    sx={{
                        color: 'text.primary',
                        lineHeight: 1.3,
                        mb: 2
                    }}
                >
                    {item.ts_entity}
                </Typography>

                {/* Grid de informações 2 colunas */}
                <Box
                    display="grid"
                    gridTemplateColumns="1fr 1fr"
                    gap={2}
                    sx={{ mb: 1 }}
                >
                    {/* Coluna esquerda - Localização */}
                    <Box>
                        <Box display="flex" alignItems="flex-start" gap={1}>
                            <LocationOn
                                fontSize="small"
                                color="action"
                                sx={{ mt: 0.2, flexShrink: 0 }}
                            />
                            <Box flex={1}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        lineHeight: 1.3,
                                        color: 'text.secondary',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {getAddressString(item)}
                                </Typography>
                                {/* Localização administrativa compacta */}
                                <Typography
                                    variant="caption"
                                    color="text.disabled"
                                    sx={{ mt: 0.3, display: 'block' }}
                                >
                                    {[item.nut3, item.nut2].filter(Boolean).join(' • ')}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Coluna direita - Contacto e Data */}
                    <Box>
                        {/* Contacto */}
                        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                            <Phone
                                fontSize="small"
                                color={item.phone ? "action" : "disabled"}
                                sx={{ flexShrink: 0 }}
                            />
                            <Typography
                                variant="body2"
                                color={item.phone ? "primary.main" : "text.disabled"}
                                fontWeight={item.phone ? "medium" : "normal"}
                                noWrap
                            >
                                {item.phone || "Sem contacto"}
                            </Typography>
                        </Box>

                        {/* Data */}
                        <Box display="flex" alignItems="center" gap={1}>
                            <CalendarToday
                                fontSize="small"
                                color="action"
                                sx={{ flexShrink: 0 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                                {item.submission}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </CardContent>

            <Divider />

            {/* Actions Bar - só ações de contexto */}
            <CardActions sx={{
                ...styles.cardActions,
                justifyContent: 'space-between',
                px: 2,
                py: 1.5
            }}>
                {/* Ações de contexto */}
                <Box display="flex" gap={1}>
                    <Tooltip title="Ver no mapa" arrow>
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={handleNavigate}
                            sx={{
                                bgcolor: 'primary.50',
                                '&:hover': { bgcolor: 'primary.100' }
                            }}
                        >
                            <MyLocation fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    {item.phone && (
                        <Tooltip title="Ligar" arrow>
                            <IconButton
                                size="small"
                                color="success"
                                onClick={handleCall}
                                sx={{
                                    bgcolor: 'success.50',
                                    '&:hover': { bgcolor: 'success.100' }
                                }}
                            >
                                <Phone fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>

                {/* Detalhes */}
                <Tooltip title="Ver detalhes" arrow>
                    <IconButton
                        size="small"
                        onClick={handleDetails}
                        sx={{
                            bgcolor: 'grey.50',
                            '&:hover': { bgcolor: 'grey.100' }
                        }}
                    >
                        <Assignment fontSize="small" />
                    </IconButton>
                </Tooltip>
            </CardActions>

            {/* Touch indicator - só para mobile */}
            <Box sx={{
                ...styles.touchIndicator,
                display: { xs: 'block', sm: 'none' }
            }}>
                <TouchApp fontSize="small" />
            </Box>
        </Card>
    );
}, (prevProps, nextProps) => {
    // Comparação otimizada
    return (
        prevProps.item.pk === nextProps.item.pk &&
        prevProps.isUrgent === nextProps.isUrgent &&
        prevProps.canAct === nextProps.canAct &&
        prevProps.isSwiping === nextProps.isSwiping
    );
});

OperationCard.displayName = 'OperationCard';

export default OperationCard;