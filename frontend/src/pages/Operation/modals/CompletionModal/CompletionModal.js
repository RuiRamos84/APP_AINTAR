import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, TextField, Button, IconButton,
    Alert, Input
} from '@mui/material';
import { Close, AttachFile } from '@mui/icons-material';

const CompletionModal = ({
    open,
    onClose,
    note,
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

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{ sx: { borderRadius: 2 } }}
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
                    Esta acção irá:
                    • Actualizar os parâmetros do serviço
                    • Adicionar um passo para a próxima fase
                    • Enviar o pedido para o próximo responsável
                </Alert>

                {document && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Pedido: {document.regnumber}
                    </Typography>
                )}

                <TextField
                    autoFocus
                    margin="dense"
                    label="Nota da conclusão da tarefa (obrigatório)"
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    required
                    error={!note.trim()}
                    helperText={!note.trim() ? "A nota é obrigatória" : ""}
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
                    disabled={!note.trim() || loading}
                    sx={{ px: 4, py: 1 }}
                >
                    {loading ? 'A processar...' : 'Finalizar Tarefa'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CompletionModal;