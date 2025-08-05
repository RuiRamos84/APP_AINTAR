import React, { useState } from 'react';
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
import WorkflowViewer from './WorkflowViewer';

const HistoryTab = ({ steps = [], loadingSteps = false, metaData, document }) => {
    const theme = useTheme();
    const [workflowData, setWorkflowData] = useState(null);

    const handleWorkflowLoaded = (workflow) => {
        setWorkflowData(workflow);
    };

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

    const calculateDuration = (start, end) => {
        if (!start || !end || start === end) return null;

        try {
            const startDate = new Date(start.replace(' às ', ' '));
            const endDate = new Date(end.replace(' às ', ' '));
            const diffMs = endDate - startDate;

            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) return `${days}d ${hours}h`;
            if (hours > 0) return `${hours}h ${minutes}min`;
            return `${minutes}min`;
        } catch {
            return null;
        }
    };


    const calculateTotalTime = () => {
        if (sortedSteps.length === 0) return null;

        try {
            const firstStep = sortedSteps[0];
            const now = new Date();
            const startDate = new Date(firstStep.when_start.replace(' às ', ' '));
            const diffMs = now - startDate;

            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) return `${days}d ${hours}h ${minutes}min`;
            if (hours > 0) return `${hours}h ${minutes}min`;
            return `${minutes}min`;
        } catch {
            return null;
        }
    };


    const findMetaValue = (metaArray, field, value) => {
        if (!metaArray || !value) return value;
        const item = metaArray.find(item => item.pk === value || item[field] === value);
        return item ? item[field] : value;
    };

    const findUserName = (metaArray, userIdentifier) => {
        if (!metaArray || !userIdentifier) return userIdentifier || 'N/A';
        const user = metaArray.find(item =>
            item.pk === userIdentifier ||
            item.username === userIdentifier ||
            item.name === userIdentifier
        );
        return user ? user.name : userIdentifier;
    };

    const isStepCompleted = (stepWhat) => {
        return stepWhat === "CONCLUIDO" || stepWhat === "FINALIZADO" || stepWhat === "APROVADO";
    };

    const sortedSteps = [...steps].sort((a, b) => {
        if (a.ord !== undefined && b.ord !== undefined) {
            return a.ord - b.ord;
        }
        const dateA = new Date(a.when_start || 0);
        const dateB = new Date(b.when_start || 0);
        return dateA - dateB;
    });

    if (loadingSteps) {
        return (
            <Box display="flex" flexDirection="column" gap={2} py={2}>
                <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={100} sx={{ borderRadius: 1 }} />
            </Box>
        );
    }

    return (
        <Box>
            {/* Timeline com ícone workflow */}
            <VerticalStackTimeline
                document={document}
                metaData={metaData}
                steps={steps}
                workflowData={workflowData}
                title="Evolução do pedido"
                showWorkflowIcon={true}
                sx={{ mb: 3 }}
            />

            {/* Histórico detalhado */}
            {steps.length === 0 ? (
                <Box textAlign="center" py={4}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Sem histórico disponível
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Este documento ainda não possui movimentações registadas.
                    </Typography>
                </Box>
            ) : (
                <Box>
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

                    <Paper elevation={0} variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
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
                                                bgcolor: isFirstItem ? 'rgba(0,0,0,0.02)' : 'transparent',
                                                py: 2.5,
                                                px: 2,
                                                '&:hover': { bgcolor: 'rgba(0,0,0,0.01)' }
                                            }}
                                        >
                                            <ListItemAvatar>
                                                <Avatar
                                                    sx={{
                                                        bgcolor: isCompleted ? 'success.main' : 'primary.main',
                                                        width: 40,
                                                        height: 40
                                                    }}
                                                >
                                                    {isCompleted ? <CheckCircleIcon /> : <AccessTimeIcon />}
                                                </Avatar>
                                            </ListItemAvatar>

                                            <ListItemText
                                                primary={
                                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="subtitle1" fontWeight="medium" sx={{ fontSize: '1rem' }}>
                                                                {findMetaValue(metaData?.what, 'step', step.what) || step.what}
                                                            </Typography>
                                                            {step.ord !== undefined && (
                                                                <Chip
                                                                    label={`#${step.ord + 1}`}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                                                />
                                                            )}
                                                        </Box>
                                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                            <Chip
                                                                label={`Início: ${formatDateTime(step.when_start)}`}
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{ height: 24, fontSize: '0.75rem' }}
                                                            />
                                                            {step.when_start !== step.when_stop && step.when_stop && (
                                                                <>
                                                                    <Chip
                                                                        label={`Fim: ${formatDateTime(step.when_stop)}`}
                                                                        size="small"
                                                                        variant="outlined"
                                                                        color="primary"
                                                                        sx={{ height: 24, fontSize: '0.75rem' }}
                                                                    />
                                                                    
                                                                </>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box component="div" sx={{ mt: 1 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: step.memo ? 1 : 0 }}>
                                                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                                Enviado para:
                                                            </Typography>
                                                            <Chip
                                                                label={findUserName(metaData?.who, step.who)}
                                                                size="small"
                                                                variant="filled"
                                                                sx={{ height: 20, fontSize: '0.7rem' }}
                                                            />
                                                        </Box>

                                                        {step.memo && (
                                                            <Box
                                                                sx={{
                                                                    mt: 1.5,
                                                                    p: 2,
                                                                    bgcolor: 'rgba(0,0,0,0.02)',
                                                                    borderRadius: 1,
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
                                                                        fontSize: '0.65rem',
                                                                        fontWeight: 600,
                                                                        textTransform: 'uppercase'
                                                                    }}
                                                                >
                                                                    Observações
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ lineHeight: 1.4, mt: 0.5 }}>
                                                                    {step.memo}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                        {calculateDuration(step.when_start, step.when_stop) && (
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ color: 'text.secondary', fontStyle: 'italic', mt: 1, fontSize: '0.75rem' }}
                                                            >
                                                                Duração: {calculateDuration(step.when_start, step.when_stop)}
                                                            </Typography>

                                                        )}
                                                    </Box>
                                                }
                                                secondaryTypographyProps={{ component: 'div' }}
                                                />
                                        </ListItem>
                                        {!isLastItem && <Divider component="li" sx={{ mx: 2 }} />}
                                    </React.Fragment>
                                );
                            })}
                        </List>
                    </Paper>

                    {/* Estatísticas */}
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

                        {/* Tempo total desde início */}
                        {calculateTotalTime() && (
                            <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        Tempo total decorrido desde entrada:
                                    </Typography>
                                <Typography variant="body2" fontWeight="medium" color="text.primary">
                                    {calculateTotalTime()}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            )}

            {/* WorkflowViewer oculto - só carrega dados */}
            <Box sx={{ display: 'none' }}>
                <WorkflowViewer
                    document={document}
                    metaData={metaData}
                    steps={steps}
                    onWorkflowLoaded={handleWorkflowLoaded}
                />
            </Box>
        </Box>
    );
};

export default HistoryTab;