import React, { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid } from "@mui/material";

const EditDeliveryDialog = ({ open, onClose, delivery, onSave }) => {
    const [editData, setEditData] = useState({
        pndata: delivery?.data || "",
        pnquantity: delivery?.quantity || 1,
        pndim: delivery?.dim || "",
        pnmemo: delivery?.memo || "",
    });

    useEffect(() => {
        if (delivery) {
            setEditData({
                pndata: delivery.data || "",
                pnquantity: delivery.quantity || 1,
                pndim: delivery.dim || "",
                pnmemo: delivery.memo || "",
            });
        }
    }, [delivery]);

    const handleSave = async () => {
        try {
            await onSave(editData);
            onClose();
        } catch (error) {
            console.error("Erro ao salvar:", error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Editar Entrega</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="date"
                            label="Data"
                            value={editData.pndata.split("T")[0]}
                            onChange={(e) =>
                                setEditData((prev) => ({
                                    ...prev,
                                    pndata: e.target.value,
                                }))
                            }
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Quantidade"
                            value={editData.pnquantity}
                            onChange={(e) =>
                                setEditData((prev) => ({
                                    ...prev,
                                    pnquantity: e.target.value,
                                }))
                            }
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Tamanho"
                            value={editData.pndim}
                            onChange={(e) =>
                                setEditData((prev) => ({
                                    ...prev,
                                    pndim: e.target.value,
                                }))
                            }
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Observações"
                            value={editData.pnmemo}
                            onChange={(e) =>
                                setEditData((prev) => ({
                                    ...prev,
                                    pnmemo: e.target.value,
                                }))
                            }
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave} variant="contained">
                    Salvar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditDeliveryDialog;
