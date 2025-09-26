import React, { useState, useEffect } from 'react';
import {
    Box,
    Chip,
    Fade,
    Tooltip,
    CircularProgress,
    Typography
} from '@mui/material';
import {
    Sync as SyncIcon,
    CheckCircle as CheckIcon,
    Error as ErrorIcon,
    Update as UpdateIcon
} from '@mui/icons-material';

/**
 * Componente para indicar estado de atualização dos documentos
 * Fornece feedback visual claro sobre operações em curso
 */
const DocumentUpdateIndicator = ({
    documentId,
    isOptimistic = false,
    isProcessing = false,
    lastUpdate,
    error = null
}) => {
    const [showIndicator, setShowIndicator] = useState(false);
    const [animationKey, setAnimationKey] = useState(0);

    useEffect(() => {
        if (isOptimistic || isProcessing) {
            setShowIndicator(true);
            setAnimationKey(prev => prev + 1);
        } else {
            // Hide after delay to show completion
            const timer = setTimeout(() => {
                setShowIndicator(false);
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [isOptimistic, isProcessing]);

    if (!showIndicator && !error) return null;

    const getIndicatorProps = () => {
        if (error) {
            return {
                color: 'error',
                icon: <ErrorIcon fontSize="small" />,
                label: 'Erro',
                tooltip: `Erro: ${error}`
            };
        }

        if (isProcessing) {
            return {
                color: 'primary',
                icon: <CircularProgress size={16} />,
                label: 'Processando',
                tooltip: 'Operação em curso...'
            };
        }

        if (isOptimistic) {
            return {
                color: 'warning',
                icon: <SyncIcon fontSize="small" />,
                label: 'Sincronizando',
                tooltip: 'Atualizando dados...'
            };
        }

        return {
            color: 'success',
            icon: <CheckIcon fontSize="small" />,
            label: 'Atualizado',
            tooltip: 'Dados atualizados com sucesso'
        };
    };

    const { color, icon, label, tooltip } = getIndicatorProps();

    return (
        <Fade in={true} key={animationKey}>
            <Box display="inline-flex">
                <Tooltip title={tooltip} arrow>
                    <Chip
                        size="small"
                        color={color}
                        icon={icon}
                        label={label}
                        variant={isOptimistic || isProcessing ? "outlined" : "filled"}
                        sx={{
                            fontSize: '0.75rem',
                            height: 24,
                            '& .MuiChip-icon': {
                                fontSize: '0.875rem'
                            },
                            animation: isProcessing ? 'pulse 1.5s infinite' : 'none',
                            '@keyframes pulse': {
                                '0%': { opacity: 1 },
                                '50%': { opacity: 0.5 },
                                '100%': { opacity: 1 }
                            }
                        }}
                    />
                </Tooltip>
            </Box>
        </Fade>
    );
};

/**
 * Componente para mostrar timestamp de última atualização
 */
export const LastUpdateDisplay = ({ timestamp, compact = false }) => {
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        if (!timestamp) return;

        const updateTimeAgo = () => {
            const now = new Date();
            const updateTime = new Date(timestamp);
            const diffMs = now - updateTime;
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 1) {
                setTimeAgo('agora mesmo');
            } else if (diffMins < 60) {
                setTimeAgo(`há ${diffMins}min`);
            } else {
                const diffHours = Math.floor(diffMins / 60);
                setTimeAgo(`há ${diffHours}h`);
            }
        };

        updateTimeAgo();
        const interval = setInterval(updateTimeAgo, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [timestamp]);

    if (!timestamp) return null;

    if (compact) {
        return (
            <Tooltip title={`Última atualização: ${new Date(timestamp).toLocaleString()}`}>
                <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                    }}
                >
                    <UpdateIcon sx={{ fontSize: '0.75rem' }} />
                    {timeAgo}
                </Typography>
            </Tooltip>
        );
    }

    return (
        <Box display="flex" alignItems="center" gap={1}>
            <UpdateIcon fontSize="small" color="action" />
            <Typography variant="body2" color="textSecondary">
                Última atualização: {timeAgo}
            </Typography>
        </Box>
    );
};

export default DocumentUpdateIndicator;