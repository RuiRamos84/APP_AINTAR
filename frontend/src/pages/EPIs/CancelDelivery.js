import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography } from "@mui/material";
import { getCurrentDate } from "./dataUtils";

const ReturnDeliveryDialog = ({ open, onClose, delivery, onConfirm }) => {
    const [memo, setMemo] = useState("");

    const handleConfirm = async () => {
        try {
            await onConfirm({
                pndata: getCurrentDate(),
                pnmemo: memo,
            });
            onClose();
        } catch (error) {
            console.error("Erro ao anular:", error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Anular Entrega</DialogTitle>
            <DialogContent>
                <Typography gutterBottom>
                    Tem certeza que deseja anular esta entrega?
                </Typography>
                <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Motivo da Anulação"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    sx={{ mt: 2 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleConfirm} variant="contained" color="error">
                    Anular
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ReturnDeliveryDialog;
