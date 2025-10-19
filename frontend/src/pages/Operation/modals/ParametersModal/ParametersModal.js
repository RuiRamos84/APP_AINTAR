import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Alert, CircularProgress, Button, IconButton
} from '@mui/material';
import { Close, Send as SendIcon } from '@mui/icons-material';
import SimpleParametersEditor from './SimpleParametersEditor';
import { getDocumentTypeParams, addDocumentStep } from '../../../../services/documentService';
import { getCompletionStep } from '../../../Operation/utils/workflowHelpers';
import { notifySuccess, notifyError } from '../../../../components/common/Toaster/ThemedToaster';
import { useMetaData } from '../../../../contexts/MetaDataContext';

const ParametersModal = ({ open, onClose, document, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [documentParams, setDocumentParams] = useState(null);
    const { metaData: globalMetaData } = useMetaData(); // MetaData global com step_transitions
    const paramsEditorRef = useRef(null); // Ref para aceder às funções do SimpleParametersEditor

    useEffect(() => {
        if (open && document) {
            fetchMetaData();
        }
    }, [open, document]);

    const fetchMetaData = async () => {
        if (!document?.pk) return;

        setLoading(true);
        try {
            const response = await getDocumentTypeParams(document.pk);
            setDocumentParams(response); // Guardar apenas os params do documento
        } catch (error) {
            console.error("Erro ao buscar parâmetros:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAndComplete = async () => {
        if (!document || !globalMetaData) {
            notifyError('Metadados não carregados. Por favor, tente novamente.');
            return;
        }

        if (!paramsEditorRef.current) {
            notifyError('Editor de parâmetros não disponível.');
            return;
        }

        setLoading(true);
        try {
            // 1️⃣ GUARDAR PARÂMETROS PRIMEIRO
            console.log('💾 Passo 1: A guardar parâmetros...');
            await paramsEditorRef.current.saveParams();

            // 2️⃣ DETERMINAR PRÓXIMO STEP
            console.log('🎯 Passo 2: A determinar próximo step...');
            const nextStep = getCompletionStep(document, globalMetaData);

            if (!nextStep || !nextStep.what || !nextStep.who) {
                throw new Error("Não foi encontrada uma transição válida no workflow para este estado.");
            }

            // 3️⃣ CONCLUIR E ENCAMINHAR
            console.log('📤 Passo 3: A concluir e encaminhar...');
            const nextStepData = {
                what: nextStep.what,
                who: nextStep.who,
                memo: 'Tarefa concluída com parâmetros registados.',
                tb_document: document.pk,
            };

            await addDocumentStep(document.pk, nextStepData);

            // ✅ SUCESSO COMPLETO
            notifySuccess('✅ Parâmetros guardados e tarefa concluída com sucesso!');
            onSave(true); // Notificar componente pai e fechar

        } catch (error) {
            console.error("❌ Erro ao processar:", error);
            // Não mostrar notificação aqui pois já foi mostrada no handleSave ou será genérica
            if (!error.response?.data?.erro) {
                notifyError(error.message || "Ocorreu um erro ao processar a tarefa.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    
                    <Typography variant="h6">Parâmetros do Serviço - {document?.regnumber}</Typography>
                    <IconButton onClick={onClose}>
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Preencha os parâmetros e clique em "Concluir e Encaminhar" para guardar tudo e finalizar a tarefa.
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
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    color="success"
                    onClick={handleSaveAndComplete}
                    disabled={loading || !globalMetaData || !documentParams}
                    startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                    size="large"
                >
                    {loading ? 'A processar...' : 'Concluir e Encaminhar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ParametersModal;