import React, { useState, useEffect } from "react";
import {
    Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Grid, CircularProgress, Typography, Divider,
} from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

const EMPTY = {
    tt_equipamento_aloc: "",
    data: new Date().toISOString().split("T")[0],
    memo: "",
};

export default function ReallocarEquipamentoDialog({ open, onClose, onSubmit, equipamento, meta }) {
    const { alocTipos = [] } = meta || {};
    const destinos = alocTipos.filter(t => t.value !== "Instalação");
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) setForm({ ...EMPTY, data: new Date().toISOString().split("T")[0] });
    }, [open]);

    const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
    const isValid = form.tt_equipamento_aloc && form.data;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({
                equipamentoPk: equipamento.pk,
                data: {
                    tt_equipamento_aloc: Number(form.tt_equipamento_aloc),
                    data: form.data,
                    memo: form.memo || undefined,
                },
            });
            onClose();
        } catch {
            // error handled by parent
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <SwapHorizIcon fontSize="small" color="warning" />
                Realocar Equipamento
            </DialogTitle>
            {equipamento && (
                <Box sx={{ px: 3, pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        {equipamento.marca} {equipamento.modelo}
                        {equipamento.serial ? ` • S/N: ${equipamento.serial}` : ""}
                    </Typography>
                </Box>
            )}
            <Divider />
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid size={12}>
                            <TextField select fullWidth size="small" label="Destino *"
                                value={form.tt_equipamento_aloc}
                                onChange={e => set("tt_equipamento_aloc", e.target.value)}>
                                {destinos.map(t => (
                                    <MenuItem key={t.pk} value={t.pk}>{t.value}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" type="date" label="Data de Saída *"
                                value={form.data}
                                onChange={e => set("data", e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Motivo / Observações"
                                value={form.memo}
                                onChange={e => set("memo", e.target.value)}
                                multiline rows={2} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button type="submit" variant="contained" color="warning"
                        disabled={loading || !isValid}
                        startIcon={loading ? <CircularProgress size={16} /> : <SwapHorizIcon />}>
                        Realocar
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
