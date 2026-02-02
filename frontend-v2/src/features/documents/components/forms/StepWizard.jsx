import React from 'react';
import { 
    Box, 
    Stepper, 
    Step, 
    StepLabel, 
    Button, 
    Typography, 
    DialogContent,
    DialogActions,
    useTheme,
    alpha
} from '@mui/material';

/**
 * Reusable Wizard Component for Multi-step forms
 */
const StepWizard = ({ 
    activeStep, 
    steps, 
    handleNext, 
    handleBack, 
    isLastStep, 
    isLoading,
    children,
    onClose
}) => {
    const theme = useTheme();

    return (
        <>
            {/* Stepper Header */}
            <Box sx={{ px: 3, pt: 3, pb: 1 }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>

            {/* Content Area */}
            <DialogContent dividers sx={{ p: 0, overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
                 <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
                    {children}
                 </Box>
            </DialogContent>

            {/* Actions Footer */}
            <DialogActions sx={{ px: 3, py: 2, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                <Button 
                    onClick={onClose} 
                    color="inherit" 
                    disabled={isLoading}
                >
                    Cancelar
                </Button>
                
                <Box sx={{ flexGrow: 1 }} />
                
                <Button 
                    disabled={activeStep === 0 || isLoading} 
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                >
                    Anterior
                </Button>
                
                <Button 
                    variant="contained" 
                    onClick={handleNext} 
                    disabled={isLoading}
                    color="primary"
                    size="large"
                    sx={{ minWidth: 100 }}
                >
                    {isLoading ? 'A processar...' : isLastStep ? 'Criar Pedido' : 'Próximo'}
                </Button>
            </DialogActions>
        </>
    );
};

export default StepWizard;
