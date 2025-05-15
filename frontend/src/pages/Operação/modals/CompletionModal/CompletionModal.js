import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, TextField, Button, IconButton
} from '@mui/material';
import { Close } from '@mui/icons-material';

const CompletionModal = ({ open, onClose, note, onNoteChange, onConfirm }) => {
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
                    <Typography variant="h6">Concluir Serviço</Typography>
                    <IconButton onClick={onClose}>
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Observações finais (opcional)"
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color="success"
                    sx={{ px: 4, py: 1 }}
                >
                    Confirmar Conclusão
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CompletionModal;