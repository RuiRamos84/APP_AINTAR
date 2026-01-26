import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    Stack,
    IconButton,
    useTheme,
    alpha
} from '@mui/material';
import {
    LocationOn,
    Phone,
    AccessTime,
    PriorityHigh,
    CheckCircle,
    ArrowForward
} from '@mui/icons-material';

const OperationCard = ({
    item,
    onClick,
    onNavigate,
    onCall,
    onComplete,
    isUrgent,
    canAct,
    getRemainingDaysColor,
    getAddressString
}) => {
    const theme = useTheme();

    // Helper to format deadline/rest days
    const renderDeadline = () => {
        if (!item.restdays) return null;
        const color = getRemainingDaysColor ? getRemainingDaysColor(item.restdays) : theme.palette.text.secondary;
        return (
            <Chip
                icon={<AccessTime sx={{ fontSize: 16 }} />}
                label={`${Math.floor(item.restdays)} dias`}
                size="small"
                sx={{
                    bgcolor: alpha(color, 0.1),
                    color: color,
                    fontWeight: 600,
                    border: `1px solid ${alpha(color, 0.2)}`
                }}
            />
        );
    };

    return (
        <Card
            sx={{
                height: '100%',
                position: 'relative',
                transition: 'all 0.2s',
                cursor: onClick ? 'pointer' : 'default',
                bgcolor: alpha(theme.palette.background.paper, 0.6),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.text.primary, 0.05)}`,
                '&:hover': {
                    transform: onClick ? 'translateY(-4px)' : 'none',
                    boxShadow: theme.shadows[4],
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                }
            }}
            onClick={onClick}
        >
            {isUrgent && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        p: 0.5,
                        pl: 1.5,
                        pb: 1.5,
                        bgcolor: theme.palette.error.main,
                        color: 'white',
                        borderRadius: '0 0 0 16px',
                        zIndex: 1
                    }}
                >
                    <PriorityHigh fontSize="small" />
                </Box>
            )}

            <CardContent>
                <Stack spacing={2}>
                    {/* Header: Type & ID */}
                    <Box pr={isUrgent ? 3 : 0}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            {item.ts_entity || 'Entidade Desconhecida'} | {item.regnumber}
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>
                            {item.tt_type_name || item.tt_type}
                        </Typography>
                    </Box>

                    {/* Deadline Badge */}
                    <Box>{renderDeadline()}</Box>

                    {/* Address */}
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                        <LocationOn fontSize="small" color="action" sx={{ mt: 0.3 }} />
                        <Typography variant="body2" color="text.secondary">
                            {getAddressString ? getAddressString(item) : `${item.address || ''} ${item.postal || ''}`}
                        </Typography>
                    </Stack>

                    {/* Description or Info */}
                    {(item.description || item.observations) && (
                        <Typography variant="body2" sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            color: 'text.secondary'
                        }}>
                            {item.description || item.observations}
                        </Typography>
                    )}

                    {/* Actions */}
                    <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 'auto' }}>
                        {item.phone && (
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCall && onCall(item);
                                }}
                                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}
                            >
                                <Phone fontSize="small" />
                            </IconButton>
                        )}
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onNavigate && onNavigate(item);
                            }}
                            sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.main' }}
                        >
                            <LocationOn fontSize="small" />
                        </IconButton>
                        {canAct && (
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onComplete && onComplete(item);
                                }}
                                sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main' }}
                            >
                                <CheckCircle fontSize="small" />
                            </IconButton>
                        )}
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default OperationCard;
