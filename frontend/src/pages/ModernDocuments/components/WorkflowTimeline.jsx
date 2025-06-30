import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Stepper,
    Step,
    StepLabel,
    Chip,
    useTheme
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    RadioButtonChecked as CurrentIcon,
    CircleOutlined as PendingIcon,
    Timeline as TimelineIcon
} from '@mui/icons-material';
import { getWorkflowTimeline } from '../../../utils/workflowUtils';

const WorkflowTimeline = ({ document, metaData, steps }) => {
    const theme = useTheme();
    const timeline = getWorkflowTimeline(document, metaData, steps);

    if (!timeline.steps?.length) return null;

    const activeStep = timeline.steps.findIndex(s => s.status === 'current');

    // Formatar data
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: '2-digit'
            });
        } catch {
            return '';
        }
    };

    return (
        <Paper 
            elevation={0} 
            variant="outlined" 
            sx={{ 
                p: 2, 
                mb: 3, 
                borderRadius: 1,
                maxHeight: '60vh', // Limitar altura
                overflowY: 'auto'   // Scroll se necessário
            }}
        >
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimelineIcon sx={{ mr: 1 }} color="primary" />
                Percurso do Pedido
            </Typography>

            <Stepper
                activeStep={activeStep}
                orientation="vertical"
                sx={{
                    '& .MuiStepLabel-label': {
                        fontSize: '0.875rem',
                        fontWeight: 500
                    },
                    '& .MuiStepContent-root': {
                        borderLeft: '2px solid',
                        borderColor: theme.palette.divider,
                        ml: 2,
                        pl: 2
                    }
                }}
            >
                {timeline.steps.map((step, index) => {
                    const isCompleted = step.status === 'completed';
                    const isCurrent = step.status === 'current';
                    
                    return (
                        <Step key={`${step.stepId}-${index}`} completed={isCompleted} active={isCurrent}>
                            <StepLabel
                                icon={
                                    isCompleted ? <CheckCircleIcon color="success" sx={{ fontSize: 20 }} /> :
                                    isCurrent ? <CurrentIcon color="primary" sx={{ fontSize: 20 }} /> :
                                    <PendingIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                                }
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography variant="body2" sx={{ fontWeight: isCurrent ? 600 : 400 }}>
                                        {step.stepName}
                                    </Typography>
                                    
                                    {/* Data e utilizador (só para concluídos) */}
                                    {isCompleted && step.when && (
                                        <Chip
                                            label={formatDate(step.when)}
                                            size="small"
                                            variant="outlined"
                                            sx={{ height: 20, fontSize: '0.75rem' }}
                                        />
                                    )}
                                    
                                    {/* Indicador de estado actual */}
                                    {isCurrent && (
                                        <Chip
                                            label="Actual"
                                            size="small"
                                            color="primary"
                                            sx={{ height: 20, fontSize: '0.75rem' }}
                                        />
                                    )}
                                </Box>
                            </StepLabel>
                        </Step>
                    );
                })}
            </Stepper>

            {/* Indicador de reabertura */}
            {timeline.steps.filter(s => s.status === 'completed').length > 1 && (
                <Box sx={{ mt: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="caption" color="info.dark">
                        Este pedido teve alterações no seu percurso
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

export default WorkflowTimeline;