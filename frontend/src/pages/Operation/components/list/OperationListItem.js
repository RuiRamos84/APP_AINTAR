// frontend/src/pages/Operation/components/list/OperationListItem.js
import React, { memo } from 'react';
import {
    Paper, Box, Typography, Chip, IconButton, Tooltip, LinearProgress
} from '@mui/material';
import {
    MyLocation, Phone, LocationOn, CalendarToday,
    LockOpen, Lock, PriorityHigh, Assignment
} from '@mui/icons-material';

const OperationListItem = memo(({
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

    return (
        <Paper
            onClick={handleClick}
            sx={{
                p: 2,
                mb: 2,
                cursor: 'pointer',
                borderRadius: 2,
                borderLeft: isRamaisView ?
                    `6px solid ${getRemainingDaysColor(item.restdays)}` :
                    isUrgent ? '6px solid #f44336' : 'none',
                bgcolor: isUrgent ? 'rgba(244, 67, 54, 0.05)' : 'background.paper',
                transition: 'all 0.2s ease',
                '&:hover': {
                    transform: 'translateX(4px)',
                    boxShadow: 2
                }
            }}
        >
            {/* Linha 1: RegNumber + Tipo + Status | Actions */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                        {item.regnumber}
                    </Typography>
                    <Chip
                        label={item.tipo}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 18 }}
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

                    {item.who && (
                        <Chip
                            size="small"
                            label={getUserNameByPk(item.who, metaData)}
                            color={canAct ? "success" : "default"}
                            icon={canAct ? <LockOpen fontSize="small" /> : <Lock fontSize="small" />}
                            sx={{ fontSize: '0.7rem', height: 20, maxWidth: 100 }}
                        />
                    )}
                </Box>

                {/* Actions à direita */}
                <Box display="flex" alignItems="center" gap={1}>
                    <Tooltip title="Ver no mapa">
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={handleNavigate}
                        >
                            <MyLocation fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    {item.phone && (
                        <Tooltip title="Ligar">
                            <IconButton
                                size="small"
                                color="success"
                                onClick={handleCall}
                            >
                                <Phone fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}

                    <Tooltip title="Ver detalhes">
                        <IconButton
                            size="small"
                            onClick={handleClick}
                        >
                            <Assignment fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Progress para Ramais */}
            {isRamaisView && (
                <Box mb={1}>
                    <LinearProgress
                        variant="determinate"
                        value={Math.max(0, Math.min(100, (item.restdays / 30) * 100))}
                        sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: getRemainingDaysColor(item.restdays),
                                borderRadius: 2
                            }
                        }}
                    />
                    <Typography
                        variant="caption"
                        color={getRemainingDaysColor(item.restdays)}
                        sx={{ fontWeight: 'medium' }}
                    >
                        {Math.floor(item.restdays)} dias restantes
                    </Typography>
                </Box>
            )}

            {/* Linha 2: Entidade */}
            <Typography
                variant="body1"
                fontWeight="medium"
                sx={{
                    color: 'text.primary',
                    mb: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}
            >
                {item.ts_entity}
            </Typography>

            {/* Linha 3: Morada | Contacto + Data */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={0.5} flex={1} minWidth={0} pr={2}>
                    <LocationOn fontSize="small" color="action" />
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {getAddressString(item)}
                    </Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={0.5} >
                    <Phone fontSize="small" color={item.phone ? "action" : "disabled"} />
                    <Typography
                        variant="body2"
                        color={item.phone ? "primary.main" : "text.disabled"}
                        fontWeight={item.phone ? "medium" : "normal"}
                    >
                        {item.phone || "Sem contacto"}
                    </Typography>
                    <CalendarToday fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                        {item.submission}
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );
});

OperationListItem.displayName = 'OperationListItem';

export default OperationListItem;