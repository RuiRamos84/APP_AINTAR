import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Skeleton,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    Divider,
    Chip,
    useTheme
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import VerticalStackTimeline from './VerticalStackTimeline';

/**
 * Componente HistoryTab - Gerencia a exibição do histórico e timeline do documento
 * 
 * @param {Object} props
 * @param {Array} props.steps - Array de passos executados
 * @param {boolean} props.loadingSteps - Estado de carregamento
 * @param {Object} props.metaData - Metadados do workflow
 * @param {Object} props.document - Documento atual
 */
const HistoryTab = ({ steps = [], loadingSteps = false, metaData, document }) => {
    const theme = useTheme();

    console.log('HistoryTab steps:', steps);
    console.log('HistoryTab document:', document);

    /**
     * Formatar data com hora para exibição
     */
    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString.replace(' às ', ' '));
            return date.toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.warn('Erro ao formatar data:', dateString, error);
            return dateString;
        }
    };

    /**
     * Encontrar valor nos metadados baseado em campo e valor
     */
    const findMetaValue = (metaArray, field, value) => {
        if (!metaArray || !value) return value;
        const item = metaArray.find(item => item.pk === value || item[field] === value);
        return item ? item[field] : value;
    };

    /**
     * Encontrar nome do utilizador nos metadados
     */
    const findUserName = (metaArray, userIdentifier) => {
        if (!metaArray || !userIdentifier) return userIdentifier || 'N/A';

        // Procurar por pk, username ou name
        const user = metaArray.find(item =>
            item.pk === userIdentifier ||
            item.username === userIdentifier ||
            item.name === userIdentifier
        );

        // Retornar o nome se encontrado, senão retornar o identificador original
        return user ? user.name : userIdentifier;
    };

    /**
     * Verificar se um step está concluído
     */
    const isStepCompleted = (stepWhat) => {
        return stepWhat === "CONCLUIDO" || stepWhat === "FINALIZADO" || stepWhat === "APROVADO";
    };

    // Ordenar etapas por 'ord' (ordem de execução real)
    const sortedSteps = [...steps].sort((a, b) => {
        // Ordenar por 'ord' para mostrar ordem real de execução
        if (a.ord !== undefined && b.ord !== undefined) {
            return a.ord - b.ord;
        }
        // Se não houver 'ord', usar data como fallback
        const dateA = new Date(a.when_start || 0);
        const dateB = new Date(b.when_start || 0);
        return dateA - dateB;
    });

    // Estados de loading
    if (loadingSteps) {
        return (
            <Box display="flex" flexDirection="column" gap={2} py={2}>
                <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={100} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={100} sx={{ borderRadius: 1 }} />
            </Box>
        );
    }

    // Estado vazio
    if (steps.length === 0) {
        return (
            <Box>
                {/* Timeline mesmo sem steps para mostrar estado atual */}
                {document && metaData?.what && (
                    <VerticalStackTimeline
                        document={document}
                        metaData={metaData}
                        steps={steps}
                        title="Percurso do Documento"
                    />
                )}

                <Box textAlign="center" py={4}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Sem histórico disponível
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Este documento ainda não possui movimentações registadas.
                    </Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box>
            {/* Timeline Component */}
            {document && metaData?.what && (
                <VerticalStackTimeline
                    document={document}
                    metaData={metaData}
                    steps={steps}
                    title="Percurso do Documento"
                    sx={{ mb: 3 }}
                />
            )}

            {/* Seção do Histórico Detalhado */}
            <Box sx={{ mt: 3 }}>
                <Typography
                    variant="h6"
                    gutterBottom
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mb: 2,
                        fontWeight: 600
                    }}
                >
                    Histórico Detalhado
                    <Chip
                        label={`${steps.length} ${steps.length === 1 ? 'movimento' : 'movimentos'}`}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 2, height: 24 }}
                    />
                </Typography>

                <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                        borderRadius: 1,
                        overflow: 'hidden'
                    }}
                >
                    <List sx={{ width: '100%', p: 0 }}>
                        {sortedSteps.map((step, index) => {
                            const isCompleted = isStepCompleted(step.what);
                            const isLastItem = index === sortedSteps.length - 1;
                            const isFirstItem = index === 0;

                            return (
                                <React.Fragment key={step.pk || `step-${index}`}>
                                    <ListItem
                                        alignItems="flex-start"
                                        sx={{
                                            bgcolor: isFirstItem ? (
                                                theme.palette.mode === 'dark'
                                                    ? 'rgba(255,255,255,0.05)'
                                                    : 'rgba(0,0,0,0.02)'
                                            ) : 'transparent',
                                            py: 2.5,
                                            px: 2,
                                            transition: 'background-color 0.2s ease',
                                            '&:hover': {
                                                bgcolor: theme.palette.mode === 'dark'
                                                    ? 'rgba(255,255,255,0.03)'
                                                    : 'rgba(0,0,0,0.01)'
                                            }
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar
                                                sx={{
                                                    bgcolor: isCompleted
                                                        ? theme.palette.success.main
                                                        : theme.palette.primary.main,
                                                    width: 40,
                                                    height: 40
                                                }}
                                            >
                                                {isCompleted ? (
                                                    <CheckCircleIcon />
                                                ) : (
                                                    <AccessTimeIcon />
                                                )}
                                            </Avatar>
                                        </ListItemAvatar>

                                        <ListItemText
                                            primary={
                                                <Box
                                                    display="flex"
                                                    justifyContent="space-between"
                                                    alignItems="flex-start"
                                                    flexWrap="wrap"
                                                    gap={1}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography
                                                            variant="subtitle1"
                                                            fontWeight="medium"
                                                            sx={{
                                                                color: 'text.primary',
                                                                fontSize: '1rem'
                                                            }}
                                                        >
                                                            {findMetaValue(metaData?.what, 'step', step.what) || step.what}
                                                        </Typography>

                                                        {/* Mostrar ordem do step */}
                                                        {step.ord !== undefined && (
                                                            <Chip
                                                                label={`#${step.ord + 1}`}
                                                                size="small"
                                                                color="default"
                                                                variant="outlined"
                                                                sx={{
                                                                    height: 20,
                                                                    fontSize: '0.65rem',
                                                                    fontWeight: 600,
                                                                    '& .MuiChip-label': { px: 0.5 }
                                                                }}
                                                            />
                                                        )}
                                                    </Box>

                                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                        <Chip
                                                            label={`Início: ${formatDateTime(step.when_start)}`}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{
                                                                height: 24,
                                                                fontSize: '0.75rem'
                                                            }}
                                                        />

                                                        {step.when_start !== step.when_stop && step.when_stop && (
                                                            <Chip
                                                                label={`Fim: ${formatDateTime(step.when_stop)}`}
                                                                size="small"
                                                                variant="outlined"
                                                                color="primary"
                                                                sx={{
                                                                    height: 24,
                                                                    fontSize: '0.75rem'
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                </Box>
                                            }
                                            secondary={
                                                <Box component="div" sx={{ mt: 1 }}>
                                                    {/* Informações do usuário */}
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                            mb: step.memo ? 1 : 0
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                            sx={{ fontWeight: 500 }}
                                                        >
                                                            Realizado por:
                                                        </Typography>
                                                        <Chip
                                                            label={findUserName(metaData?.who, step.who)}
                                                            size="small"
                                                            variant="filled"
                                                            color="default"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: '0.7rem',
                                                                fontWeight: 500
                                                            }}
                                                        />
                                                    </Box>

                                                    {/* Memorando/Observações */}
                                                    {step.memo && (
                                                        <Box
                                                            component="div"
                                                            sx={{
                                                                mt: 1.5,
                                                                p: 2,
                                                                bgcolor: theme.palette.mode === 'dark'
                                                                    ? 'rgba(255,255,255,0.03)'
                                                                    : 'rgba(0,0,0,0.02)',
                                                                borderRadius: 1,
                                                                whiteSpace: 'pre-line',
                                                                border: `1px solid ${theme.palette.divider}`,
                                                                position: 'relative'
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: -8,
                                                                    left: 8,
                                                                    bgcolor: 'background.paper',
                                                                    px: 1,
                                                                    color: 'text.secondary',
                                                                    fontSize: '0.65rem',
                                                                    fontWeight: 600,
                                                                    textTransform: 'uppercase'
                                                                }}
                                                            >
                                                                Observações
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    lineHeight: 1.4,
                                                                    color: 'text.primary',
                                                                    mt: 0.5
                                                                }}
                                                            >
                                                                {step.memo}
                                                            </Typography>
                                                        </Box>
                                                    )}

                                                    {/* Duração do step (se disponível) */}
                                                    {step.when_start && step.when_stop && step.when_start !== step.when_stop && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                sx={{
                                                                    fontStyle: 'italic',
                                                                    fontSize: '0.7rem'
                                                                }}
                                                            >
                                                                Duração: {(() => {
                                                                    try {
                                                                        const start = new Date(step.when_start.replace(' às ', ' '));
                                                                        const end = new Date(step.when_stop.replace(' às ', ' '));
                                                                        const diffMs = end - start;
                                                                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                                                        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                                                        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                                                                        if (diffDays > 0) {
                                                                            return `${diffDays} dia${diffDays > 1 ? 's' : ''} e ${diffHours}h`;
                                                                        } else if (diffHours > 0) {
                                                                            return `${diffHours}h ${diffMinutes}min`;
                                                                        } else {
                                                                            return `${diffMinutes} minutos`;
                                                                        }
                                                                    } catch (error) {
                                                                        return 'N/A';
                                                                    }
                                                                })()}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            }
                                            secondaryTypographyProps={{ component: 'div' }}
                                        />
                                    </ListItem>

                                    {/* Divisor entre items */}
                                    {!isLastItem && (
                                        <Divider
                                            component="li"
                                            sx={{
                                                mx: 2,
                                                borderColor: theme.palette.divider
                                            }}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </List>
                </Paper>

                {/* Estatísticas do histórico */}
                <Box
                    sx={{
                        mt: 2,
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 2
                    }}
                >
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="primary.main" fontWeight="bold">
                                {sortedSteps.length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Movimentos
                            </Typography>
                        </Box>

                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="success.main" fontWeight="bold">
                                {sortedSteps.filter(step => isStepCompleted(step.what)).length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Concluídos
                            </Typography>
                        </Box>

                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="info.main" fontWeight="bold">
                                {new Set(sortedSteps.map(step => step.who)).size}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Utilizadores
                            </Typography>
                        </Box>
                    </Box>

                    {/* Tempo total do processo */}
                    {sortedSteps.length > 1 && (
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                                Tempo total do processo:
                            </Typography>
                            <Typography variant="body2" fontWeight="medium" color="text.primary">
                                {(() => {
                                    try {
                                        const firstStep = sortedSteps[0];
                                        const lastStep = sortedSteps[sortedSteps.length - 1];
                                        const start = new Date(firstStep.when_start.replace(' às ', ' '));
                                        const end = new Date((lastStep.when_stop || lastStep.when_start).replace(' às ', ' '));
                                        const diffMs = end - start;
                                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                                        if (diffDays > 0) {
                                            return `${diffDays} dia${diffDays > 1 ? 's' : ''}`;
                                        } else {
                                            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                            return `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
                                        }
                                    } catch (error) {
                                        return 'N/A';
                                    }
                                })()}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default HistoryTab;