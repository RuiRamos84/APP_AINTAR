// components/operator/MobileCompletionFlow.js
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Box, Typography, Stepper, Step, StepLabel,
    Alert, CircularProgress
} from '@mui/material';
import { CheckCircle, Assignment, Note } from '@mui/icons-material';

const MobileCompletionFlow = ({ open, onClose, task, onCompleted }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const steps = ['Confirmar Tarefa', 'Adicionar Observações', 'Concluir'];

    const handleNext = () => {
        if (activeStep === steps.length - 1) {
            handleComplete();
        } else {
            setActiveStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setActiveStep(prev => prev - 1);
    };

    const handleComplete = async () => {
        if (!note.trim()) {
            setError('Por favor adicione uma observação sobre a tarefa executada.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Aqui farias a chamada à API para marcar como concluída
            // await operationsApi.completeTask(task.pk, note);

            // Simular chamada API
            await new Promise(resolve => setTimeout(resolve, 1500));

            onCompleted();
            handleClose();
        } catch (err) {
            setError('Erro ao concluir tarefa. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setActiveStep(0);
        setNote('');
        setError('');
        onClose();
    };

    if (!task) return null;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircle color="primary" />
                    Concluir Tarefa
                </Box>
            </DialogTitle>

            <DialogContent>
                <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Step 0: Confirmar Tarefa */}
                {activeStep === 0 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Confirme os detalhes da tarefa:
                        </Typography>
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                            <Typography variant="body1" fontWeight="medium">
                                {task.tt_operacaoaccao || 'Tarefa sem descrição'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Local: {task.tb_instalacao || 'Não especificado'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Modo: {task.tt_operacaomodo || 'Não especificado'}
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            Confirma que esta tarefa foi executada?
                        </Typography>
                    </Box>
                )}

                {/* Step 1: Observações */}
                {activeStep === 1 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Adicione observações sobre a execução:
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Descreva brevemente como foi executada a tarefa, eventuais problemas encontrados, materiais utilizados, etc."
                            variant="outlined"
                            sx={{ mt: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Esta informação será enviada ao supervisor.
                        </Typography>
                    </Box>
                )}

                {/* Step 2: Revisão final */}
                {activeStep === 2 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Revisão Final:
                        </Typography>
                        <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                            <Typography variant="body1" fontWeight="medium" gutterBottom>
                                ✅ {task.tt_operacaoaccao}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Local: {task.tb_instalacao}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Observações: {note}
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Ao confirmar, esta tarefa será marcada como concluída.
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleClose} disabled={loading}>
                    Cancelar
                </Button>

                {activeStep > 0 && (
                    <Button onClick={handleBack} disabled={loading}>
                        Voltar
                    </Button>
                )}

                <Button
                    onClick={handleNext}
                    variant="contained"
                    disabled={loading || (activeStep === 1 && !note.trim())}
                    startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                    {activeStep === steps.length - 1 ? 'Concluir Tarefa' : 'Próximo'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MobileCompletionFlow;