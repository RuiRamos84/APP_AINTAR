// frontend/src/pages/Operation/components/cards/OperationCard.js - SIMPLIFICADO
import React, { memo } from 'react';
import {
    Card, CardContent, CardActions, Box, Typography, Chip,
    IconButton, Tooltip, LinearProgress, Button
} from '@mui/material';
import {
    Assignment, MyLocation, Phone, LocationOn, CalendarToday,
    LockOpen, Lock, Person, PriorityHigh, Send
} from '@mui/icons-material';

const OperationCard = memo(({
    item,
    isUrgent,
    canAct,
    isRamaisView,
    onClick,
    onNavigate,
    onCall,
    getUserNameByPk,
    getRemainingDaysColor,
    getAddressString,
    metaData
}) => {
    // Handlers com propagação controlada
    const handleNavigate = (e) => {
        e.stopPropagation();
        onNavigate(item);
    };

    const handleCall = (e) => {
        e.stopPropagation();
        onCall(item);
    };

    const handleClick = () => {
        onClick(item);
    };

    return (
        <Card
            onClick={handleClick}
            sx={{
                cursor: 'pointer',
                borderRadius: 3,
                borderLeft: isRamaisView ?
                    `6px solid ${getRemainingDaysColor(item.restdays)}` :
                    isUrgent ? '6px solid #f44336' : 'none',
                bgcolor: isUrgent ? 'rgba(244, 67, 54, 0.05)' : 'background.paper',
                transition: 'all 0.2s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                }
            }}
        >
            <CardContent sx={{ pb: 1 }}>
                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box flex={1}>
                        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.1rem', mb: 0.5 }}>
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

                    {/* Status */}
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
                                color={canAct ? "success" : "default"}
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

                {/* Progress para Ramais */}
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

                {/* Entidade */}
                <Typography
                    variant="body1"
                    fontWeight="medium"
                    sx={{
                        color: 'text.primary',
                        lineHeight: 1.3,
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}
                >
                    {item.ts_entity}
                </Typography>

                {/* Info em 2 colunas */}
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mb={1}>
                    {/* Morada */}
                    <Box>
                        <Box display="flex" alignItems="flex-start" gap={1}>
                            <LocationOn fontSize="small" color="action" sx={{ mt: 0.2, flexShrink: 0 }} />
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
                                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.3, display: 'block' }}>
                                    {[item.nut3, item.nut2].filter(Boolean).join(' • ')}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Contacto e Data */}
                    <Box>
                        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                            <Phone fontSize="small" color={item.phone ? "action" : "disabled"} />
                            <Typography
                                variant="body2"
                                color={item.phone ? "primary.main" : "text.disabled"}
                                fontWeight={item.phone ? "medium" : "normal"}
                                noWrap
                            >
                                {item.phone || "Sem contacto"}
                            </Typography>
                        </Box>

                        <Box display="flex" alignItems="center" gap={1}>
                            <CalendarToday fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary">
                                {item.submission}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </CardContent>

            {/* Actions */}
            <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1.5 }}>
                <Box display="flex" gap={1}>
                    <Tooltip title="Ver no mapa">
                        <IconButton size="small" color="primary" onClick={handleNavigate}>
                            <MyLocation fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    {item.phone && (
                        <Tooltip title="Ligar">
                            <IconButton size="small" color="success" onClick={handleCall}>
                                <Phone fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>

                <Tooltip title="Ver detalhes">
                    <IconButton size="small" onClick={handleClick}>
                        <Assignment fontSize="small" />
                    </IconButton>
                </Tooltip>
            </CardActions>
        </Card>
    );
});

OperationCard.displayName = 'OperationCard';

export default OperationCard;