import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Button, IconButton, Stepper, Step, StepLabel,
    TextField, Alert, Input, CircularProgress
} from '@mui/material';
import { Close, NavigateNext, NavigateBefore, Send, AttachFile } from '@mui/icons-material';
import SimpleParametersEditor from '../ParametersModal/SimpleParametersEditor';
import { getDocumentTypeParams, addDocumentStep } from '../../../../services/documentService';
import { getCompletionStep } from '../../utils/workflowHelpers';
import { notifySuccess, notifyError } from '../../../../components/common/Toaster/ThemedToaster';
import { useMetaData } from '../../../../contexts/MetaDataContext';

const steps = ['Parâmetros do Serviço', 'Conclusão da Tarefa'];

const CompletionWizardModal = ({ open, onClose, document, onComplete }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [documentParams, setDocumentParams] = useState(null);
    const [completionNote, setCompletionNote] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const { metaData: globalMetaData } = useMetaData();
    const paramsEditorRef = useRef(null);

    useEffect(() => {
        if (open && document) {
            fetchMetaData();
            // Reset state ao abrir
            setActiveStep(0);
            setCompletionNote('');
            setSelectedFile(null);
        }
    }, [open, document]);

    const fetchMetaData = async () => {
        if (!document?.pk) return;

        setLoading(true);
        try {
            const response = await getDocumentTypeParams(document.pk);
            setDocumentParams(response);
        } catch (error) {
            console.error("Erro ao buscar parâmetros:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async () => {
        // Se estamos no Passo 1 (Parâmetros), guardar antes de avançar
        if (activeStep === 0) {
            if (!paramsEditorRef.current) {
                notifyError('Editor de parâmetros não disponível.');
                return;
            }

            setLoading(true);
            try {
                console.log('💾 A guardar parâmetros antes de avançar...');
                await paramsEditorRef.current.saveParams();
                console.log('✅ Parâmetros guardados com sucesso!');
                notifySuccess('Parâmetros guardados! Agora adicione uma nota.');
                setActiveStep((prevActiveStep) => prevActiveStep + 1);
            } catch (error) {
                console.error('❌ Erro ao guardar parâmetros:', error);
                // O erro já foi mostrado no SimpleParametersEditor
                return; // Não avança se houver erro
            } finally {
                setLoading(false);
            }
        } else {
            // Outros passos: apenas avançar
            setActiveStep((prevActiveStep) => prevActiveStep + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleFinalSubmit = async () => {
        if (!completionNote.trim()) {
            notifyError('A nota de conclusão é obrigatória');
            return;
        }

        if (!document || !globalMetaData) {
            notifyError('Metadados não carregados. Por favor, tente novamente.');
            return;
        }

        setLoading(true);
        try {
            // 1️⃣ PARÂMETROS JÁ FORAM GUARDADOS no Passo 1 ✅

            // 2️⃣ DETERMINAR PRÓXIMO STEP (WORKFLOW DINÂMICO)
            console.log('🎯 Passo 1/2: A determinar próximo step via workflow...');
            const nextStep = getCompletionStep(document, globalMetaData);

            if (!nextStep || !nextStep.what || !nextStep.who) {
                throw new Error("Não foi encontrada uma transição válida no workflow para este estado.");
            }

            // 3️⃣ CONCLUIR E ENCAMINHAR
            console.log('📤 Passo 2/2: A concluir e encaminhar tarefa...');
            const nextStepData = {
                what: nextStep.what,
                who: nextStep.who,
                memo: completionNote,
                tb_document: document.pk,
            };

            console.log('📤 Enviando step:', nextStepData);
            await addDocumentStep(document.pk, nextStepData);

            // TODO: Se houver ficheiro, fazer upload (implementar depois)
            if (selectedFile) {
                console.log('📎 Ficheiro anexado:', selectedFile.name);
                // await uploadAttachment(document.pk, selectedFile);
            }

            // ✅ SUCESSO
            notifySuccess('✅ Tarefa concluída com sucesso!');
            onComplete(document.pk);
            handleClose();

        } catch (error) {
            console.error("❌ Erro ao processar:", error);
            if (!error.response?.data?.erro) {
                notifyError(error.message || "Ocorreu um erro ao processar a tarefa.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setActiveStep(0);
        setCompletionNote('');
        setSelectedFile(null);
        onClose();
    };

    const isLastStep = activeStep === steps.length - 1;
    const isNoteValid = completionNote.trim().length > 0;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="md"
            PaperProps={{ sx: { borderRadius: 2, minHeight: '70vh' } }}
        >
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">
                        Concluir Serviço - {document?.regnumber}
                    </Typography>
                    <IconButton onClick={handleClose} disabled={loading}>
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>

            <Box sx={{ px: 3, pt: 2 }}>
                <Stepper activeStep={activeStep}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>

            <DialogContent dividers sx={{ minHeight: 400 }}>
                {/* STEP 1: PARÂMETROS */}
                {activeStep === 0 && (
                    <Box>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Preencha os parâmetros do serviço realizado.
                        </Alert>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <SimpleParametersEditor
                                ref={paramsEditorRef}
                                document={document}
                                metaData={documentParams}
                            />
                        )}
                    </Box>
                )}

                {/* STEP 2: NOTA + FOTO */}
                {activeStep === 1 && (
                    <Box>
                        <Alert severity="success" sx={{ mb: 2 }}>
                            ✅ Parâmetros preenchidos! Agora adicione uma nota de conclusão.
                        </Alert>

                        {document && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Pedido: <strong>{document.regnumber}</strong>
                            </Typography>
                        )}

                        <TextField
                            autoFocus
                            margin="dense"
                            label="Nota da conclusão da tarefa (obrigatório)"
                            fullWidth
                            multiline
                            rows={6}
                            variant="outlined"
                            value={completionNote}
                            onChange={(e) => setCompletionNote(e.target.value)}
                            required
                            error={!isNoteValid}
                            helperText={!isNoteValid ? "A nota é obrigatória" : `${completionNote.length} caracteres`}
                            placeholder="Descreva o trabalho realizado, observações importantes, etc."
                        />

                        <Box sx={{ mt: 3 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Anexo - Foto ou Documento (opcional)
                            </Typography>
                            <Button
                                variant="outlined"
                                component="label"
                                startIcon={<AttachFile />}
                                fullWidth
                                sx={{ py: 1.5 }}
                            >
                                {selectedFile ? `📎 ${selectedFile.name}` : 'Escolher ficheiro'}
                                <Input
                                    type="file"
                                    onChange={handleFileChange}
                                    sx={{ display: 'none' }}
                                    inputProps={{
                                        accept: 'image/*,.pdf,.doc,.docx'
                                    }}
                                />
                            </Button>
                            {selectedFile && (
                                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" color="primary">
                                        ✓ Ficheiro selecionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                                    </Typography>
                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={() => setSelectedFile(null)}
                                    >
                                        Remover
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button onClick={handleClose} disabled={loading}>
                    Cancelar
                </Button>

                <Box sx={{ flex: '1 1 auto' }} />

                {activeStep > 0 && (
                    <Button
                        onClick={handleBack}
                        disabled={loading}
                        startIcon={<NavigateBefore />}
                    >
                        Voltar
                    </Button>
                )}

                {!isLastStep ? (
                    <Button
                        variant="contained"
                        onClick={handleNext}
                        disabled={loading || !documentParams}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                        endIcon={!loading ? <NavigateNext /> : null}
                    >
                        {loading ? 'A guardar parâmetros...' : 'Guardar e Avançar'}
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleFinalSubmit}
                        disabled={loading || !isNoteValid}
                        startIcon={loading ? <CircularProgress size={20} /> : <Send />}
                        size="large"
                        sx={{ px: 4 }}
                    >
                        {loading ? 'A processar...' : 'Concluir e Encaminhar'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default CompletionWizardModal;
