import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Skeleton,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    Divider,
    Chip,
    useTheme,
    LinearProgress,
    Alert
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    AccessTime as AccessTimeIcon,
    RadioButtonChecked as CurrentIcon,
    CircleOutlined as PendingIcon,
    Timeline as TimelineIcon
} from '@mui/icons-material';
import { getWorkflowTimeline, getWorkflowProgress } from '../../../utils/workflowUtils';

const WorkflowTimeline = ({ document, metaData, steps }) => {
    const timeline = getWorkflowTimeline(document, metaData, steps);

    if (!timeline.steps?.length) return null;

    const activeStep = timeline.steps.findIndex(s => s.status === 'current');

    return (
        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimelineIcon sx={{ mr: 1 }} color="primary" />
                Percurso Realizado e Próximos Passos
            </Typography>

            <Stepper
                activeStep={activeStep}
                alternativeLabel
                sx={{
                    '& .MuiStepLabel-label': {
                        fontSize: '0.875rem',
                        fontWeight: 500
                    }
                }}
            >
                {timeline.steps.map((step, index) => (
                    <Step
                        key={index}
                        completed={step.status === 'completed'}
                        active={step.status === 'current'}
                    >
                        <StepLabel
                            icon={
                                step.status === 'completed' ? <CheckCircleIcon color="success" /> :
                                    step.status === 'current' ? <CurrentIcon color="primary" /> :
                                        <PendingIcon />
                            }
                        >
                            {step.stepName}
                        </StepLabel>
                    </Step>
                ))}
            </Stepper>
        </Paper>
    );
};

const HistoryTab = ({ steps = [], loadingSteps = false, metaData, document }) => {
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

    // Encontrar valor nos metadados
    const findMetaValue = (metaArray, field, value) => {
        if (!metaArray || !value) return value;
        const item = metaArray.find(item => item.pk === value || item[field] === value);
        return item ? item[field] : value;
    };

    // Ordenar etapas por data
    const sortedSteps = [...steps].sort((a, b) => {
        const dateA = new Date(a.when_start || 0);
        const dateB = new Date(b.when_start || 0);
        return dateA - dateB;
    });

    if (loadingSteps) {
        return (
            <Box display="flex" flexDirection="column" gap={2} py={2}>
                <Skeleton variant="rectangular" width="100%" height={200} />
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
            {/* Timeline do Workflow */}
            {document && metaData?.step_transitions && (
                <WorkflowTimeline
                    document={document}
                    metaData={metaData}
                    steps={steps}
                />
            )}

            {/* Histórico detalhado */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Histórico Detalhado
            </Typography>

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
                                    secondaryTypographyProps={{ component: 'div' }}
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