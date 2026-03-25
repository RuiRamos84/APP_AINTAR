import React, { useState, useEffect } from "react";
import {
    Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Grid, CircularProgress, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import BuildIcon from "@mui/icons-material/Build";

const EMPTY = {
    equipamentoPk: "",
    tt_equipamento_localizacao: "",
    start_date: new Date().toISOString().split("T")[0],
    memo: "",
};

export default function AlocarEquipamentoDialog({ open, onClose, onSubmit, instalacaoPk, meta, allEquipamentos }) {
    const { localizacoes = [], alocInstalacaoPk = 1 } = meta || {};
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) setForm({ ...EMPTY, start_date: new Date().toISOString().split("T")[0] });
    }, [open]);

    const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
    const isValid = form.equipamentoPk && form.tt_equipamento_localizacao && form.start_date;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({
                equipamentoPk: form.equipamentoPk,
                data: {
                    tt_equipamento_aloc: alocInstalacaoPk,
                    tb_instalacao: instalacaoPk,
                    tt_equipamento_localizacao: Number(form.tt_equipamento_localizacao),
                    start_date: form.start_date,
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
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BuildIcon fontSize="small" color="primary" />
                Alocar Equipamento
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid size={12}>
                            <TextField select fullWidth size="small" label="Equipamento *"
                                value={form.equipamentoPk}
                                onChange={e => set("equipamentoPk", e.target.value)}>
                                {allEquipamentos.map(eq => (
                                    <MenuItem key={eq.pk} value={eq.pk}>
                                        <Box>
                                            <Typography variant="body2">{eq.marca} {eq.modelo}</Typography>
                                            {eq.serial && (
                                                <Typography variant="caption" color="text.secondary">
                                                    S/N: {eq.serial}
                                                </Typography>
                                            )}
                                            {eq.estado && (
                                                <Typography variant="caption" color="warning.main" sx={{ ml: 1 }}>
                                                    • {eq.estado}
                                                </Typography>
                                            )}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={12}>
                            <TextField select fullWidth size="small" label="Localização na Instalação *"
                                value={form.tt_equipamento_localizacao}
                                onChange={e => set("tt_equipamento_localizacao", e.target.value)}>
                                {localizacoes.map(l => (
                                    <MenuItem key={l.pk} value={l.pk}>{l.value}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth size="small" type="date" label="Data de Entrada *"
                                value={form.start_date}
                                onChange={e => set("start_date", e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Observações"
                                value={form.memo}
                                onChange={e => set("memo", e.target.value)}
                                multiline rows={2} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={loading || !isValid}
                        startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}>
                        Alocar
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
