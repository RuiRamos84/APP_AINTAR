import React from 'react';
import {
    Card, CardContent, CardActions, Box, Typography, Chip,
    IconButton, Tooltip, LinearProgress, Stack
} from '@mui/material';
import {
    Assignment, MyLocation, Phone, LocationOn, CalendarToday,
    TouchApp, LockOpen, Lock, Person
} from '@mui/icons-material';
import { useOperationCardStyles } from './OperationCard.styles';

const OperationCard = ({
    item,
    canAct,
    isRamaisView,
    onClick,
    onNavigate,
    onCall,
    getUserNameByPk,
    getRemainingDaysColor,
    getAddressString,
    metaData,
    isSwiping = false
}) => {
    const styles = useOperationCardStyles();

    return (
        <Card
            sx={{
                ...styles.card,
                borderLeft: isRamaisView ?
                    `6px solid ${getRemainingDaysColor(item.restdays)}` :
                    undefined,
                transform: isSwiping ? 'scale(0.98)' : 'scale(1)',
            }}
            onClick={onClick}
        >
            <CardContent sx={styles.cardContent}>
                {/* Cabeçalho */}
                <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.2rem' }}>
                        {item.regnumber}
                    </Typography>

                    <Box display="flex" alignItems="center" gap={1}>
                        {item.who && (
                            <Chip
                                size="small"
                                label={getUserNameByPk(item.who, metaData)}
                                color={canAct ? "primary" : "default"}
                                sx={{ maxWidth: 150 }}
                            />
                        )}
                        {canAct ? (
                            <LockOpen fontSize="small" color="success" />
                        ) : (
                            <Lock fontSize="small" color="disabled" />
                        )}
                    </Box>
                </Box>

                {/* Status para ramais */}
                {isRamaisView && (
                    <Box mb={2}>
                        <LinearProgress
                            variant="determinate"
                            value={Math.max(0, Math.min(100, (item.restdays / 30) * 100))}
                            sx={{
                                height: 8,
                                borderRadius: 4,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                    bgcolor: getRemainingDaysColor(item.restdays),
                                    borderRadius: 4
                                }
                            }}
                        />
                        <Typography
                            variant="caption"
                            color={getRemainingDaysColor(item.restdays)}
                            sx={{ mt: 0.5, display: 'block' }}
                        >
                            {Math.floor(item.restdays)} dias restantes
                        </Typography>
                    </Box>
                )}

                {/* Informações */}
                <Stack spacing={1.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Person fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight="medium" noWrap>
                            {item.ts_entity}
                        </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2" noWrap>
                            {getAddressString(item)}
                        </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                        <Phone fontSize="small" color="action" />
                        <Typography variant="body2">
                            {item.phone || "Sem contacto"}
                        </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                        <CalendarToday fontSize="small" color="action" />
                        <Typography variant="body2">
                            {item.submission}
                        </Typography>
                    </Box>
                </Stack>

                <Box sx={styles.touchIndicator}>
                    <TouchApp fontSize="small" />
                </Box>
            </CardContent>

            <CardActions sx={styles.cardActions}>
                <Tooltip title="Navegar">
                    <IconButton
                        size="large"
                        color="primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            onNavigate(item);
                        }}
                    >
                        <MyLocation />
                    </IconButton>
                </Tooltip>
                {item.phone && (
                    <Tooltip title="Ligar">
                        <IconButton
                            size="large"
                            color="success"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCall(item);
                            }}
                        >
                            <Phone />
                        </IconButton>
                    </Tooltip>
                )}
                <Box flexGrow={1} />
                <Tooltip title="Detalhes">
                    <IconButton
                        size="small"
                        color="default"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick();
                        }}
                    >
                        <Assignment />
                    </IconButton>
                </Tooltip>
            </CardActions>
        </Card>
    );
};

export default OperationCard;