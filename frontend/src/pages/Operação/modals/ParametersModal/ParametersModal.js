import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Alert, CircularProgress, Button, IconButton
} from '@mui/material';
import { Close, Send as SendIcon } from '@mui/icons-material';
import SimpleParametersEditor from './SimpleParametersEditor';
import { getDocumentTypeParams, addDocumentStep } from '../../../../services/documentService';
import { getValidTransitions } from '../../../ModernDocuments/utils/workflowUtils';
import { notifySuccess, notifyError } from '../../../../components/common/Toaster/ThemedToaster';

// Constante para identificar a transição de "conclusão"
const CONCLUSION_TRANSITION_TYPE = 'CONCLUSION';
const ParametersModal = ({ open, onClose, document, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [metaData, setMetaData] = useState(null);

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
            setMetaData(response);
        } catch (error) {
            console.error("Erro ao buscar metadados:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleConcludeAndForward = async () => {
        if (!document || !metaData) return;

        setLoading(true);
        try {
            // 1. Encontrar a transição de conclusão válida para o estado atual
            const validTransitions = getValidTransitions(document, metaData);
            const conclusionTransition = validTransitions.find(
                t => t.transition_type === CONCLUSION_TRANSITION_TYPE
            );

            if (!conclusionTransition) {
                throw new Error("Não foi encontrada uma transição de 'conclusão' válida para este estado no workflow.");
            }

            // 2. Preparar os dados para o novo passo
            // Assumimos que a transição define um único destinatário (client)
            const nextStepData = {
                what: conclusionTransition.to_step_pk,
                who: Array.isArray(conclusionTransition.client) ? conclusionTransition.client[0] : conclusionTransition.client,
                memo: 'Tarefa concluída e encaminhada automaticamente pelo sistema.',
                tb_document: document.pk,
            };

            // Validação para garantir que temos um destinatário
            if (nextStepData.who === null || nextStepData.who === undefined) {
                 throw new Error("O workflow não define um destinatário para a conclusão desta tarefa.");
            }

            // 3. Chamar o serviço para adicionar o passo
            await addDocumentStep(document.pk, nextStepData);

            notifySuccess('Tarefa concluída e encaminhada com sucesso!');
            onSave(true); // Chama o onSave para notificar o componente pai e fechar/atualizar

        } catch (error) {
            console.error("Erro ao concluir e encaminhar:", error);
            notifyError(error.message || "Ocorreu um erro ao tentar concluir a tarefa.");
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
                    Preencha todos os parâmetros necessários para concluir o serviço.
                </Alert>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <SimpleParametersEditor
                        document={document}
                        metaData={metaData}
                        onSave={onSave}
                    />
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleConcludeAndForward}
                    disabled={loading || !metaData}
                    startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                >
                    {loading ? 'A processar...' : 'Concluir e Encaminhar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ParametersModal;