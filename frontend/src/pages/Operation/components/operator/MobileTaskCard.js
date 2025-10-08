// components/operator/MobileTaskCard.js
import React from 'react';
import {
    Card, CardContent, CardActions, Box, Typography, Chip,
    IconButton, LinearProgress, alpha
} from '@mui/material';
import {
    CheckCircle, Schedule, Navigation, Phone, Assignment,
    LocationOn, Business, AccessTime
} from '@mui/icons-material';

/**
 * CARD OTIMIZADO PARA MOBILE - TAREFAS DE OPERADOR
 *
 * Características:
 * - Touch-friendly (botões grandes)
 * - Informação essencial apenas
 * - Visual claro do estado
 * - Ações rápidas (navegar, ligar, concluir)
 */
const MobileTaskCard = ({
    task,
    onTaskClick,
    onComplete,
    onNavigate,
    onCall,
    isPending = true
}) => {

    const handleCardClick = () => {
        onTaskClick(task);
    };

    const handleComplete = (e) => {
        e.stopPropagation();
        onComplete(task);
    };

    const handleNavigate = (e) => {
        e.stopPropagation();
        onNavigate(task);
    };

    const handleCall = (e) => {
        e.stopPropagation();
        onCall(task);
    };

    // Definir cores e ícones baseados no estado
    const getStatusConfig = () => {
        if (!isPending) {
            return {
                color: 'success.main',
                bgcolor: alpha('#4caf50', 0.1),
                borderColor: '#4caf50',
                icon: <CheckCircle color="success" />,
                label: 'Concluída'
            };
        }

        // Lógica para urgência ou prioridade (se existir no teu modelo)
        if (task.urgency === '1' || task.priority === 'high') {
            return {
                color: 'error.main',
                bgcolor: alpha('#f44336', 0.1),
                borderColor: '#f44336',
                icon: <Schedule color="error" />,
                label: 'Urgente'
            };
        }

        return {
            color: 'primary.main',
            bgcolor: alpha('#2196f3', 0.1),
            borderColor: '#2196f3',
            icon: <Schedule color="primary" />,
            label: 'Pendente'
        };
    };

    const statusConfig = getStatusConfig();

    return (
        <Card
            onClick={handleCardClick}
            sx={{
                cursor: 'pointer',
                borderLeft: `4px solid ${statusConfig.borderColor}`,
                bgcolor: statusConfig.bgcolor,
                '&:active': {
                    transform: 'scale(0.98)',
                },
                transition: 'all 0.2s ease',
                opacity: isPending ? 1 : 0.7
            }}
        >
            <CardContent sx={{ pb: 1 }}>
                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box flex={1}>
                        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
                            {task.tt_operacaoaccao || 'Tarefa sem descrição'}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                            {statusConfig.icon}
                            <Chip
                                label={statusConfig.label}
                                size="small"
                                sx={{
                                    bgcolor: statusConfig.color,
                                    color: 'white',
                                    fontSize: '0.75rem',
                                    height: 24
                                }}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* Instalação */}
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Business fontSize="small" color="action" />
                    <Typography variant="body1" fontWeight="medium">
                        {task.tb_instalacao || 'Instalação não especificada'}
                    </Typography>
                </Box>

                {/* Modo de operação */}
                {task.tt_operacaomodo && (
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Assignment fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                            {task.tt_operacaomodo}
                        </Typography>
                    </Box>
                )}

                {/* Operadores atribuídos */}
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="caption" color="text.secondary">
                        <strong>Operador:</strong> {task.ts_operador1 || 'Não atribuído'}
                        {task.ts_operador2 && ` + ${task.ts_operador2}`}
                    </Typography>
                </Box>
            </CardContent>

            {/* Actions para tarefas pendentes */}
            {isPending && (
                <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
                    <Box display="flex" gap={1}>
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={handleNavigate}
                            sx={{
                                bgcolor: alpha('#2196f3', 0.1),
                                '&:hover': { bgcolor: alpha('#2196f3', 0.2) }
                            }}
                        >
                            <Navigation fontSize="small" />
                        </IconButton>

                        {task.phone && (
                            <IconButton
                                size="small"
                                color="success"
                                onClick={handleCall}
                                sx={{
                                    bgcolor: alpha('#4caf50', 0.1),
                                    '&:hover': { bgcolor: alpha('#4caf50', 0.2) }
                                }}
                            >
                                <Phone fontSize="small" />
                            </IconButton>
                        )}
                    </Box>

                    <IconButton
                        color="success"
                        onClick={handleComplete}
                        sx={{
                            bgcolor: 'success.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'success.dark' },
                            minWidth: 'auto',
                            px: 2
                        }}
                    >
                        <CheckCircle fontSize="small" sx={{ mr: 0.5 }} />
                        <Typography variant="button" fontSize="0.75rem">
                            Concluir
                        </Typography>
                    </IconButton>
                </CardActions>
            )}
        </Card>
    );
};

export default MobileTaskCard;