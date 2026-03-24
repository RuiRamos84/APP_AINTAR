import React, { useState, useEffect, useCallback } from "react";
import {
    Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Grid, CircularProgress, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
    getEquipamentoSpecs, createEquipamentoSpec,
    updateEquipamentoSpec, deleteEquipamentoSpec,
} from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";

function SpecForm({ open, onClose, onSubmit, spec, specTipos = [] }) {
    const [form, setForm] = useState({ tt_equipamento_spec: "", valor: "" });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (spec) {
            setForm({
                tt_equipamento_spec: specTipos.find(t => t.value === spec["tt_equipamento$spec"])?.pk ?? "",
                valor: spec.valor ?? "",
            });
        } else {
            setForm({ tt_equipamento_spec: "", valor: "" });
        }
    }, [open, spec]);

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));
    const isValid = form.tt_equipamento_spec && form.valor?.trim();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({ tt_equipamento_spec: Number(form.tt_equipamento_spec), valor: form.valor });
            onClose();
        } finally { setLoading(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{spec ? "Editar Especificação" : "Nova Especificação"}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12}>
                            <TextField select fullWidth size="small" label="Parâmetro *"
                                value={form.tt_equipamento_spec} onChange={e => set("tt_equipamento_spec", e.target.value)}>
                                {specTipos.map(t => <MenuItem key={t.pk} value={t.pk}>{t.value}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth size="small" label="Valor *"
                                value={form.valor} onChange={e => set("valor", e.target.value)} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={loading || !isValid}
                        startIcon={loading ? <CircularProgress size={16} /> : null}>
                        {spec ? "Guardar" : "Adicionar"}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function EquipEspecificacoesTab({ equipamento, meta }) {
    const [specs, setSpecs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const load = useCallback(async () => {
        if (!equipamento?.pk) return;
        setLoading(true);
        try {
            const data = await getEquipamentoSpecs(equipamento.pk);
            setSpecs(data?.specs || []);
        } catch { notifyError("Erro ao carregar especificações"); }
        finally { setLoading(false); }
    }, [equipamento?.pk]);

    useEffect(() => { load(); }, [load]);

    const handleSubmit = async (data) => {
        try {
            if (editing) {
                await updateEquipamentoSpec(equipamento.pk, editing.pk, data);
                notifySuccess("Especificação atualizada");
            } else {
                await createEquipamentoSpec(equipamento.pk, data);
                notifySuccess("Especificação adicionada");
            }
            setEditing(null);
            load();
        } catch (err) {
            notifyError(err?.response?.data?.message || "Erro ao guardar especificação");
            throw err;
        }
    };

    const handleDelete = async (pk) => {
        if (!window.confirm("Eliminar esta especificação?")) return;
        try {
            await deleteEquipamentoSpec(equipamento.pk, pk);
            notifySuccess("Especificação eliminada");
            load();
        } catch { notifyError("Erro ao eliminar especificação"); }
    };

    return (
        <Box>
            <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
                <Button size="small" variant="outlined" startIcon={<AddIcon />}
                    onClick={() => { setEditing(null); setFormOpen(true); }}>
                    Nova Especificação
                </Button>
            </Box>

            {loading ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>A carregar...</Typography>
            ) : specs.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>Sem especificações registadas</Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><b>Parâmetro</b></TableCell>
                                <TableCell><b>Valor</b></TableCell>
                                <TableCell align="right"><b>Ações</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {specs.map(s => (
                                <TableRow key={s.pk}>
                                    <TableCell>{s["tt_equipamento$spec"] || "—"}</TableCell>
                                    <TableCell>{s.valor}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Editar">
                                            <IconButton size="small" onClick={() => { setEditing(s); setFormOpen(true); }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Eliminar">
                                            <IconButton size="small" color="error" onClick={() => handleDelete(s.pk)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <SpecForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }}
                onSubmit={handleSubmit} spec={editing} specTipos={meta?.specs ?? []} />
        </Box>
    );
}
