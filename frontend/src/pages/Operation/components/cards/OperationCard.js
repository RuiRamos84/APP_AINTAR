// components/cards/OperationCard.js - CORRIGIDO
import React, { memo } from 'react';
import {
    Card, CardContent, CardActions, Box, Typography, Chip, IconButton, Tooltip
} from '@mui/material';
import {
    Assignment, MyLocation, Phone, LocationOn, CalendarToday,
    LockOpen, Lock, PriorityHigh, Warning, CheckCircle, Schedule
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

    // Estado temporal dos ramais
    const getRamaisStatus = () => {
        if (!isRamaisView || item.restdays === undefined) return null;

        const days = Math.floor(item.restdays);

        if (days < 0) {
            return {
                label: `${Math.abs(days)} dias em atraso`,
                color: 'error',
                icon: <Warning fontSize="small" />,
                bgColor: 'rgba(244, 67, 54, 0.1)',
                borderColor: '#f44336'
            };
        }

        if (days === 0) {
            return {
                label: 'Vence hoje',
                color: 'warning',
                icon: <Schedule fontSize="small" />,
                bgColor: 'rgba(255, 152, 0, 0.1)',
                borderColor: '#ff9800'
            };
        }

        if (days <= 7) {
            return {
                label: `${days} dias restantes`,
                color: 'warning',
                icon: <Schedule fontSize="small" />,
                bgColor: 'rgba(255, 152, 0, 0.05)',
                borderColor: '#ff9800'
            };
        }

        return {
            label: `${days} dias restantes`,
            color: 'success',
            icon: <CheckCircle fontSize="small" />,
            bgColor: 'rgba(76, 175, 80, 0.05)',
            borderColor: '#4caf50'
        };
    };

    const ramaisStatus = getRamaisStatus();

    return (
        <Card
            onClick={handleClick}
            sx={{
                cursor: 'pointer',
                borderRadius: 3,
                borderLeft: isRamaisView && ramaisStatus ?
                    `6px solid ${ramaisStatus.borderColor}` :
                    isUrgent ? '6px solid #f44336' : 'none',
                bgcolor: ramaisStatus?.bgColor || (isUrgent ? 'rgba(244, 67, 54, 0.05)' : 'background.paper'),
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
                    {/* Topo esquerdo */}
                    <Box flex={1}>
                        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.1rem', mb: 0.5 }}>
                            {item.regnumber}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <Chip
                                label={item.tipo}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                            {isUrgent && (
                                <Chip
                                    icon={<PriorityHigh fontSize="small" />}
                                    label="URGENTE"
                                    color="error"
                                    size="small"
                                    sx={{ fontSize: '0.7rem', height: 20 }}
                                />
                            )}
                        </Box>
                    </Box>

                    {/* Topo direito */}
                    <Box display="flex" flexDirection="column" gap={0.5} alignItems="flex-end">
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

                        {ramaisStatus && (
                            <Chip
                                icon={ramaisStatus.icon}
                                label={ramaisStatus.label}
                                color={ramaisStatus.color}
                                size="small"
                                sx={{
                                    fontSize: '0.7rem',
                                    height: 22,
                                    fontWeight: 'medium'
                                }}
                            />
                        )}
                    </Box>
                </Box>

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

                {/* Info em 2 colunas - morada/contacto */}
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

                {/* Datas execução/limite para ramais */}
                {isRamaisView && (item.execution || item.limitdate) && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Box display="flex" gap={2}>
                            {item.execution && (
                                <Typography variant="caption" color="text.secondary">
                                    <strong>Execução:</strong> {item.execution}
                                </Typography>
                            )}
                            {item.limitdate && (
                                <Typography variant="caption" color="text.secondary">
                                    <strong>Limite:</strong> {item.limitdate}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                )}
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