import React, { useState, useEffect, useCallback } from "react";
import {
    Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, IconButton, Tooltip, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Grid, CircularProgress, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
    getEquipamentoRepairs, createEquipamentoRepair,
    updateEquipamentoRepair, deleteEquipamentoRepair,
} from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";

const formatCurrency = (val) => val != null ? `${parseFloat(val).toFixed(2)} €` : "—";

function RepairForm({ open, onClose, onSubmit, repair }) {
    const [form, setForm] = useState({ data: new Date().toISOString().split("T")[0], valor: "", memo: "" });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (repair) {
            setForm({ data: repair.data?.split("T")[0] ?? "", valor: repair.valor ?? "", memo: repair.memo ?? "" });
        } else {
            setForm({ data: new Date().toISOString().split("T")[0], valor: "", memo: "" });
        }
    }, [open, repair]);

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));
    const isValid = form.data && form.memo?.trim();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({ data: form.data, valor: form.valor ? parseFloat(form.valor) : null, memo: form.memo });
            onClose();
        } finally { setLoading(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{repair ? "Editar Manutenção" : "Registar Manutenção"}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" type="date" label="Data *"
                                value={form.data} onChange={e => set("data", e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" type="number" label="Custo (€)"
                                value={form.valor} onChange={e => set("valor", e.target.value)}
                                inputProps={{ min: 0, step: 0.01 }} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth size="small" label="Descrição *" multiline rows={3}
                                value={form.memo} onChange={e => set("memo", e.target.value)} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={loading || !isValid}
                        startIcon={loading ? <CircularProgress size={16} /> : null}>
                        {repair ? "Guardar" : "Registar"}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function EquipManutencaoTab({ equipamento }) {
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const load = useCallback(async () => {
        if (!equipamento?.pk) return;
        setLoading(true);
        try {
            const data = await getEquipamentoRepairs(equipamento.pk);
            setRepairs(data?.repairs || []);
        } catch { notifyError("Erro ao carregar manutenções"); }
        finally { setLoading(false); }
    }, [equipamento?.pk]);

    useEffect(() => { load(); }, [load]);

    const handleSubmit = async (data) => {
        try {
            if (editing) {
                await updateEquipamentoRepair(equipamento.pk, editing.pk, data);
                notifySuccess("Manutenção atualizada");
            } else {
                await createEquipamentoRepair(equipamento.pk, data);
                notifySuccess("Manutenção registada");
            }
            setEditing(null);
            load();
        } catch (err) {
            notifyError(err?.response?.data?.message || "Erro ao guardar manutenção");
            throw err;
        }
    };

    const handleDelete = async (pk) => {
        if (!window.confirm("Eliminar este registo de manutenção?")) return;
        try {
            await deleteEquipamentoRepair(equipamento.pk, pk);
            notifySuccess("Manutenção eliminada");
            load();
        } catch { notifyError("Erro ao eliminar manutenção"); }
    };

    const total = repairs.reduce((sum, r) => sum + (r.valor ? parseFloat(r.valor) : 0), 0);

    return (
        <Box>
            <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {repairs.length > 0 && (
                    <Chip label={`Total: ${total.toFixed(2)} €`} color="primary" variant="outlined" size="small" />
                )}
                <Button size="small" variant="outlined" startIcon={<AddIcon />} sx={{ ml: "auto" }}
                    onClick={() => { setEditing(null); setFormOpen(true); }}>
                    Registar Manutenção
                </Button>
            </Box>

            {loading ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>A carregar...</Typography>
            ) : repairs.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>Sem manutenções registadas</Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><b>Data</b></TableCell>
                                <TableCell><b>Custo</b></TableCell>
                                <TableCell><b>Descrição</b></TableCell>
                                <TableCell align="right"><b>Ações</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {repairs.map(r => (
                                <TableRow key={r.pk}>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>{r.data?.split("T")[0] || "—"}</TableCell>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatCurrency(r.valor)}</TableCell>
                                    <TableCell>{r.memo}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Editar">
                                            <IconButton size="small" onClick={() => { setEditing(r); setFormOpen(true); }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Eliminar">
                                            <IconButton size="small" color="error" onClick={() => handleDelete(r.pk)}>
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

            <RepairForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }}
                onSubmit={handleSubmit} repair={editing} />
        </Box>
    );
}
