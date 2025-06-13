import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Alert, CircularProgress, Button, IconButton
} from '@mui/material';
import { Close } from '@mui/icons-material';
import SimpleParametersEditor from './SimpleParametersEditor';
import { getDocumentTypeParams } from '../../../../services/documentService';

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
        </Dialog>
    );
};

export default ParametersModal;