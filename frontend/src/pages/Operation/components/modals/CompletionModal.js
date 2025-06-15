// frontend/src/pages/Operation/components/modals/CompletionModal.js
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Button, IconButton, Alert, Input
} from '@mui/material';
import { Close, AttachFile } from '@mui/icons-material';
import ValidatedTextField from '../forms/ValidatedTextField';

const CompletionModal = ({
    open,
    onClose,
    note = '', // <- DEFAULT
    onNoteChange,
    onConfirm,
    loading = false,
    document
}) => {
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleConfirm = () => {
        onConfirm(selectedFile);
    };

    // Safe check
    const noteValue = note || '';
    const isNoteValid = noteValue.trim().length >= 10;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">Finalizar Tarefa</Typography>
                    <IconButton onClick={onClose}>
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Esta ação irá criar um passo no workflow.
                </Alert>

                {document && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Pedido: {document.regnumber}
                    </Typography>
                )}

                <ValidatedTextField
                    autoFocus
                    margin="dense"
                    label="Nota da conclusão (obrigatório)"
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    value={noteValue}
                    onChange={(e, sanitizedValue) => onNoteChange?.(sanitizedValue || e.target.value)}
                    validation="note"
                    required
                />

                <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Anexo (opcional)
                    </Typography>
                    <Input
                        type="file"
                        onChange={handleFileChange}
                        startAdornment={<AttachFile />}
                        fullWidth
                    />
                    {selectedFile && (
                        <Typography variant="caption" color="primary">
                            {selectedFile.name}
                        </Typography>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    color="success"
                    disabled={!isNoteValid || loading}
                    sx={{ px: 4, py: 1 }}
                >
                    {loading ? 'A processar...' : 'Finalizar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CompletionModal;