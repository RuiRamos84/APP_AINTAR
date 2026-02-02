import React from 'react';
import { 
  Box, 
  Typography, 
  Stepper, 
  Step, 
  StepLabel, 
  StepContent, 
  Paper,
  Avatar,
  useTheme,
  alpha
} from '@mui/material';
import { 
  Person as PersonIcon, 
  CheckCircle as CheckIcon,
  Schedule as PendingIcon 
} from '@mui/icons-material';
import { formatDate } from '../../utils/documentUtils';

/**
 * Vertical Timeline for Document Steps
 */
const DocumentTimeline = ({ steps, metaData }) => {
  const theme = useTheme();

  if (!steps || steps.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Sem histórico disponível.
        </Typography>
      </Box>
    );
  }

  const findMetaValue = (metaArray, key, value) => {
    if (!metaArray) return value;
    const meta = metaArray.find(item => item.pk === value || item[key] === value);
    return meta ? (meta.name || meta.username || meta.step) : value;
  };

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Stepper orientation="vertical">
        {steps.map((step, index) => {
            const whoName = findMetaValue(metaData?.who, 'username', step.who);
            const whatLabel = findMetaValue(metaData?.what, 'step', step.what);
            
            return (
              <Step key={step.pk || index} active={true} expanded={true}>
                <StepLabel
                  StepIconComponent={() => (
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        bgcolor: index === 0 ? theme.palette.primary.main : theme.palette.grey[300],
                        color: index === 0 ? 'white' : theme.palette.text.secondary
                      }}
                    >
                       {index === 0 ? <CheckIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                    </Avatar>
                  )}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {whatLabel || step.step_label || `Passo ${steps.length - index}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(step.when_start)}
                    </Typography>
                  </Box>
                </StepLabel>
                
                <StepContent>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      bgcolor: alpha(theme.palette.background.default, 0.5),
                      border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {step.memo || 'Sem observações.'}
                    </Typography>
                    
                    {whoName && (
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon fontSize="inherit" color="action" style={{ fontSize: 14 }} />
                        <Typography variant="caption" color="text.secondary">
                          {whoName}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </StepContent>
              </Step>
            );
        })}
      </Stepper>
    </Box>
  );
};

export default DocumentTimeline;
