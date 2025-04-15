import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Skeleton,
    Stepper,
    Step,
    StepLabel,
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
import { findMetaValue, getStatusColor, formatDate, renderMemo } from '../../../utils/documentUtils';

const HistoryTab = ({ steps = [], loadingSteps = false, metaData }) => {
    const theme = useTheme();

    // Formatar data com hora
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
            return dateString;
        }
    };

    // Formatar apenas data
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString.replace(' às ', ' '));
            return date.toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    };

    // Ordenar etapas por data (da mais antiga para a mais recente)
    const sortedSteps = [...steps].sort((a, b) => {
        const dateA = new Date(a.when_start || 0);
        const dateB = new Date(b.when_start || 0);
        return dateA - dateB;
    });

    // Calcular etapas do stepper em ordem lógica do processo
    const getSteps = () => {
        if (!steps || steps.length === 0) return [];

        // Mapear os passos por valor 'what'
        const stepsMap = steps.reduce((acc, step) => {
            acc[step.what] = step;
            return acc;
        }, {});

        // Definir ordem lógica dos passos
        // Primeiro "ENTRADA", depois outros passos, por último "CONCLUIDO"
        const stepsInOrder = [];

        // Adicionar "ENTRADA" primeiro, se existir
        const entradaStep = steps.find(step => step.what === "ENTRADA");
        if (entradaStep) stepsInOrder.push(entradaStep);

        // Adicionar passos que não são nem "ENTRADA" nem "CONCLUIDO"
        steps.forEach(step => {
            if (step.what !== "ENTRADA" && step.what !== "CONCLUIDO") {
                // Verificar se este step já foi adicionado
                if (!stepsInOrder.some(s => s.what === step.what)) {
                    stepsInOrder.push(step);
                }
            }
        });

        // Adicionar "CONCLUIDO" por último, se existir
        const concluidoStep = steps.find(step => step.what === "CONCLUIDO");
        if (concluidoStep) stepsInOrder.push(concluidoStep);

        return stepsInOrder.map(step => {
            return {
                label: findMetaValue(metaData?.what, 'step', step.what) || step.what,
                description: formatDateTime(step.when_start),
                completed: step.what === "CONCLUIDO"
            };
        });
    };

    const stepperItems = getSteps();

    if (loadingSteps) {
        return (
            <Box display="flex" flexDirection="column" gap={2} py={2}>
                <Skeleton variant="rectangular" width="100%" height={60} />
                <Skeleton variant="rectangular" width="100%" height={100} />
                <Skeleton variant="rectangular" width="100%" height={100} />
                <Skeleton variant="rectangular" width="100%" height={100} />
            </Box>
        );
    }

    if (steps.length === 0) {
        return (
            <Box textAlign="center" py={3}>
                <Typography variant="body1" color="text.secondary">
                    Sem histórico disponível
                </Typography>
            </Box>
        );
    }

    return (
        <>
            {stepperItems.length > 0 && (
                <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                        p: 2,
                        mb: 3,
                        borderRadius: 1,
                        display: { xs: 'none', md: 'block' }
                    }}
                >
                    <Stepper
                        activeStep={stepperItems.findIndex(step => step.completed)}
                        alternativeLabel
                    >
                        {stepperItems.map((step, index) => (
                            <Step key={index} completed={step.completed}>
                                <StepLabel>{step.label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                </Paper>
            )}

            <Paper elevation={0} variant="outlined" sx={{ borderRadius: 1 }}>
                <List sx={{ width: '100%' }}>
                    {sortedSteps.map((step, index) => (
                        <React.Fragment key={step.pk || index}>
                            <ListItem
                                alignItems="flex-start"
                                sx={{
                                    bgcolor: index === 0 ? (
                                        theme.palette.mode === 'dark'
                                            ? 'rgba(255,255,255,0.05)'
                                            : 'rgba(0,0,0,0.02)'
                                    ) : 'transparent',
                                    py: 2
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar
                                        sx={{
                                            bgcolor: step.what === "CONCLUIDO"
                                                ? theme.palette.success.main
                                                : theme.palette.primary.main
                                        }}
                                    >
                                        {step.what === "CONCLUIDO" ? (
                                            <CheckCircleIcon />
                                        ) : (
                                            <AccessTimeIcon />
                                        )}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle1" fontWeight="medium">
                                                {findMetaValue(metaData?.what, 'step', step.what) || step.what}
                                            </Typography>
                                            <Box>
                                                <Chip
                                                    label={formatDateTime(step.when_start)}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ height: 24, mr: 1 }}
                                                />
                                                {step.when_start !== step.when_stop && (
                                                    <Chip
                                                        label={formatDateTime(step.when_stop)}
                                                        size="small"
                                                        variant="outlined"
                                                        color="primary"
                                                        sx={{ height: 24 }}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                    }
                                    secondary={
                                        <Box component="div">
                                            <Box component="span" sx={{ mt: 0.5 }}>
                                                Realizado por: {findMetaValue(metaData?.who, 'username', step.who) || 'N/A'}
                                            </Box>
                                            {step.memo && (
                                                <Box
                                                    component="div"
                                                    sx={{
                                                        mt: 1,
                                                        p: 1.5,
                                                        bgcolor: theme.palette.mode === 'dark'
                                                            ? 'rgba(255,255,255,0.03)'
                                                            : 'rgba(0,0,0,0.01)',
                                                        borderRadius: 1,
                                                        whiteSpace: 'pre-line',
                                                        border: '1px solid rgba(0, 0, 0, 0.12)'
                                                    }}
                                                >
                                                    {step.memo}
                                                </Box>
                                            )}
                                        </Box>
                                    }
                                    secondaryTypographyProps={{ component: 'div' }} // Add this line
                                />
                            </ListItem>
                            {index < sortedSteps.length - 1 && <Divider component="li" />}
                        </React.Fragment>
                    ))}
                </List>
            </Paper>
        </>
    );
};

export default HistoryTab;