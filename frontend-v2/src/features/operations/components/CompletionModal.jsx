import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Stack
} from '@mui/material';
import FileUploadControl from './FileUploadControl';

const CompletionModal = ({
    open,
    onClose,
    onConfirm,
    loading
}) => {
    const [note, setNote] = useState('');
    const [files, setFiles] = useState([]);

    const handleConfirm = () => {
        onConfirm({ note, files });
    };

    const handleClose = () => {
        setNote('');
        setFiles([]);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Concluir Tarefa</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3}>
                    <Typography variant="body2" color="text.secondary">
                        Indique as observações e anexe fotos se necessário para concluir a tarefa.
                    </Typography>

                    <TextField
                        label="Observações"
                        multiline
                        rows={4}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        fullWidth
                        placeholder="Descreva o trabalho realizado..."
                    />

                    <FileUploadControl
                        files={files}
                        setFiles={setFiles}
                        maxFiles={3}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancelar</Button>
                <Button 
                    onClick={handleConfirm} 
                    variant="contained" 
                    color="success"
                    disabled={loading || !note.trim()}
                >
                    {loading ? 'A guardar...' : 'Confirmar Conclusão'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CompletionModal;
